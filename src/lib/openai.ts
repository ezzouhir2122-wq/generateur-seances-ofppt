import OpenAI from "openai";
import { SeanceParams } from "../../equipment/generate-seance";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWithOpenAI(params: SeanceParams): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: "Tu es un expert en ingénierie pédagogique OFPPT.",
      },
      { role: "user", content: buildPrompt(params) },
    ],
  });
  return completion.choices[0].message.content ?? "";
}

function buildPrompt(p: SeanceParams): string {
  return `Génère une fiche de séance pédagogique OFPPT complète en Markdown pour :
- Filière : ${p.filiere}
- Module : ${p.module}
- Durée : ${p.duree}
- Niveau : ${p.niveau}
- Type : ${p.type}
- Objectifs : ${p.objectifs}`;
}
