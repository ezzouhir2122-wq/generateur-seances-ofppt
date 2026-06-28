import { SeanceParams } from "../../equipment/generate-seance";

export async function generateWithGLM(
  params: SeanceParams,
  options?: { apiKey?: string; model?: string }
): Promise<string> {
  const key = options?.apiKey || process.env.GLM_API_KEY;
  if (!key) throw new Error("Clé Zhipu AI (GLM) manquante");

  const model = options?.model ?? "glm-4-flash";

  const res = await fetch("https://open.bigmodel.cn/api/paie/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: buildPrompt(params) }],
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message ?? `Erreur ${res.status}`;
    throw new Error(`GLM : ${msg}`);
  }

  const data = await res.json();
  const text = (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Réponse GLM invalide ou vide");
  return text;
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
  const dureeMins = p.duree === "5h" ? 300 : 150;

  return `Tu es un expert formateur OFPPT et concepteur de contenus pédagogiques. Rédige un COURS DÉTAILLÉ complet en Markdown, directement exploitable par les stagiaires.

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
- Thème / Compétence : ${p.competence ?? "(thème général du module)"}
${p.mhg ? `- Masse horaire globale (MH.G) : ${p.mhg}h (cette séance ≈ ${Math.round((dureeMins / 60 / p.mhg) * 100)}% du volume total)\n` : ""}
**Consignes :**
- NE génère AUCUNE section "Objectifs pédagogiques"
- Rédige un cours de fond : définitions, explications approfondies, exemples détaillés
- Style clair, professionnel, adapté au niveau ${niveauFull}
- Utilise listes, tableaux et formules quand pertinent

**Format attendu (Markdown) :**

# ${theme}

## En-tête
| Filière | Module | Durée | Niveau | Type |
|---------|--------|-------|--------|------|
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ${typeLabel} |

## Introduction
## 1. Définitions et concepts clés
## 2. Développement
### 2.1 ...
### 2.2 ...
## 3. Exemples expliqués
## 4. Synthèse — points clés à retenir

Génère un cours réaliste, riche et directement utilisable en formation OFPPT.`;
}
