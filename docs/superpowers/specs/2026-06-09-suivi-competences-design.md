# Spec — SUIVI DES COMPÉTENCES

**Date :** 2026-06-09
**Statut :** Approuvé

---

## Objectif

Ajouter une section "Suivi des Compétences" permettant aux formateurs OFPPT de :
- Gérer des groupes de stagiaires
- Suivre la progression de chaque stagiaire par compétence (référentiel existant)
- Visualiser les données via graphiques (BarChart, RadarChart)
- Exporter le tableau en Excel et PDF
- Voir un widget résumé dans le tableau de bord principal

---

## Modèle de données

Trois nouveaux modèles Prisma, à ajouter après les modèles existants :

### Groupe
```prisma
model Groupe {
  id          String       @id @default(cuid())
  nom         String
  filiere     String
  annee       String       // ex: "2024-2025"
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  stagiaires  Stagiaire[]
  createdAt   DateTime     @default(now())
}
```

### Stagiaire
```prisma
model Stagiaire {
  id           String                   @id @default(cuid())
  nom          String
  prenom       String
  cne          String?
  groupeId     String
  groupe       Groupe                   @relation(fields: [groupeId], references: [id], onDelete: Cascade)
  progressions ProgressionCompetence[]
  createdAt    DateTime                 @default(now())
}
```

### ProgressionCompetence
```prisma
model ProgressionCompetence {
  id           String    @id @default(cuid())
  stagiaireId  String
  stagiaire    Stagiaire @relation(fields: [stagiaireId], references: [id], onDelete: Cascade)
  competenceId String
  competence   Competence @relation(fields: [competenceId], references: [id], onDelete: Cascade)
  pourcentage  Int        // 0-100
  source       String     @default("manuel") // "manuel" | "evaluation"
  updatedAt    DateTime   @updatedAt

  @@unique([stagiaireId, competenceId])
}
```

**Remarque :** `Competence` est le modèle existant lié à `RefModule → Filière`. Il faudra ajouter la relation inverse `progressions ProgressionCompetence[]` sur le modèle `Competence`.

Ajouter également sur `User` : `groupes Groupe[]`

---

## Architecture — Routes & Pages

### Pages Next.js (App Router)

| Route | Rôle |
|-------|------|
| `/suivi` | Liste des groupes du formateur connecté |
| `/suivi/nouveau` | Formulaire de création d'un groupe |
| `/suivi/[groupeId]` | Tableau de progression + graphiques + exports |
| `/suivi/[groupeId]/stagiaires` | Gestion stagiaires (ajout manuel + import Excel) |

### API Routes

| Méthode | Route | Action |
|---------|-------|--------|
| GET | `/api/groupes` | Lister les groupes du formateur |
| POST | `/api/groupes` | Créer un groupe |
| GET | `/api/groupes/[id]` | Détail groupe + stagiaires + progressions |
| DELETE | `/api/groupes/[id]` | Supprimer un groupe |
| POST | `/api/groupes/[id]/stagiaires` | Ajouter un stagiaire manuellement |
| POST | `/api/groupes/[id]/stagiaires/import` | Import Excel (template imposé) |
| DELETE | `/api/stagiaires/[id]` | Supprimer un stagiaire |
| PUT | `/api/progressions` | Upsert pourcentage (saisie manuelle) |
| POST | `/api/progressions/import-notes/[groupeId]` | Import Excel notes → pourcentages |
| GET | `/api/progressions/export/excel/[groupeId]` | Export Excel du tableau |
| GET | `/api/progressions/export/pdf/[groupeId]` | Export PDF du tableau |

---

## Composants UI

### `/suivi` — Liste des groupes
- Grid de cards : nom groupe, badge filière, badge année, nombre de stagiaires, lien vers le détail
- Bouton "Nouveau groupe" en haut à droite
- État vide avec CTA si aucun groupe

### `/suivi/nouveau` — Formulaire création groupe
- Champs : Nom du groupe (text), Filière (select depuis `Filiere` en base), Année scolaire (select : 2024-2025, 2025-2026, 2026-2027)
- Bouton Créer → redirige vers `/suivi/[groupeId]/stagiaires`

### `/suivi/[groupeId]` — Page principale
Layout en deux colonnes sur grands écrans :

**Colonne gauche (60%) — Tableau de progression**
- En-tête : nom groupe, filière, année, boutons Export PDF / Export Excel
- Tableau HTML scrollable horizontalement
  - Lignes : un stagiaire par ligne
  - Colonnes : une compétence par colonne (nom tronqué + tooltip)
  - Cellules éditables : input numérique 0-100, sauvegarde onBlur via PUT `/api/progressions`
  - Badge coloré selon valeur (rouge <50, orange 50-75, vert >75)
  - Bouton "Importer des notes" dans l'en-tête du tableau (upload Excel notes → auto-conversion en %)

**Colonne droite (40%) — Graphiques**
- `BarChart` (recharts) : moyenne par compétence sur tout le groupe
- `RadarChart` : profil du stagiaire sélectionné (clic sur une ligne du tableau)
- Légende et axes en français

### `/suivi/[groupeId]/stagiaires` — Gestion stagiaires
- Tableau liste : Nom, Prénom, CNE, date ajout, actions (supprimer)
- Bouton "Ajouter un stagiaire" → modal (Nom, Prénom, CNE optionnel)
- Bouton "Importer Excel" → input file + bouton télécharger template
- Lien retour vers `/suivi/[groupeId]`

### Widget Dashboard (`/`)
- Ajout d'un bloc "Suivi des compétences" sur la page d'accueil
- BarChart mini : moyenne globale des 5 premières compétences sur tous les groupes du formateur
- Lien "Voir tout" → `/suivi`

---

## Import Excel

**Template imposé** avec colonnes fixes :
```
| Nom | Prénom | CNE (optionnel) |
```

- Téléchargeable via un fichier statique `/public/templates/template-stagiaires.xlsx`
- À la réimportation : parsing via `xlsx` (déjà dans le projet), validation colonnes requises, insertion en base avec `createMany`
- Doublons gérés par CNE si fourni (skip silencieux)

---

## Export

### Excel
- Librairie `xlsx` (déjà dans le projet)
- Feuille 1 : tableau de progression brut (stagiaire × compétence)
- Feuille 2 : moyennes par compétence
- Généré côté serveur dans la route API, retourné comme buffer

### PDF
- Librairie `jsPDF` (déjà dans le projet)
- En-tête OFPPT + nom groupe + date
- Tableau de progression complet (texte uniquement — pas de capture de graphique côté serveur)
- Généré côté serveur dans la route API

---

## Charts — recharts

Librairie : `recharts` (à installer)

| Chart | Emplacement | Données |
|-------|-------------|---------|
| `BarChart` | Page groupe + Dashboard | Moyenne par compétence |
| `RadarChart` | Page groupe (stagiaire sélectionné) | Scores d'un stagiaire |

Couleurs : vert `#84CC16` (OFPPT), gradient amber pour valeurs faibles.

---

## Import Notes → Progression

Les évaluations actuelles ne sont pas stockées en base (génération IA sans persistence des notes). Le second mode d'alimentation est donc un **import Excel de notes** :

- Template Excel téléchargeable avec colonnes : `Stagiaire | Compétence | Note (/20)`
- Endpoint `POST /api/progressions/import-notes/[groupeId]` : parse le fichier, convertit la note en pourcentage (`note/20 * 100`), upsert avec `source: "import"`
- **Ne pas écraser une entrée `source: "manuel"` plus récente**
- Si une compétence du fichier ne correspond à aucune compétence du référentiel, elle est ignorée avec un message d'avertissement dans la réponse API

---

## Navigation

Ajouter dans `NavSidebar.tsx` une nouvelle section :

```
SUIVI DES COMPÉTENCES
  └── Mes groupes   →  /suivi
```

Icône : graphique barre (BarChartIcon SVG inline, style cohérent avec les autres icônes du sidebar).

---

## Dépendances à installer

| Package | Usage |
|---------|-------|
| `recharts` | Graphiques (BarChart, RadarChart) |

`xlsx` et `jsPDF` sont déjà dans le projet.

---

## Contraintes & points d'attention

1. Les compétences affichées dans le tableau dépendent de la **filière du groupe** → requête `Competence` via `RefModule → Filière`. Si aucune compétence n'est référencée pour cette filière, afficher un message d'avertissement avec lien vers l'import du référentiel.
2. Le tableau peut avoir **beaucoup de colonnes** (une par compétence) — prévoir un scroll horizontal et un nom tronqué avec tooltip.
3. La sauvegarde des cellules se fait **onBlur** (pas onChange) pour éviter un appel API à chaque frappe.
4. L'export PDF du graphique nécessite que le composant `recharts` soit rendu côté client avant la capture — utiliser `html2canvas` ou passer par une image base64 du canvas recharts.
5. Le modèle `Competence` existant doit recevoir une relation inverse `progressions ProgressionCompetence[]` sans breaking change (relation optionnelle).
