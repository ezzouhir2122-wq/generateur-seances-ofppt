import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { buildEvaluationPrompt } from "@/lib/prompts";
import { prisma } from "@/lib/db";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";

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
  } catch {
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

  const prompt = buildEvaluationPrompt(data);
  let contenu = "";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    contenu = block.type === "text" ? block.text : "";
  } catch {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
