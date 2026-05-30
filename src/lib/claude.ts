import Anthropic from "@anthropic-ai/sdk";
import { SeanceParams } from "../../equipment/generate-seance";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateWithClaude(params: SeanceParams): Promise<string> {
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildPrompt(params) }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Réponse Claude invalide");
  return block.text;
}

function buildPrompt(p: SeanceParams): string {
  return `Tu es un expert en ingénierie pédagogique OFPPT. Génère une séance pédagogique complète pour :
- Filière : ${p.filiere}
- Module : ${p.module}
- Durée : ${p.duree}
- Niveau : ${p.niveau}
- Type : ${p.type}
- Objectifs : ${p.objectifs}

Produis une fiche de séance structurée en Markdown avec : en-tête, objectifs, prérequis, déroulement (tableau), évaluation, matériel.`;
}
