// Equipment : Génération d'une séance pédagogique via Claude API
// Usage : appelé depuis /api/generate/route.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface SeanceParams {
  filiere: string;
  module: string;
  codeModule?: string;
  duree: string;
  niveau: string;
  annee?: string;
  type: "theorique" | "tp" | "ta";
  objectifs: string;
}

export async function generateSeance(params: SeanceParams): Promise<string> {
  const prompt = buildPrompt(params);

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Réponse inattendue de Claude");
  return content.text;
}

const ANNEE_LABELS: Record<string, string> = {
  "1ere-annee": "1ère Année",
  "2eme-annee": "2ème Année",
  "3eme-annee": "3ème Année",
};

function buildPrompt(p: SeanceParams): string {
  const niveauLabel = p.niveau === "TS" ? "Technicien Spécialisé" : "Technicien";
  const anneeLabel = ANNEE_LABELS[p.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = p.codeModule ? `${p.codeModule} — ${p.module}` : p.module;

  return `Tu es un expert en ingénierie pédagogique OFPPT. Génère une séance pédagogique complète et structurée.

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type de séance : ${p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application"}
- Objectifs pédagogiques : ${p.objectifs}

**Format de sortie attendu (Markdown) :**

# Fiche de Séance Pédagogique

## En-tête
| Filière | Module | Durée | Niveau | Type |
|---------|--------|-------|--------|------|
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ... |

## Objectif(s) de la séance
...

## Prérequis
...

## Déroulement

| Étape | Activité Formateur | Activité Stagiaire | Durée | Supports |
|-------|-------------------|-------------------|-------|----------|
| ...   | ...               | ...               | ...   | ...      |

## Évaluation
...

## Matériel et Supports
...

Génère une séance réaliste, détaillée et directement utilisable par un formateur OFPPT.`;
}
