import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUserAiKeys, missingKeyError } from "@/lib/user-ai-key";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { buildFichePrompt } from "@/lib/prompts";
import type { FicheFormData } from "@/types/seance";

// Ces routes appellent Claude sans streaming : la reponse complete doit tenir
// dans la duree de la fonction. Sans maxDuration explicite, Vercel appliquait
// son defaut (quelques secondes) et tuait la fonction AVANT le prisma.create
// — la generation semblait marcher puis disparaissait de l'historique.
export const maxDuration = 300;


export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const data: FicheFormData & { seanceSourceId?: string } = await req.json();

  if (!data.filiere || !data.module || !data.intitule) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
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

  const prompt = buildFichePrompt(data);
  let contenu = "";

  try {
    if (!keys.claude) throw new Error("no-claude-key");
    const anthropic = new Anthropic({ apiKey: keys.claude });
    const msg = await anthropic.messages.create({
      model: claudeModel,
      max_tokens: 4096,
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
        max_tokens: 4096,
      });
      contenu = completion.choices[0].message.content ?? "";
    } catch {
      return NextResponse.json({ error: "Les deux services IA sont indisponibles" }, { status: 503 });
    }
  }

  const anneeLabels: Record<string, string> = {
    "1ere-annee": "1ère Année",
    "2eme-annee": "2ème Année",
    "3eme-annee": "3ème Année",
  };
  const niveauLabel = data.niveau === "TS" ? "Technicien Spécialisé" : data.niveau === "T" ? "Technicien" : data.niveau;
  const anneeLabel = anneeLabels[data.annee ?? ""] ?? "";
  const niveauDb = anneeLabel ? `${niveauLabel} - ${anneeLabel}` : niveauLabel;

  const fiche = await prisma.fiche.create({
    data: {
      titre: `${data.module} — ${data.intitule}`,
      filiere: data.filiere,
      module: data.module,
      formateur: data.formateur,
      duree: data.duree,
      niveau: niveauDb,
      type: data.type,
      objectifsSavoir: data.objectifsSavoir ?? "",
      objectifsSavoirFaire: data.objectifsSavoirFaire ?? "",
      objectifsSavoirEtre: data.objectifsSavoirEtre ?? "",
      prerequis: data.prerequis,
      contenu,
      userId: session.user.id,
      seanceSourceId: data.seanceSourceId ?? null,
    },
  });

  return NextResponse.json({ id: fiche.id, contenu });
}
