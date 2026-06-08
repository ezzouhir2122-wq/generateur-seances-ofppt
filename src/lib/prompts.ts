import type { SeanceFormData } from "@/types/seance";
import type { FicheFormData } from "@/types/seance";

export function buildSeancePrompt(data: SeanceFormData): string {
  return `Tu es un expert en pédagogie OFPPT. Génère une séance pédagogique complète et structurée.

Filière : ${data.filiere}
Module : ${data.module}
Durée : ${data.duree}
Niveau : ${data.niveau}
Type : ${data.type}
Objectifs : ${data.objectifs}

Format la réponse en markdown avec les sections suivantes :
## Informations générales
## Objectifs pédagogiques
## Déroulement de la séance
### 1. Introduction (mise en situation)
### 2. Développement
### 3. Synthèse et évaluation
## Ressources et matériel
## Évaluation`;
}

const FICHE_ANNEE_LABELS: Record<string, string> = {
  "1ere-annee": "1ère Année",
  "2eme-annee": "2ème Année",
  "3eme-annee": "3ème Année",
};

export function buildFichePrompt(data: FicheFormData): string {
  const niveauLabel = data.niveau === "TS" ? "Technicien Spécialisé" : "Technicien";
  const anneeLabel = FICHE_ANNEE_LABELS[data.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = data.codeModule ? `${data.codeModule} — ${data.module}` : data.module;

  return `Tu es un expert en pédagogie OFPPT. Génère une fiche pédagogique complète au format officiel OFPPT.

Filière : ${data.filiere}
Module : ${moduleLabel}
Intitulé de la séance : ${data.intitule}
Formateur : ${data.formateur}
Durée : ${data.duree}
Type : ${data.type}
Niveau : ${niveauFull}

Objectifs pédagogiques :
- Savoir : ${data.objectifsSavoir}
- Savoir-faire : ${data.objectifsSavoirFaire}
- Savoir-être : ${data.objectifsSavoirEtre || "Non spécifié"}

Prérequis des stagiaires : ${data.prerequis || "Aucun prérequis particulier"}

Génère une fiche pédagogique structurée en markdown avec exactement ces sections :
## En-tête
(Tableau récapitulatif : Établissement OFPPT | Filière | Module | Formateur | Durée | Date | Niveau | Type)

## Objectifs pédagogiques
(Tableau à 3 colonnes : Savoir | Savoir-faire | Savoir-être)

## Déroulement de la séance
(Tableau détaillé avec colonnes : Phase | Durée | Activités formateur | Activités stagiaires | Supports/Méthodes)
### Phase 1 : Introduction / Mise en situation
### Phase 2 : Développement
### Phase 3 : Synthèse et évaluation formative

## Ressources et matériel pédagogique
(Liste des supports nécessaires)

## Grille d'évaluation formative
(Critères d'évaluation avec barème)`;
}

export function buildChatSystemPrompt(domaine: string): string {
  return `Tu es un assistant pédagogique expert pour les formateurs OFPPT du Maroc.
Tu réponds en français, avec précision et pédagogie.
Tu es spécialisé dans le domaine : ${domaine}.
Tes réponses sont orientées formateurs OFPPT :
- Tu proposes des explications claires et structurées
- Tu donnes des exemples concrets adaptés au contexte marocain
- Tu suggests des approches pédagogiques adaptées au niveau OFPPT
- Tu restes factuel et précis sur les aspects techniques du domaine`;
}
