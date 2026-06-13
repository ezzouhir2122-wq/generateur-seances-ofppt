# Référentiel OFPPT intégré — Génération pilotée par le référentiel

**Date :** 2026-06-13
**Statut :** Validé (design)

## Objectif

Permettre au formateur de partir du **référentiel pédagogique OFPPT** (Filière → Module → Séquence → Compétence) pour générer automatiquement, via l'IA, une **séance**, une **fiche pédagogique** et une **évaluation** pré-remplies à partir de la compétence sélectionnée.

Bénéfices visés : gain de temps, uniformisation des contenus, réduction des erreurs de saisie.

## État existant (à ne pas refaire)

L'infrastructure du référentiel est déjà en place :

- **Modèle de données** : `Secteur → Filiere → RefModule → Competence → Objectif → CriterePerformance` (`prisma/schema.prisma`).
- **Import IA** : `POST /api/referentiel` extrait la structure depuis PDF/DOCX/Excel/Markdown via `src/lib/referentiel-extractor.ts`.
- **Affichage** : page `/referentiel` (`ReferentielClient.tsx`) — table filtrable + export Excel.
- **Générateurs existants** : `/seances` (`POST /api/generate`), `/fiches` (`POST /api/fiches/generate`), `/evaluations` (`POST /api/evaluations/generate`).

## Périmètre de cette tâche

1. Ajouter le niveau **Séquence** au référentiel (modèle, import, affichage cascade).
2. Créer une page **« Générer depuis le référentiel »** : cascade Filière → Module → Séquence → Compétence, puis 3 boutons qui ouvrent chaque générateur **pré-rempli**.

Hors périmètre : refonte des générateurs, génération combinée en un seul document, tests automatisés (pas de framework configuré).

## Décisions d'architecture

- **A1 — Séquence optionnelle (additif).** `Competence.moduleId` reste requis ; on ajoute `Competence.sequenceId` (nullable) et un modèle `Sequence`. Rétro-compatible : les compétences existantes restent rattachées au module (`sequenceId = null`).
- **B1 — Handoff via `sessionStorage`.** La page de génération dépose un objet `referentielContext` dans `sessionStorage` puis navigue vers le générateur, qui se pré-remplit au montage. Pas de query params (objectifs/critères multi-lignes).

## Conception détaillée

### 1. Modèle de données (`prisma/schema.prisma`)

Nouveau modèle :

```prisma
model Sequence {
  id          String       @id @default(cuid())
  titre       String
  code        String?
  ordre       Int?
  moduleId    String
  module      RefModule    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  competences Competence[]
  createdAt   DateTime     @default(now())
}
```

Modifications :
- `RefModule` : ajouter `sequences Sequence[]`.
- `Competence` : ajouter `sequenceId String?` et `sequence Sequence? @relation(fields: [sequenceId], references: [id], onDelete: SetNull)`. `moduleId` **inchangé (requis)**.

Migration : `npx prisma migrate dev --name add_sequences`. Additive (nouvelle table + colonne nullable) — aucune perte de données ; `GroupeCompetence` et `ProgressionCompetence` (qui référencent `Competence`) restent intacts.

### 2. Extraction IA (`src/lib/referentiel-extractor.ts`)

`ExtractedReferentiel.modules[]` gagne un champ optionnel :

```ts
sequences?: {
  titre: string;
  code?: string;
  competences: { titre: string; objectifs: { titre: string; criteres: string[] }[] }[];
}[];
```

Le prompt demande d'extraire les séquences **si elles figurent** dans le document, en regroupant les compétences sous leur séquence. Si aucune séquence n'est détectée, les compétences restent sous `modules[].competences` (comportement actuel conservé).

### 3. API référentiel (`src/app/api/referentiel/route.ts`)

- **POST (import)** : dans la boucle d'insertion, si `mod.sequences` est non vide, créer les `Sequence` puis insérer chaque compétence avec `sequenceId` **et** `moduleId`. Sinon, créer les compétences directement sous le module (`sequenceId` omis). Mettre à jour les compteurs de stats (`sequencesCreated`).
- **GET (complet)** : ajouter `sequences: { include: { competences: ... } }` à l'`include`.
- **Nouveau `mode=cascade`** : retourne une structure allégée `filieres → modules → sequences → competences → { objectifs: { titre, criteres } }` pour alimenter la page de génération. Les compétences sans séquence sont aussi renvoyées (rattachées au module).

### 4. Page `/referentiel/generer`

- `page.tsx` (server component, `auth()` requis) charge les données via `mode=cascade`.
- `GenererClient.tsx` (client) :
  - Selects en cascade **Filière → Module → Séquence → Compétence**. La séquence n'est affichée que si le module possède des séquences ; sinon on liste directement ses compétences.
  - À la sélection d'une compétence : carte d'aperçu listant ses **objectifs** et **critères de performance**, plus 3 boutons : *Générer la séance*, *Générer la fiche*, *Générer l'évaluation*.
  - Chaque bouton sérialise `referentielContext` dans `sessionStorage` puis `router.push("/seances" | "/fiches" | "/evaluations")`.
- Découverte : item de nav (`NavSidebar.tsx`, groupe Génération) + bouton CTA sur la page `/referentiel`.

**Contexte transmis** (`sessionStorage["referentielContext"]`, JSON) :

```ts
interface ReferentielContext {
  filiere: string;     // Filiere.nom
  module: string;      // RefModule.nom
  codeModule: string;  // RefModule.code ?? ""
  sequence?: string;   // Sequence.titre si applicable
  competence: string;  // Competence.titre
  objectifs: string;   // titres des objectifs joints (une ligne chacun)
  criteres: string;    // critères de performance joints
}
```

### 5. Pré-remplissage des générateurs

Chaque page lit `referentielContext` au montage via un `useEffect`, applique les valeurs au formulaire, **puis supprime la clé** (`sessionStorage.removeItem`) pour ne pas polluer une génération manuelle ultérieure.

- **Séance** (`SeanceForm.tsx`) : si le contexte est présent, basculer sur la disposition « saisie manuelle » pré-remplie (filière, module, `codeModule`, `competence` = titre de la compétence, `objectifs`). Cela court-circuite le mode dropdown-Excel pour cette session.
- **Fiche** (page `/fiches`) : `filiere`, `module`, `codeModule`, `intitule` = compétence, `objectifsSavoir` = objectifs.
- **Évaluation** (page `/evaluations`) : `filiere`, `module`, `codeModule`, `theme` = compétence, `themesCouverts` = objectifs.

## Découpage en unités

| Unité | Rôle | Dépend de |
|---|---|---|
| Schéma + migration | Niveau Séquence en base | — |
| Extracteur | Produire `sequences[]` depuis un document | Schéma |
| API référentiel (POST/GET/cascade) | Persister + exposer les séquences et la cascade | Schéma, Extracteur |
| Page `/referentiel/generer` | Cascade UI + handoff | API cascade |
| Pré-remplissage ×3 | Lire le contexte et remplir les formulaires | Handoff |
| Navigation | Accès à la page | Page |

## Vérification

Pas de framework de tests dans le projet (aucun script `test`). Vérification :

1. `npx prisma migrate dev --name add_sequences` s'applique sans erreur sur la base de dev.
2. `npm run build` passe (type-check + lint) — notamment les nouveaux types `Sequence`/`ReferentielContext`.
3. Parcours manuel : importer un référentiel contenant des séquences → vérifier l'affichage cascade → page `/referentiel/generer` → sélectionner Filière/Module/Séquence/Compétence → cliquer *Générer la séance* → `/seances` pré-rempli → générer ; idem Fiche et Évaluation.
4. Rétro-compatibilité : un référentiel sans séquence reste fonctionnel (compétences directement sous module).

## Risques et points d'attention

- `SeanceForm` a deux dispositions (import Excel vs manuelle) : le pré-remplissage doit forcer la disposition manuelle quand un contexte référentiel est présent, sinon la filière sélectionnée risque de ne pas correspondre à un groupe Excel.
- Bien **vider** `sessionStorage` après lecture pour éviter qu'un contexte « colle » à des générations suivantes.
- Mettre à jour `decisions/ledger.md` (règle projet) avec les décisions A1/B1.
