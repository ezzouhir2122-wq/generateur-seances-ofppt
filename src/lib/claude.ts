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
  const anneeLabel = ANNEE_LABELS_CLAUDE[p.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = p.codeModule ? `${p.codeModule} — ${p.module}` : p.module;
  const typeLabel = p.type === "theorique" ? "Cours théorique" : p.type === "tp" ? "Travaux Pratiques" : "Travaux d'Application";
  const niveauApp = p.niveauApprentissage ? NIVEAU_APP_LABELS[p.niveauApprentissage] : null;
  const mode = p.mode ? MODE_LABELS[p.mode] : "Présentiel";

  const themeSection = p.competence
    ? `- Thème / Compétence du cours : ${p.competence}\n`
    : "";
  const niveauAppSection = niveauApp
    ? `- Niveau d'apprentissage : ${niveauApp}\n`
    : "";
  const modeSection = `- Mode de formation : ${mode}\n`;

  const dureeMins = p.duree === "5h" ? 300 : 150;
  const mhgSection = p.mhg
    ? `- Masse horaire globale du module (MH.G) : ${p.mhg}h (cette séance représente environ ${Math.round((dureeMins / 60 / p.mhg) * 100)}% du volume horaire total)\n`
    : "";

  const adaptationsMode = p.mode === "distanciel"
    ? `\n**Contexte distanciel :** Adapte les explications à l'auto-formation : sois autosuffisant, explicite chaque notion, et signale les points à approfondir en autonomie.`
    : p.mode === "hybride"
    ? `\n**Contexte hybride :** Indique au fil du cours les notions à travailler en présentiel (pratique) et celles à étudier à distance (théorie).`
    : "";

  const adaptationsNiveau = niveauApp === "Débutant"
    ? `\n**Niveau débutant :** Simplifie le vocabulaire, définis chaque terme technique, multiplie les exemples concrets et progresse pas à pas.`
    : niveauApp === "Avancé"
    ? `\n**Niveau avancé :** Approfondis les notions, ajoute des cas complexes, des subtilités et des liens vers des concepts connexes.`
    : "";

  const theme = p.competence ? p.competence : moduleLabel;

  const mhgHeader = p.mhg ? ` | MH.G |` : "";
  const mhgHeaderSep = p.mhg ? ` ------|` : "";
  const mhgHeaderVal = p.mhg ? ` ${p.mhg}h |` : "";

  return `Tu es un expert formateur OFPPT et concepteur de contenus pédagogiques. Rédige un COURS DÉTAILLÉ, complet et directement exploitable par les stagiaires.

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
${themeSection}${niveauAppSection}${modeSection}${mhgSection}${adaptationsMode}${adaptationsNiveau}

**Consignes de rédaction :**
- NE génère AUCUNE section "Objectifs pédagogiques".
- Rédige un véritable cours de fond (pas une fiche de déroulement) : définitions, explications approfondies, exemples détaillés et expliqués étape par étape.
- Style clair, professionnel et pédagogique, adapté au niveau ${niveauFull}.
- Utilise des listes, des tableaux et des formules quand c'est pertinent.${p.mhg ? `\n- Ce cours couvre environ ${Math.round((dureeMins / 60 / p.mhg) * 100)}% de la masse horaire du module : calibre la profondeur en conséquence.` : ""}

**Format de sortie attendu (Markdown) :**

# ${theme}

## En-tête
| Filière | Module | Durée | Niveau | Type | Mode |${mhgHeader}
|---------|--------|-------|--------|------|------|${mhgHeaderSep}
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ${typeLabel} | ${mode} |${mhgHeaderVal}

## Introduction
(Mise en contexte du thème, son importance dans le métier et le module.)

## 1. Définitions et concepts clés
(Définitions précises et claires de chaque notion essentielle, avec la terminologie exacte.)

## 2. Développement
### 2.1 ...
### 2.2 ...
### 2.3 ...
(Développe le cœur du cours de façon progressive et structurée : principes, méthodes, règles, démonstrations. Sois exhaustif et précis.)

## 3. Exemples expliqués
### Exemple 1 — ...
**Énoncé :** ...
**Explication détaillée :** (résolution commentée, étape par étape)
### Exemple 2 — ...
**Énoncé :** ...
**Explication détaillée :** ...

## 4. Synthèse — points clés à retenir
(Récapitulatif des notions essentielles sous forme de liste à puces.)

Génère un cours réaliste, riche et directement utilisable en formation OFPPT.`;
}
