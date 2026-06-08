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

const ANNEE_LABELS_CLAUDE: Record<string, string> = {
  "1ere-annee": "1ère Année",
  "2eme-annee": "2ème Année",
  "3eme-annee": "3ème Année",
};

function buildPrompt(p: SeanceParams): string {
  const niveauLabel = p.niveau === "TS" ? "Technicien Spécialisé" : "Technicien";
  const anneeLabel = ANNEE_LABELS_CLAUDE[p.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = p.codeModule ? `${p.codeModule} — ${p.module}` : p.module;

  return `Tu es un expert en ingénierie pédagogique OFPPT. Génère une séance pédagogique complète pour :
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application"}
- Objectifs : ${p.objectifs}

Produis une fiche de séance structurée en Markdown avec : en-tête, objectifs, prérequis, déroulement (tableau), évaluation, matériel.`;
}
