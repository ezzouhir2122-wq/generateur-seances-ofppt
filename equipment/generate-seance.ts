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
  competences?: string[];
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

  const comps = (p.competences && p.competences.length > 0)
    ? p.competences
    : p.competence ? [p.competence] : [];
  const multi = comps.length > 1;

  const themeStr = multi
    ? `Compétences visées (${comps.length}) :\n${comps.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`
    : `Thème / Compétence : ${comps[0] ?? "(thème général du module)"}`;
  const title = multi ? `${p.module} — ${comps.length} compétences groupées` : (comps[0] || moduleLabel);

  const develSection = multi
    ? comps.map((c, i) => `## ${i + 1}. ${c}\n### Définitions et concepts clés\n### Développement\n### Exemples pratiques`).join("\n\n")
    : `## 1. Définitions et concepts clés\n...\n\n## 2. Développement\n### 2.1 ...\n### 2.2 ...\n(Explications approfondies et progressives.)\n\n## 3. Exemples expliqués\n### Exemple 1 — ...\n**Énoncé :** ...\n**Explication détaillée :** ...`;

  return `Tu es un expert formateur OFPPT. Rédige un COURS DÉTAILLÉ complet (SANS section "Objectifs pédagogiques").

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
- ${themeStr}
${multi ? "\nIMPORTANT : Ce document couvre TOUTES les compétences listées dans un seul cours cohérent. Traite chaque compétence dans sa propre section numérotée.\n" : ""}
**Format de sortie attendu (Markdown) :**

# ${title}

## En-tête
| Filière | Module | Durée | Niveau | Type |
|---------|--------|-------|--------|------|
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ${typeLabel} |

## Introduction
(Mise en contexte${multi ? " des compétences groupées" : " du thème"}.)

${develSection}

## Synthèse — points clés à retenir
...

Génère un cours réaliste, riche et directement utilisable en formation OFPPT.`;
}
