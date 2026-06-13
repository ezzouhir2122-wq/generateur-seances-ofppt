// Equipment : Génération d'une séance pédagogique via Claude API
// Usage : appelé depuis /api/generate/route.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface SeanceParams {
  filiere: string;
  module: string;
  codeModule?: string;
  mhg?: number;
  duree: string;
  niveau: string;
  annee?: string;
  type: "theorique" | "tp" | "ta";
  objectifs?: string;
  competence?: string;
  niveauApprentissage?: "debutant" | "intermediaire" | "avance";
  mode?: "presentiel" | "distanciel" | "hybride";
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
  const typeLabel = p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application";
  const theme = p.competence ? p.competence : moduleLabel;

  return `Tu es un expert formateur OFPPT. Rédige un COURS DÉTAILLÉ complet (SANS section "Objectifs pédagogiques").

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
- Thème / Compétence : ${p.competence ?? "(thème général du module)"}

**Format de sortie attendu (Markdown) :**

# ${theme}

## En-tête
| Filière | Module | Durée | Niveau | Type |
|---------|--------|-------|--------|------|
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ${typeLabel} |

## Introduction
(Mise en contexte du thème.)

## 1. Définitions et concepts clés
...

## 2. Développement
### 2.1 ...
### 2.2 ...
(Explications approfondies et progressives.)

## 3. Exemples expliqués
### Exemple 1 — ...
**Énoncé :** ...
**Explication détaillée :** ...

## 4. Synthèse — points clés à retenir
...

Génère un cours réaliste, riche et directement utilisable en formation OFPPT.`;
}
