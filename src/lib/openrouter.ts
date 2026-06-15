import OpenAI from "openai";
import { SeanceParams } from "../../equipment/generate-seance";

export async function generateWithOpenRouter(
  params: SeanceParams,
  options?: { apiKey?: string; model?: string }
): Promise<string> {
  const key = options?.apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Clé OpenRouter manquante");

  // Strip "openrouter/" prefix: "openrouter/meta-llama/llama-4-maverick" → "meta-llama/llama-4-maverick"
  const modelId = (options?.model ?? "meta-llama/llama-4-maverick").replace(/^openrouter\//, "");

  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://generateur-seances-ofppt.vercel.app",
      "X-Title": "Générateur Séances OFPPT",
    },
  });

  const completion = await client.chat.completions.create({
    model: modelId,
    max_tokens: 4096,
    messages: [
      { role: "system", content: "Tu es un expert en ingénierie pédagogique OFPPT." },
      { role: "user", content: buildPrompt(params) },
    ],
  });

  return completion.choices[0].message.content ?? "";
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

  return `Rédige un COURS DÉTAILLÉ OFPPT complet en Markdown (PAS une fiche de déroulement, SANS section "Objectifs pédagogiques") pour :
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
- Thème / Compétence : ${p.competence ?? "(thème général du module)"}

Structure :
# ${theme}
## En-tête (tableau : Filière | Module | Durée | Niveau | Type)
## Introduction
## 1. Définitions et concepts clés
## 2. Développement (2.1, 2.2, 2.3)
## 3. Exemples expliqués (Énoncé + Explication étape par étape)
## 4. Synthèse — points clés à retenir

Sois précis, professionnel et pédagogique. Adapte au niveau : ${niveauFull}.`;
}
