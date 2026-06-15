import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateWithClaude } from "@/lib/claude";
import { generateWithOpenAI } from "@/lib/openai";
import { generateWithGoogle } from "@/lib/google";
import { generateWithOpenRouter } from "@/lib/openrouter";
import { prisma } from "@/lib/db";
import { SeanceParams } from "../../../../equipment/generate-seance";

export async function POST(req: NextRequest) {
  const session = await auth();
  const params: SeanceParams = await req.json();

  if (!params.filiere || !params.module) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // Charger les paramètres API de l'utilisateur
  let userClaudeKey: string | null = null;
  let userOpenaiKey: string | null = null;
  let userGoogleKey: string | null = null;
  let userOpenrouterKey: string | null = null;
  let preferredModel = "claude-opus-4-8";

  if (session?.user?.id) {
    try {
      const userSettings = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { claudeApiKey: true, openaiApiKey: true, googleApiKey: true, openrouterApiKey: true, preferredModel: true },
      });
      if (userSettings?.claudeApiKey) userClaudeKey = userSettings.claudeApiKey;
      if (userSettings?.openaiApiKey) userOpenaiKey = userSettings.openaiApiKey;
      if (userSettings?.googleApiKey) userGoogleKey = userSettings.googleApiKey;
      if (userSettings?.openrouterApiKey) userOpenrouterKey = userSettings.openrouterApiKey;
      if (userSettings?.preferredModel) preferredModel = userSettings.preferredModel;
    } catch {}
  }

  let contenu: string;
  let source = "claude";

  if (preferredModel.startsWith("gemini")) {
    try {
      contenu = await generateWithGoogle(params, { apiKey: userGoogleKey ?? undefined, model: preferredModel });
      source = "google";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Google AI";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } else if (preferredModel.startsWith("openrouter/") || preferredModel.includes("/")) {
    try {
      contenu = await generateWithOpenRouter(params, { apiKey: userOpenrouterKey ?? undefined, model: preferredModel });
      source = "openrouter";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur OpenRouter";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } else if (preferredModel.startsWith("gpt-") || preferredModel.startsWith("o1") || preferredModel.startsWith("o3")) {
    try {
      contenu = await generateWithOpenAI(params, { apiKey: userOpenaiKey ?? undefined, model: preferredModel });
      source = "openai";
    } catch {
      try {
        contenu = await generateWithClaude(params, { apiKey: userClaudeKey ?? undefined });
        source = "claude";
      } catch {
        return NextResponse.json({ error: "Échec de la génération IA" }, { status: 500 });
      }
    }
  } else {
    try {
      contenu = await generateWithClaude(params, { apiKey: userClaudeKey ?? undefined, model: preferredModel });
    } catch {
      try {
        contenu = await generateWithOpenAI(params, { apiKey: userOpenaiKey ?? undefined });
        source = "openai";
      } catch {
        return NextResponse.json({ error: "Échec de la génération IA" }, { status: 500 });
      }
    }
  }

  // Sauvegarder si formateur connecté
  let seanceId: string | undefined;
  if (session?.user?.id) {
    try {
      const anneeLabels: Record<string, string> = {
        "1ere-annee": "1ère Année",
        "2eme-annee": "2ème Année",
        "3eme-annee": "3ème Année",
      };
      const niveauLabel = params.niveau === "TS" ? "Technicien Spécialisé" : params.niveau === "T" ? "Technicien" : params.niveau;
      const anneeLabel = anneeLabels[params.annee ?? ""] ?? "";
      const niveauDb = anneeLabel ? `${niveauLabel} - ${anneeLabel}` : niveauLabel;

      const saved = await prisma.seance.create({
        data: {
          title: `${params.filiere} — ${params.module}`,
          filiere: params.filiere,
          module: params.module,
          duree: params.duree,
          niveau: niveauDb,
          type: params.type,
          objectifs: params.objectifs ?? params.competence ?? "",
          contenu,
          userId: session.user.id,
        },
      });
      seanceId = saved.id;
    } catch {
      // DB non configurée — on retourne quand même la séance générée
    }
  }

  return NextResponse.json({ contenu, source, seanceId });
}
