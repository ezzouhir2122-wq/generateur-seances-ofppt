import OpenAI from "openai";
import { SeanceParams } from "../../equipment/generate-seance";

export const OPENAI_MODELS = [
  { id: "gpt-4o",       label: "GPT-4o — Meilleur" },
  { id: "gpt-4o-mini",  label: "GPT-4o Mini — Rapide" },
  { id: "gpt-4-turbo",  label: "GPT-4 Turbo — Puissant" },
];

export async function generateWithOpenAI(
  params: SeanceParams,
  options?: { apiKey?: string; model?: string }
): Promise<string> {
  const key = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Clé OpenAI manquante");
  const client = new OpenAI({ apiKey: key });
  const model = options?.model ?? "gpt-4o";
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: "Tu es un expert en ingénierie pédagogique OFPPT." },
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
  const typeLabel = p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application";
  const theme = p.competence ? p.competence : moduleLabel;

  return `Rédige un COURS DÉTAILLÉ OFPPT complet en Markdown (PAS une fiche de déroulement, et SANS section "Objectifs pédagogiques") pour :
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
- Thème / Compétence : ${p.competence ?? "(thème général du module)"}

Structure attendue :
# ${theme}
## En-tête (tableau : Filière | Module | Durée | Niveau | Type)
## Introduction (mise en contexte)
## 1. Définitions et concepts clés (définitions précises)
## 2. Développement (sous-parties 2.1, 2.2, 2.3 — explications approfondies et progressives)
## 3. Exemples expliqués (Énoncé + Explication détaillée étape par étape)
## 4. Synthèse — points clés à retenir (liste à puces)

Sois précis, professionnel et pédagogique. Adapte le niveau à : ${niveauFull}.`;
}
