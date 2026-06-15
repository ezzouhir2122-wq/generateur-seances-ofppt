import { SeanceParams } from "../../equipment/generate-seance";

export async function generateWithGoogle(
  params: SeanceParams,
  options?: { apiKey?: string; model?: string }
): Promise<string> {
  const key = options?.apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("Clé Google AI manquante");

  const model = options?.model ?? "gemini-2.5-pro";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(params) }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message ?? `Erreur ${res.status}`;
    throw new Error(`Google AI : ${msg}`);
  }

  const data = await res.json();
  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse Google AI invalide ou vide");
  return text;
}

const ANNEE_LABELS: Record<string, string> = {
  "1ere-annee": "1ère Année",
  "2eme-annee": "2ème Année",
  "3eme-annee": "3ème Année",
};

const NIVEAU_APP_LABELS: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

const MODE_LABELS: Record<string, string> = {
  presentiel: "Présentiel",
  distanciel: "Distanciel",
  hybride: "Hybride",
};

function buildPrompt(p: SeanceParams): string {
  const niveauLabel = p.niveau === "TS" ? "Technicien Spécialisé" : "Technicien";
  const anneeLabel = ANNEE_LABELS[p.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = p.codeModule ? `${p.codeModule} — ${p.module}` : p.module;
  const typeLabel = p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application";
  const niveauApp = p.niveauApprentissage ? NIVEAU_APP_LABELS[p.niveauApprentissage] : null;
  const mode = p.mode ? MODE_LABELS[p.mode] : "Présentiel";
  const theme = p.competence ? p.competence : moduleLabel;
  const dureeMins = p.duree === "5h" ? 300 : 150;

  return `Tu es un expert formateur OFPPT et concepteur de contenus pédagogiques. Rédige un COURS DÉTAILLÉ complet en Markdown, directement exploitable par les stagiaires.

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
- Thème / Compétence : ${p.competence ?? "(thème général du module)"}
- Mode : ${mode}
${niveauApp ? `- Niveau d'apprentissage : ${niveauApp}\n` : ""}${p.mhg ? `- Masse horaire globale (MH.G) : ${p.mhg}h (cette séance ≈ ${Math.round((dureeMins / 60 / p.mhg) * 100)}% du volume total)\n` : ""}
**Consignes :**
- NE génère AUCUNE section "Objectifs pédagogiques"
- Rédige un cours de fond : définitions, explications approfondies, exemples détaillés
- Style clair, professionnel, adapté au niveau ${niveauFull}
- Utilise listes, tableaux et formules quand pertinent

**Format attendu (Markdown) :**

# ${theme}

## En-tête
| Filière | Module | Durée | Niveau | Type | Mode |
|---------|--------|-------|--------|------|------|
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ${typeLabel} | ${mode} |

## Introduction
## 1. Définitions et concepts clés
## 2. Développement
### 2.1 ...
### 2.2 ...
## 3. Exemples expliqués
### Exemple 1 — ...
**Énoncé :** ...
**Explication détaillée :** ...
## 4. Synthèse — points clés à retenir

Génère un cours réaliste, riche et directement utilisable en formation OFPPT.`;
}
