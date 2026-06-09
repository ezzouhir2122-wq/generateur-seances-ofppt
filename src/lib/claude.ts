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

  const competenceSection = p.competence
    ? `- Compétence ciblée : ${p.competence}\n`
    : "";
  const niveauAppSection = niveauApp
    ? `- Niveau d'apprentissage : ${niveauApp}\n`
    : "";
  const modeSection = `- Mode de formation : ${mode}\n`;

  const adaptationsMode = p.mode === "distanciel"
    ? `\n**Contexte distanciel :** Propose des activités synchrones (visioconférence) ET asynchrones (ressources auto-formatives). Indique les outils numériques recommandés (LMS, vidéos, quiz en ligne).`
    : p.mode === "hybride"
    ? `\n**Contexte hybride :** Alterne entre activités en présentiel (pratique, manipulation) et distanciel (théorie, exercices). Indique clairement ce qui se fait en salle et ce qui se fait à distance.`
    : "";

  const adaptationsNiveau = niveauApp === "Débutant"
    ? `\n**Niveau débutant :** Simplifie le vocabulaire, multiplie les exemples concrets, prévois plus de temps d'explication et des vérifications fréquentes de compréhension.`
    : niveauApp === "Avancé"
    ? `\n**Niveau avancé :** Propose des activités d'approfondissement, des études de cas complexes, une autonomie plus grande et des liens vers des ressources complémentaires.`
    : "";

  return `Tu es un expert en ingénierie pédagogique OFPPT. Génère une séance pédagogique complète et structurée.

**Paramètres :**
- Filière : ${p.filiere}
- Module : ${moduleLabel}
- Durée : ${p.duree}
- Niveau : ${niveauFull}
- Type : ${typeLabel}
${competenceSection}${niveauAppSection}${modeSection}- Objectifs pédagogiques : ${p.objectifs}
${adaptationsMode}${adaptationsNiveau}

**Format de sortie attendu (Markdown) :**

# Fiche de Séance Pédagogique

## En-tête
| Filière | Module | Durée | Niveau | Type | Mode |
|---------|--------|-------|--------|------|------|
| ${p.filiere} | ${moduleLabel} | ${p.duree} | ${niveauFull} | ${typeLabel} | ${mode} |

## Compétence(s) ciblée(s)
${p.competence ? p.competence : "..."}

## Objectifs pédagogiques
### Savoir (connaissances)
...
### Savoir-faire (compétences pratiques)
...
### Savoir-être (attitudes)
...

## Prérequis
...

## Activités pédagogiques

| Étape | Activité Formateur | Activité Stagiaire | Durée | Supports / Ressources |
|-------|-------------------|-------------------|-------|-----------------------|
| ...   | ...               | ...               | ...   | ...                   |

## Ressources et Supports
### Supports pour le formateur
...
### Supports pour le stagiaire
...${p.mode === "distanciel" || p.mode === "hybride" ? "\n### Ressources numériques\n..." : ""}

## Évaluation
### Évaluation formative (pendant la séance)
...
### Critères de réussite
...

Génère une séance réaliste, détaillée et directement utilisable par un formateur OFPPT.`;
}
