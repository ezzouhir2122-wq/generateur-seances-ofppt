// Equipment : Génération d'une séance pédagogique via Claude API
// Usage : appelé depuis /api/generate/route.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface SeanceParams {
  filiere: string;
  module: string;
  duree: string;
  niveau: string;
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

function buildPrompt(p: SeanceParams): string {
  return `Tu es un expert en ingénierie pédagogique OFPPT. Génère une séance pédagogique complète et structurée.

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${p.module}
- Durée : ${p.duree}
- Niveau : ${p.niveau}
- Type de séance : ${p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application"}
- Objectifs pédagogiques : ${p.objectifs}

**Format de sortie attendu (Markdown) :**

# Fiche de Séance Pédagogique

## En-tête
| Filière | Module | Durée | Niveau | Type |
|---------|--------|-------|--------|------|
| ${p.filiere} | ${p.module} | ${p.duree} | ${p.niveau} | ... |

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
