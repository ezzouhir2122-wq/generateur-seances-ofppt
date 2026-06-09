import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { buildEvaluationPrompt } from "@/lib/prompts";
import type { EvaluationFormData } from "@/types/seance";

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
      model: "claude-opus-4-5",
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

  return NextResponse.json({ contenu });
}
