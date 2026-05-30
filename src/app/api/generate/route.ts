import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateWithClaude } from "@/lib/claude";
import { generateWithOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/db";
import { SeanceParams } from "../../../../equipment/generate-seance";

export async function POST(req: NextRequest) {
  const session = await auth();
  const params: SeanceParams = await req.json();

  if (!params.filiere || !params.module || !params.objectifs) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  let contenu: string;
  let source = "claude";

  try {
    contenu = await generateWithClaude(params);
  } catch {
    try {
      contenu = await generateWithOpenAI(params);
      source = "openai";
    } catch {
      return NextResponse.json({ error: "Échec de la génération IA" }, { status: 500 });
    }
  }

  // Sauvegarder si formateur connecté
  let seanceId: string | undefined;
  if (session?.user?.id) {
    try {
      const saved = await prisma.seance.create({
        data: {
          title: `${params.filiere} — ${params.module}`,
          filiere: params.filiere,
          module: params.module,
          duree: params.duree,
          niveau: params.niveau,
          type: params.type,
          objectifs: params.objectifs,
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
