import { NextRequest, NextResponse } from "next/server";
import { generateWithClaude } from "@/lib/claude";
import { generateWithOpenAI } from "@/lib/openai";
import { SeanceParams } from "../../../../equipment/generate-seance";

export async function POST(req: NextRequest) {
  const params: SeanceParams = await req.json();

  if (!params.filiere || !params.module || !params.objectifs) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  try {
    const contenu = await generateWithClaude(params);
    return NextResponse.json({ contenu });
  } catch {
    try {
      const contenu = await generateWithOpenAI(params);
      return NextResponse.json({ contenu, source: "openai" });
    } catch {
      return NextResponse.json(
        { error: "Échec de la génération IA" },
        { status: 500 }
      );
    }
  }
}
