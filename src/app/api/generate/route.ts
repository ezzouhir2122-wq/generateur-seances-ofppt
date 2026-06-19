import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateWithClaude, streamWithClaude } from "@/lib/claude";
import { generateWithOpenAI } from "@/lib/openai";
import { generateWithGoogle } from "@/lib/google";
import { generateWithGrok } from "@/lib/grok";
import { generateWithOpenRouter } from "@/lib/openrouter";
import { prisma } from "@/lib/db";
import { SeanceParams } from "../../../../equipment/generate-seance";

export const maxDuration = 60;

async function saveSeance(params: SeanceParams, contenu: string, userId: string): Promise<string | undefined> {
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
        userId,
      },
    });
    return saved.id;
  } catch {
    return undefined;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} — délai dépassé. Essayez un modèle plus rapide (Haiku, Flash).`)),
        ms
      )
    ),
  ]);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const params: SeanceParams = await req.json();

  if (!params.filiere || !params.module) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  let userClaudeKey: string | null = null;
  let userOpenaiKey: string | null = null;
  let userGoogleKey: string | null = null;
  let userOpenrouterKey: string | null = null;
  let userGrokKey: string | null = null;
  let preferredModel = "claude-opus-4-8";

  if (session?.user?.id) {
    try {
      const userSettings = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          claudeApiKey: true,
          openaiApiKey: true,
          googleApiKey: true,
          openrouterApiKey: true,
          grokApiKey: true,
          preferredModel: true,
        },
      });
      if (userSettings?.claudeApiKey) userClaudeKey = userSettings.claudeApiKey;
      if (userSettings?.openaiApiKey) userOpenaiKey = userSettings.openaiApiKey;
      if (userSettings?.googleApiKey) userGoogleKey = userSettings.googleApiKey;
      if (userSettings?.openrouterApiKey) userOpenrouterKey = userSettings.openrouterApiKey;
      if (userSettings?.grokApiKey) userGrokKey = userSettings.grokApiKey;
      if (userSettings?.preferredModel) preferredModel = userSettings.preferredModel;
    } catch {}
  }

  const userId = session?.user?.id ?? null;

  // ─── Grok (xAI) ──────────────────────────────────────────────────────────
  if (preferredModel.startsWith("grok-")) {
    try {
      const contenu = await withTimeout(
        generateWithGrok(params, { apiKey: userGrokKey ?? undefined, model: preferredModel }),
        55_000,
        "Grok"
      );
      const seanceId = userId ? await saveSeance(params, contenu, userId) : undefined;
      return NextResponse.json({ contenu, source: "grok", seanceId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Grok";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ─── Gemini ──────────────────────────────────────────────────────────────
  if (preferredModel.startsWith("gemini")) {
    try {
      const contenu = await withTimeout(
        generateWithGoogle(params, { apiKey: userGoogleKey ?? undefined, model: preferredModel }),
        55_000,
        "Google AI"
      );
      const seanceId = userId ? await saveSeance(params, contenu, userId) : undefined;
      return NextResponse.json({ contenu, source: "google", seanceId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Google AI";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ─── OpenRouter ──────────────────────────────────────────────────────────
  if (preferredModel.startsWith("openrouter/") || preferredModel.includes("/")) {
    try {
      const contenu = await withTimeout(
        generateWithOpenRouter(params, { apiKey: userOpenrouterKey ?? undefined, model: preferredModel }),
        55_000,
        "OpenRouter"
      );
      const seanceId = userId ? await saveSeance(params, contenu, userId) : undefined;
      return NextResponse.json({ contenu, source: "openrouter", seanceId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur OpenRouter";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ─── OpenAI ──────────────────────────────────────────────────────────────
  if (preferredModel.startsWith("gpt-") || preferredModel.startsWith("o1") || preferredModel.startsWith("o3")) {
    try {
      const contenu = await withTimeout(
        generateWithOpenAI(params, { apiKey: userOpenaiKey ?? undefined, model: preferredModel }),
        55_000,
        "OpenAI"
      );
      const seanceId = userId ? await saveSeance(params, contenu, userId) : undefined;
      return NextResponse.json({ contenu, source: "openai", seanceId });
    } catch {
      try {
        const contenu = await withTimeout(
          generateWithClaude(params, { apiKey: userClaudeKey ?? undefined }),
          55_000,
          "Claude (fallback)"
        );
        const seanceId = userId ? await saveSeance(params, contenu, userId) : undefined;
        return NextResponse.json({ contenu, source: "claude", seanceId });
      } catch {
        return NextResponse.json({ error: "Échec de la génération IA" }, { status: 500 });
      }
    }
  }

  // ─── Claude — streaming ──────────────────────────────────────────────────
  const claudeKey = userClaudeKey || process.env.ANTHROPIC_API_KEY;
  if (!claudeKey) {
    return NextResponse.json(
      { error: "Clé Claude manquante — configurez votre clé API dans les paramètres ⚙" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let contentSent = false;
      try {
        let fullContent = "";
        for await (const chunk of streamWithClaude(params, { apiKey: claudeKey, model: preferredModel })) {
          if (chunk) {
            contentSent = true;
            fullContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }
        const seanceId = userId ? await saveSeance(params, fullContent, userId) : undefined;
        controller.enqueue(
          encoder.encode(`\n[[META]]${JSON.stringify({ source: "claude", seanceId })}`)
        );
      } catch (err) {
        if (!contentSent) {
          const msg = err instanceof Error ? err.message : "Erreur Claude";
          controller.enqueue(encoder.encode(`[[ERROR]]${msg}`));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache, no-store",
    },
  });
}
