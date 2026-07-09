import type { SeanceFormData } from "@/types/seance";
import type { FicheFormData } from "@/types/seance";

export function buildSeancePrompt(data: SeanceFormData): string {
  const comps = (data.competences && data.competences.length > 0)
    ? data.competences
    : data.competence ? [data.competence] : [];
  const multi = comps.length > 1;

  const themeStr = multi
    ? `Compétences visées (${comps.length}) :\n${comps.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`
    : `Thème / Compétence : ${comps[0] ?? "(thème général du module)"}`;

  const title = multi
    ? `${data.module} — ${comps.length} compétences groupées`
    : (comps[0] || data.module);

  const develSection = multi
    ? comps.map((c, i) => `## ${i + 1}. ${c}\n### Définitions et concepts clés\n### Développement\n### Exemples pratiques`).join("\n\n")
    : `## 1. Définitions et concepts clés\n## 2. Développement (sous-parties 2.1, 2.2, 2.3 — explications approfondies)\n## 3. Exemples expliqués (Énoncé + Explication détaillée étape par étape)`;

  return `Tu es un expert formateur OFPPT. Rédige un COURS DÉTAILLÉ complet (SANS section "Objectifs pédagogiques").

Filière : ${data.filiere}
Module : ${data.module}
Durée : ${data.duree}
Niveau : ${data.niveau}
Type : ${data.type}
${themeStr}
${multi ? "\nIMPORTANT : Ce document couvre TOUTES les compétences listées dans un seul document cohérent. Traite chaque compétence dans sa propre section numérotée.\n" : ""}
Format la réponse en markdown avec les sections suivantes :
# ${title}
## En-tête (Filière | Module | Durée | Niveau | Type)
## Introduction
${develSection}
## Synthèse — points clés à retenir`;
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

  const comps = (data.competences && data.competences.length > 0)
    ? data.competences
    : data.competence ? [data.competence] : [];
  const multi = comps.length > 1;

  const competenceSection = multi
    ? `\nCompétences pédagogiques visées (${comps.length}) :\n${comps.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`
    : (comps[0] ? `\nCompétence visée : ${comps[0]}` : "");

  return `Tu es un expert en pédagogie OFPPT. Génère une fiche pédagogique complète au format officiel OFPPT.

Filière : ${data.filiere}
Module : ${moduleLabel}
Intitulé de la séance : ${data.intitule}
Formateur : ${data.formateur}
Durée : ${data.duree}
Type : ${data.type}
Niveau : ${niveauFull}${competenceSection}

Prérequis des stagiaires : ${data.prerequis || "À déterminer selon le module"}

**IMPORTANT — Objectifs pédagogiques :** Tu dois FORMULER TOI-MÊME des objectifs pédagogiques pertinents et réalistes, déduits de la filière, du module, de l'intitulé de la séance, du type, du niveau${comps.length > 0 ? " et des compétences visées" : ""}. Rédige-les selon la taxonomie OFPPT (verbes d'action mesurables, commençant par « À la fin de la séance, le stagiaire sera capable de… ») répartis en trois catégories : Savoir (connaissances), Savoir-faire (compétences pratiques) et Savoir-être (attitudes professionnelles).
${multi ? "\nIMPORTANT : Cette fiche couvre TOUTES les compétences listées. Les objectifs, le déroulement et les activités doivent intégrer chacune des compétences de manière cohérente dans un seul document pédagogique.\n" : ""}
Génère une fiche pédagogique structurée en markdown avec exactement ces sections :
## En-tête
(Tableau récapitulatif : Établissement OFPPT | Filière | Module | Formateur | Durée | Date | Niveau | Type)

## Objectifs pédagogiques
(Tableau à 3 colonnes : Savoir | Savoir-faire | Savoir-être — objectifs que TU as formulés${multi ? ", couvrant toutes les compétences" : ""})

## Déroulement de la séance
(Tableau détaillé avec colonnes : Phase | Durée | Activités formateur | Activités stagiaires | Supports/Méthodes)
### Phase 1 : Introduction / Mise en situation
### Phase 2 : Développement${multi ? ` (${comps.length} compétences traitées successivement)` : ""}
### Phase 3 : Synthèse et évaluation formative

## Ressources et matériel pédagogique
(Liste des supports nécessaires)

## Grille d'évaluation formative
(Critères d'évaluation avec barème)`;
}

export function buildEvaluationPrompt(data: import("@/types/seance").EvaluationFormData): string {
  const ANNEE: Record<string, string> = { "1ere-annee": "1ère Année", "2eme-annee": "2ème Année", "3eme-annee": "3ème Année" };
  const niveauLabel = data.niveau === "TS" ? "Technicien Spécialisé" : "Technicien";
  const anneeLabel = ANNEE[data.annee ?? ""] ?? "";
  const niveauFull = anneeLabel ? `${niveauLabel} — ${anneeLabel}` : niveauLabel;
  const moduleLabel = data.codeModule ? `${data.codeModule} — ${data.module}` : data.module;
  const themeStr = data.theme ? `\nThème / Chapitre : ${data.theme}` : "";
  const themesStr = data.themesCouverts ? `\nThèmes couverts : ${data.themesCouverts}` : "";

  // ── Canevas officiel CC ──────────────────────────────────────────────────
  if (data.type === "cc") {
    const bareme = data.baremeTotal ?? 20;
    const ptsTh = data.partieTheoriePts ?? Math.round(bareme * 0.4);
    const ptsPr = data.partiePratiquePts ?? Math.round(bareme * 0.6);
    const etablissement = data.etablissement || "ISGI Marrakech";
    const groupe = data.groupe || "___________";
    const anneePromo = data.anneePromo ?? "2A";
    const duree = data.dureeExamen || "1h30";
    const dateEx = data.dateExamen || "___________";

    return `Tu es un expert en évaluation pédagogique OFPPT. Génère un Contrôle Continu (CC) COMPLET respectant EXACTEMENT le canevas officiel OFPPT.

Paramètres :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}
- Établissement : ${etablissement}
- Groupe : ${groupe} | Année : ${anneePromo}
- Durée : ${duree} | Date : ${dateEx}
- Barème : /${bareme} (Théorie : /${ptsTh} | Pratique : /${ptsPr})${themesStr}

**FORMAT DE SORTIE STRICT (Markdown) — respecter exactement cette structure :**

# CONTRÔLE CONTINU — ${moduleLabel}

## 📋 En-tête

| | |
|---|---|
| **Établissement :** ${etablissement} | **Durée :** ${duree} |
| **Filière :** ${data.filiere} | **Année :** ${anneePromo} |
| **Groupe :** ${groupe} | **Date :** ${dateEx} |
| **Module :** ${moduleLabel} | |
| **Épreuve/Barème :** /${bareme} | |

---

## Partie Théorie *(/${ptsTh} pts)*

*(Génère ici 3 à 5 questions de cours progressives couvrant les notions théoriques essentielles du module. Inclure questions directes, définitions, et questions de compréhension. Chaque question précise ses points.)*

---

## Partie Pratique *(/${ptsPr} pts)*

*(Génère ici 1 à 2 exercices d'application pratique réalistes, contextualisés au secteur ${data.filiere}. Chaque exercice a un contexte, des données chiffrées et des questions numérotées. Préciser les points par question.)*

---

## ✅ CORRIGÉ ET BARÈME

### Corrigé Partie Théorie
*(Réponses détaillées à chaque question théorique avec justifications)*

### Corrigé Partie Pratique
*(Solution complète avec calculs détaillés et résultats)*

### Tableau récapitulatif du barème
| Partie | Questions | Points |
|--------|-----------|--------|
| Théorie | ... | /${ptsTh} |
| Pratique | ... | /${ptsPr} |
| **TOTAL** | | **/${bareme}** |

---

| **Concepteur** | **CVEL** | **Validation de l'EFP** |
|----------------|----------|------------------------|
| | | |

Génère un CC complet, rigoureux et adapté au niveau ${niveauFull} de la filière ${data.filiere}. Le contenu doit être concret, précis et directement utilisable par le formateur.`;
  }

  // ── Canevas officiel EFM ──────────────────────────────────────────────────
  if (data.type === "efm") {
    const bareme = data.baremeTotal ?? 40;
    const ptsTh = data.partieTheoriePts ?? Math.round(bareme * 0.4);
    const ptsPr = data.partiePratiquePts ?? Math.round(bareme * 0.6);
    const etablissement = data.etablissement || "ISGI Marrakech";
    const groupe = data.groupe || "___________";
    const anneePromo = data.anneePromo ?? "2A";
    const duree = data.dureeExamen || "2h";
    const dateEx = data.dateExamen || "___________";

    return `Tu es un expert en évaluation pédagogique OFPPT. Génère un Examen de Fin de Module (EFM) COMPLET respectant EXACTEMENT le canevas officiel OFPPT Direction Régionale Marrakech-Safi.

Paramètres :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}
- Établissement : ${etablissement}
- Groupe : ${groupe} | Année : ${anneePromo}
- Durée : ${duree} | Date : ${dateEx}
- Barème total : /${bareme} (Théorie : /${ptsTh} | Pratique : /${ptsPr})${themesStr}

**FORMAT DE SORTIE STRICT (Markdown) — respecter exactement cette structure :**

# EXAMEN DE FIN DE MODULE — ${moduleLabel}

## 📋 En-tête officiel

| | |
|---|---|
| **Établissement :** ${etablissement} | **Durée :** ${duree} |
| **Filière :** ${data.filiere} | **Année :** ${anneePromo} |
| **Groupe :** ${groupe} | **Date :** ${dateEx} |
| **Module :** ${moduleLabel} | |
| **Épreuve/Barème :** /${bareme} | |

---

## Partie Théorie *(/${ptsTh} pts)*

*(Génère ici des questions théoriques complètes couvrant l'ensemble du programme du module. Inclure : questions de cours, QCM, définitions, et questions d'analyse. Chaque question précise clairement ses points. Progressivité du niveau de difficulté : facile → moyen → difficile.)*

---

## Partie Pratique *(/${ptsPr} pts)*

*(Génère ici 2 à 3 exercices d'application pratique complets, avec des cas réels du secteur ${data.filiere}. Chaque exercice inclut : contexte détaillé, données chiffrées/documents, travail demandé numéroté. Répartition des points clairement indiquée.)*

---

## ✅ CORRIGÉ DÉTAILLÉ ET BARÈME

### Corrigé Partie Théorie
*(Réponses complètes et justifiées pour chaque question théorique)*

### Corrigé Partie Pratique
*(Solutions détaillées avec toutes les étapes de calcul, formules utilisées et résultats)*

### Barème de notation
| Partie | Détail | Points |
|--------|--------|--------|
| **Théorie** | | **/${ptsTh}** |
| **Pratique** | | **/${ptsPr}** |
| **TOTAL EFM** | | **/${bareme}** |

---

| **Concepteur** | **CVEL** | **Validation de l'EFP** |
|----------------|----------|------------------------|
| | | |

Génère un EFM complet, de niveau professionnel, couvrant l'ensemble des compétences du module ${moduleLabel}. Le sujet doit être directement imprimable et utilisable lors d'un examen officiel OFPPT.`;
  }

  if (data.type === "qcm") {
    return `Tu es un expert en évaluation pédagogique OFPPT. Génère un QCM de ${data.nbQuestions ?? 10} questions pour :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}${themeStr}

**Format de sortie (Markdown) :**

# QCM — ${moduleLabel}

## Informations
| Filière | Module | Niveau | Nombre de questions |
|---------|--------|--------|---------------------|
| ${data.filiere} | ${moduleLabel} | ${niveauFull} | ${data.nbQuestions ?? 10} |

## Questions

Pour chaque question, utilise ce format :
**Question N — [Thème]**
A) ...
B) ...
C) ...
D) ...

---

## Corrigé

| N° | Bonne réponse | Justification |
|----|---------------|---------------|
| 1  | A             | ...           |
| ...| ...           | ...           |

Génère ${data.nbQuestions ?? 10} questions progressives, avec 4 options par question (une seule bonne réponse). Les questions doivent couvrir différents niveaux cognitifs (mémorisation, compréhension, application).`;
  }

  if (data.type === "exercices") {
    return `Tu es un expert en ingénierie pédagogique OFPPT. Génère ${data.nbExercices ?? 3} exercices pratiques pour :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}${themeStr}

**Format de sortie (Markdown) :**

# Exercices Pratiques — ${moduleLabel}

## Informations
| Filière | Module | Niveau | Nombre d'exercices |
|---------|--------|--------|--------------------|
| ${data.filiere} | ${moduleLabel} | ${niveauFull} | ${data.nbExercices ?? 3} |

## Exercices

Pour chaque exercice :
### Exercice N — [Intitulé] (XX points)
**Contexte :**
...
**Questions / Travail demandé :**
1. ...
2. ...

---

## Corrigé détaillé

### Correction Exercice N
1. ...
2. ...

Génère des exercices progressifs avec un contexte réaliste adapté au secteur ${data.filiere}. Inclure le nombre de points par exercice.`;
  }

  if (data.type === "controle") {
    const duree = data.dureeExamen ?? "1h";
    return `Tu es un expert en évaluation pédagogique OFPPT. Génère un contrôle continu complet pour :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}
- Durée : ${duree}${themeStr}${themesStr}

**Format de sortie (Markdown) :**

# Contrôle Continu — ${moduleLabel}

## En-tête
| Établissement | Filière | Module | Niveau | Durée | Note |
|---------------|---------|--------|--------|-------|------|
| OFPPT | ${data.filiere} | ${moduleLabel} | ${niveauFull} | ${duree} | /20 |

*Documents : Non autorisés sauf indication contraire*

---

## SUJET

### Partie 1 — Questions de cours (X pts)
(Questions directes sur les notions essentielles de la période évaluée)
...

### Partie 2 — QCM (X pts)
(5 à 8 questions à choix multiples ciblées)
**Q1 — ...**
A) ... B) ... C) ... D) ...
...

### Partie 3 — Application (X pts)
(Exercice(s) d'application sur le chapitre couvert)
...

---

## CORRIGÉ ET BARÈME

### Barème
| Partie | Points |
|--------|--------|
| Partie 1 — Questions de cours | /X |
| Partie 2 — QCM | /X |
| Partie 3 — Application | /X |
| **Total** | **/20** |

### Correction détaillée
...

Génère un contrôle continu équilibré, adapté à une évaluation intermédiaire (pas un examen final). Couvrir les notions récentes du module, avec un niveau de difficulté modéré et un corrigé complet.`;
  }

  if (data.type === "examen") {
    const duree = data.dureeExamen ?? "2h";
    return `Tu es un expert en évaluation OFPPT. Génère un examen de fin de module complet pour :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}
- Durée : ${duree}${themesStr}

**Format de sortie (Markdown) :**

# Examen de Fin de Module — ${moduleLabel}

## En-tête
| Établissement | Filière | Module | Niveau | Durée | Note |
|---------------|---------|--------|--------|-------|------|
| OFPPT | ${data.filiere} | ${moduleLabel} | ${niveauFull} | ${duree} | /20 |

*Documents autorisés : …*

---

## SUJET

### Partie 1 — Questions de cours (X pts)
...

### Partie 2 — Exercices d'application (X pts)
...

### Partie 3 — Étude de cas / Travail pratique (X pts)
...

---

## CORRIGÉ ET BARÈME

### Barème global
| Partie | Points |
|--------|--------|
| Partie 1 | /X |
| Partie 2 | /X |
| Partie 3 | /X |
| **Total** | **/20** |

### Correction détaillée
...

Génère un examen équilibré, réaliste et complet avec sujet + corrigé + barème détaillé.`;
  }

  // rattrapage
  const duree = data.dureeExamen ?? "1h30";
  return `Tu es un expert en évaluation OFPPT. Génère une session de rattrapage pour :
- Filière : ${data.filiere}
- Module : ${moduleLabel}
- Niveau : ${niveauFull}
- Durée : ${duree}${themesStr}

**Format de sortie (Markdown) :**

# Examen de Rattrapage — ${moduleLabel}

## En-tête
| Établissement | Filière | Module | Niveau | Durée | Note |
|---------------|---------|--------|--------|-------|------|
| OFPPT | ${data.filiere} | ${moduleLabel} | ${niveauFull} | ${duree} | /20 |

*Session de rattrapage — Documents : …*

---

## SUJET

### Partie 1 — Rappel théorique (X pts)
(Questions ciblant les notions essentielles à maîtriser)
...

### Partie 2 — Application (X pts)
(Exercices sur les compétences clés du module)
...

---

## CORRIGÉ ET BARÈME

### Barème
| Partie | Points |
|--------|--------|
| Partie 1 | /X |
| Partie 2 | /X |
| **Total** | **/20** |

### Correction
...

Génère un sujet de rattrapage légèrement plus accessible que l'examen initial, couvrant les notions fondamentales du module, avec corrigé et barème complets.`;
}

export function buildChatSystemPrompt(
  domaine: string,
  module?: string,
  autresModules?: string[]
): string {
  const moduleCtx = module
    ? `\nModule en cours : **${module}**. Concentre tes réponses sur ce module.`
    : "";
  const modulesListCtx =
    autresModules && autresModules.length > 0
      ? `\nRéférentiel de cette filière — modules : ${autresModules.join(", ")}.`
      : "";

  return `Tu es un assistant pédagogique expert pour les formateurs OFPPT du Maroc.
Tu réponds en français, avec précision et pédagogie.
Filière : **${domaine}**.${moduleCtx}${modulesListCtx}
Tes réponses sont orientées formateurs OFPPT :
- Tu proposes des explications claires et structurées en lien avec le référentiel OFPPT
- Tu donnes des exemples concrets adaptés au contexte marocain et au secteur "${domaine}"
- Tu suggests des approches pédagogiques adaptées au niveau OFPPT (séances, fiches, évaluations)
- Tu restes factuel et précis sur les aspects techniques du domaine
- Quand tu proposes des activités ou exercices, tu les adaptes aux compétences${module ? ` du module "${module}"` : " de la filière"}`;
}
