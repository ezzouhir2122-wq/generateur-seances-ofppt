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

const ANNEE_LABELS_OAI: Record<string, string> = {
  "1ere-annee": "1ère Année",
  "2eme-annee": "2ème Année",
  "3eme-annee": "3ème Année",
};

function buildPrompt(p: SeanceParams): string {
  const niveauLabel = p.niveau === "TS" ? "Technicien Spécialisé" : p.niveau === "T" ? "Technicien" : p.niveau;
  const anneeLabel = ANNEE_LABELS_OAI[p.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = p.codeModule ? `${p.codeModule} — ${p.module}` : p.module;

  return `Génère une fiche de séance pédagogique OFPPT complète en Markdown pour :
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application"}
- Objectifs : ${p.objectifs}`;
}
