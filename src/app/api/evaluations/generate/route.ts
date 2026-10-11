import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { buildEvaluationPrompt } from "@/lib/prompts";
import { prisma } from "@/lib/db";
import { getUserAiKeys, missingKeyError } from "@/lib/user-ai-key";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";

// Ces routes appellent Claude sans streaming : la reponse complete doit tenir
// dans la duree de la fonction. Sans maxDuration explicite, Vercel appliquait
// son defaut (quelques secondes) et tuait la fonction AVANT le prisma.create
// — la generation semblait marcher puis disparaissait de l'historique.
export const maxDuration = 300;


const TYPE_LABELS: Record<EvaluationType, string> = {
  cc: "Contrôle Continu (CC)",
  efm: "Examen de Fin de Module (EFM)",
  qcm: "QCM",
  exercices: "Exercices pratiques",
  controle: "Contrôle continu",
  examen: "Examen fin de module",
  rattrapage: "Session de rattrapage",
};

async function saveEvaluation(data: EvaluationFormData, contenu: string, userId: string): Promise<string | undefined> {
  try {
    const anneeLabels: Record<string, string> = {
      "1ere-annee": "1ère Année",
      "2eme-annee": "2ème Année",
      "3eme-annee": "3ème Année",
    };
    const niveauLabel = data.niveau === "TS" ? "Technicien Spécialisé" : data.niveau === "T" ? "Technicien" : (data.niveau ?? "");
    const anneeLabel = anneeLabels[data.annee ?? ""] ?? "";
    const niveauDb = anneeLabel ? `${niveauLabel} - ${anneeLabel}` : niveauLabel;
    const label = TYPE_LABELS[data.type] ?? data.type;
    const saved = await prisma.evaluation.create({
      data: {
        titre: `${label} — ${data.filiere} — ${data.module}`,
        filiere: data.filiere,
        module: data.module,
        niveau: niveauDb,
        type: data.type,
        theme: data.theme ?? data.themesCouverts ?? null,
        contenu,
        userId,
      },
    });
    return saved.id;
  } catch (err) {
    console.error("[saveEvaluation] echec de l'enregistrement", { userId, err });
    return undefined;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const data: EvaluationFormData = await req.json();

  if (!data.filiere || !data.module || !data.type) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // Clés du formateur connecté — aucun repli sur la clé serveur.
  const keys = await getUserAiKeys(session.user.id);
  if (!keys.claude && !keys.openai) {
    return NextResponse.json(missingKeyError("claude", "openai"), { status: 400 });
  }

  // Respecte le modele choisi par le formateur. L'ancien code forcait
  // claude-opus-4-8, le plus lent, ce qui garantissait le depassement.
  const claudeModel = keys.preferredModel.startsWith("claude")
    ? keys.preferredModel
    : "claude-sonnet-4-6";

  const prompt = buildEvaluationPrompt(data);
  let contenu = "";

  try {
    if (!keys.claude) throw new Error("no-claude-key");
    const anthropic = new Anthropic({ apiKey: keys.claude });
    const msg = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    contenu = block.type === "text" ? block.text : "";
  } catch {
    try {
      if (!keys.openai) throw new Error("no-openai-key");
      const openai = new OpenAI({ apiKey: keys.openai });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 5000,
      });
      contenu = completion.choices[0].message.content ?? "";
    } catch {
      return NextResponse.json({ error: "Les deux services IA sont indisponibles" }, { status: 503 });
    }
  }

  const evaluationId = await saveEvaluation(data, contenu, session.user.id);

  return NextResponse.json({ contenu, evaluationId });
}
