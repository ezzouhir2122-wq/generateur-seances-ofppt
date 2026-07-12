# Competencia Simulator — Design Spec

**Date :** 2026-07-11  
**Statut :** Approuvé  
**Auteur :** Elmustapha Ezzouhir

---

## 1. Contexte & Objectif

Ajouter un module **Competencia Simulator** à l'application Competencia IA (Next.js 16 + Prisma + Claude API). Ce module permet aux formateurs OFPPT de créer des **entreprises virtuelles IA** dans lesquelles les stagiaires vivent des situations professionnelles réalistes en classe.

Le formateur projette la simulation sur écran, anime la discussion orale, puis sélectionne la décision collective de la classe. L'IA génère les conséquences et enchaîne les événements. La simulation peut être sauvegardée et reprise sur plusieurs séances.

---

## 2. Contraintes & Décisions

| Question | Choix | Raison |
|----------|-------|--------|
| Accès stagiaires | Via interface formateur (collectif) | Pas de comptes stagiaires — présentiel projeté |
| Décisions | Formateur sélectionne pour la classe | Simple, focus sur l'animation pédagogique |
| Durée | Flexible, save/resume, rapport partiel | Adaptable à tous les emplois du temps |
| Génération entreprise | Tout au démarrage | Cohérence narrative maximale |
| Scénarios | Templates + enrichissement IA | Équilibre rapidité / variété |
| Architecture | Module intégré dans l'app existante | Réutilise référentiel, auth, UI existants |

---

## 3. Modèles de Données (Prisma)

### 3.1 Simulation

Configuration créée par le formateur. Peut avoir plusieurs runs.

```prisma
model Simulation {
  id                  String           @id @default(cuid())
  titre               String
  filiere             String           // Filiere.id du référentiel
  module              String           // RefModule.id
  niveau              String
  duree               String           // ex: "3h"
  nbStagiaires        Int
  difficulte          String           // DEBUTANT | INTERMEDIAIRE | AVANCE
  competencesCiblees  String[]         // Competence.id[]
  userId              String
  user                User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  company             VirtualCompany?
  runs                SimulationRun[]
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  @@index([userId])
}
```

### 3.2 VirtualCompany

Entreprise virtuelle générée par l'IA. Créée une seule fois par simulation.

```prisma
model VirtualCompany {
  id                  String     @id @default(cuid())
  simulationId        String     @unique
  simulation          Simulation @relation(fields: [simulationId], references: [id], onDelete: Cascade)
  nom                 String
  secteur             String
  description         String     @db.Text
  contexteEconomique  String     @db.Text
  organigramme        Json       // { postes: [{titre, responsable}] }
  personnages         Json       // PersonnageVirtuel[]
  clients             Json       // EntiteExterne[]
  fournisseurs        Json       // EntiteExterne[]
  documents           Json       // DocumentType[]
  problemesCles       String[]
  arcNarratif         Json       // EventTemplate[] ordonné (8-12 événements)
  createdAt           DateTime   @default(now())
}
```

**Types JSON :**
```typescript
// PersonnageVirtuel
{ nom: string; fonction: string; personnalite: string; objectifs: string; styleCommunication: string; niveauExigence: 'FAIBLE'|'MOYEN'|'ELEVE' }

// EntiteExterne
{ nom: string; type: 'CLIENT'|'FOURNISSEUR'; description: string; relation: string }

// DocumentType
{ type: string; titre: string; contenu: string }

// EventTemplate (arc narratif pré-généré)
{ ordre: number; templateType: string; titre: string; description: string; personnageImplique: string; choixA: Choix; choixB: Choix; choixC: Choix; documentAttache?: string }

// Choix
{ label: string; description: string; consequences: string; impactScore: number; impactSatisfaction: number; impactFinancier: number; impactMoral: number }
```

### 3.3 SimulationRun

Une session de jeu (save/resume).

```prisma
model SimulationRun {
  id              String          @id @default(cuid())
  simulationId    String
  simulation      Simulation      @relation(fields: [simulationId], references: [id], onDelete: Cascade)
  status          String          @default("EN_COURS") // EN_COURS | PAUSE | TERMINE
  score           Int             @default(100)
  satisfactionClient Int          @default(75)
  santeFinanciere Int             @default(75)
  moralEquipe     Int             @default(75)
  evenementCourant Int            @default(0)
  tempsTotal      Int             @default(0) // secondes
  startedAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  events          RunEvent[]
  report          SimulationReport?

  @@index([simulationId])
}
```

### 3.4 RunEvent

Chaque événement joué dans un run.

```prisma
model RunEvent {
  id                  String        @id @default(cuid())
  runId               String
  run                 SimulationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  ordre               Int
  templateType        String        // ERREUR_COMPTABLE | CONFLIT_INTERNE | etc.
  titre               String
  description         String        @db.Text
  contexte            String        @db.Text
  personnageImplique  String
  documentAttache     String?       @db.Text
  choixA              Json          // Choix
  choixB              Json
  choixC              Json
  decision            RunDecision?
  createdAt           DateTime      @default(now())

  @@index([runId])
}
```

### 3.5 RunDecision

La décision prise par la classe pour un événement.

```prisma
model RunDecision {
  id                  String    @id @default(cuid())
  eventId             String    @unique
  event               RunEvent  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  choixSelectionne    String    // A | B | C
  consequences        String    @db.Text
  impactScore         Int
  impactSatisfaction  Int
  impactFinancier     Int
  impactMoral         Int
  tempsReponse        Int       // secondes depuis affichage de l'événement
  createdAt           DateTime  @default(now())
}
```

### 3.6 SimulationReport

Rapport IA généré en fin de simulation.

```prisma
model SimulationReport {
  id                      String        @id @default(cuid())
  runId                   String        @unique
  run                     SimulationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  pointsForts             String[]
  erreurs                 String[]
  competencesMaitrisees   String[]
  competencesADevelopper  String[]
  conseils                String        @db.Text
  planAmelioration        String        @db.Text
  note                    Int           // 0-20
  justification           String        @db.Text
  createdAt               DateTime      @default(now())
}
```

---

## 4. Pages

### 4.1 `/simulator` — Liste des simulations

- Tableau : titre, filière, module, difficulté, nb runs, date création
- Bouton "Nouvelle simulation" → `/simulator/new`
- Par ligne : "Lancer un run" | "Voir les runs" | "Supprimer"
- Badge statut du dernier run (EN_COURS / PAUSE / TERMINÉ)

### 4.2 `/simulator/new` — Configuration

Layout 2 colonnes (cohérent avec les pages de génération existantes) :

**Colonne gauche — Formulaire :**
- Titre de la simulation
- Filière (dropdown depuis référentiel)
- Module (dropdown filtré selon filière)
- Niveau (1ère Année / 2ème Année / TS / TSS)
- Durée estimée (1h / 2h / 3h / 4h+)
- Nombre de stagiaires (slider 5-35)
- Difficulté (3 boutons : Débutant / Intermédiaire / Avancé)
- Compétences ciblées (multi-select depuis référentiel)
- Bouton "Générer l'entreprise"

**Colonne droite — Streaming :**
- Affichage progressif de la génération (SSE) :
  - Nom & logo textuel de l'entreprise
  - Secteur & description
  - Personnages (cards)
  - Scénarios planifiés (liste)
- Bouton "Sauvegarder & Lancer" une fois terminé

### 4.3 `/simulator/[id]` — Gestion de la simulation

- Fiche entreprise (nom, secteur, personnages)
- Liste des runs avec scores et statuts
- Bouton "Nouveau run"
- Bouton "Modifier" (ajouter événements custom)
- Statistiques agrégées (score moyen, taux bonnes décisions)

### 4.4 `/simulator/[id]/run/[runId]` — Interface de jeu (écran projeté)

**Header :**
- Nom entreprise + secteur
- 3 jauges : Satisfaction client / Santé financière / Moral équipe
- Score total + numéro événement (ex: "Événement 3/10")
- Timer live

**Zone centrale :**
- Carte événement :
  - Type (badge coloré selon catégorie)
  - Titre + description narrative
  - Avatar personnage impliqué + nom + fonction
  - Document attaché (si applicable, affiché en modal)
- 3 boutons de choix A/B/C (grandes cartes cliquables)

**Après décision :**
- Animation conséquences (indicateurs qui montent/descendent)
- Texte narratif des conséquences
- Bouton "Événement suivant"

**Sidebar droite :**
- Historique des décisions (accordéon)
- État de l'entreprise (jauges détaillées)
- Pause / Terminer la simulation

### 4.5 `/simulator/[id]/run/[runId]/rapport` — Rapport final

- Score global /100 avec visuel circulaire
- Tableau de bord : décisions prises, temps total, séquences jouées
- Section IA :
  - Points forts (liste verte)
  - Erreurs (liste rouge)
  - Compétences maîtrisées (badges)
  - Compétences à développer (badges orange)
  - Conseils (texte)
  - Plan d'amélioration (texte)
  - Note /20 avec justification
- Bouton "Exporter PDF"
- Bouton "Rejouer"

---

## 5. API Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/simulator` | Créer une simulation |
| GET | `/api/simulator` | Lister les simulations du formateur |
| GET | `/api/simulator/[id]` | Détail simulation + company + runs |
| DELETE | `/api/simulator/[id]` | Supprimer simulation |
| POST | `/api/simulator/generate` | **SSE** — générer VirtualCompany en streaming |
| POST | `/api/simulator/[id]/runs` | Créer un nouveau run |
| GET | `/api/simulator/[id]/runs/[runId]` | État du run courant |
| POST | `/api/simulator/[id]/runs/[runId]/decide` | Enregistrer une décision, calculer conséquences |
| PATCH | `/api/simulator/[id]/runs/[runId]/status` | Pause / Reprendre / Terminer |
| POST | `/api/simulator/[id]/runs/[runId]/report` | **SSE** — générer rapport IA |

---

## 6. Moteur IA

### 6.1 Génération entreprise (`src/lib/simulator/generator.ts`)

Prompt système : contexte OFPPT, filière, module, compétences ciblées, difficulté.

Génération en streaming JSON structuré. La réponse est parsée progressivement et affichée côté client via SSE.

Modèle : `claude-sonnet-4-6` (même modèle préféré que l'existant).

### 6.2 Templates de scénarios (`src/lib/simulator/templates.ts`)

15 templates hardcodés en JSON. Chaque template :

```typescript
interface ScenarioTemplate {
  type: string;
  categorie: 'FINANCIER' | 'OPERATIONNEL' | 'RH' | 'COMMERCIAL' | 'SECURITE';
  titre_generique: string;
  description_generique: string;
  personnage_type: string;   // ex: "Directeur Financier"
  document_type?: string;    // ex: "Facture fournisseur"
  variables: string[];       // variables à remplacer par l'IA
  niveaux: string[];         // DEBUTANT | INTERMEDIAIRE | AVANCE
}
```

L'IA reçoit le template + l'entreprise générée + le contexte courant (décisions précédentes, état jauges) → produit un événement narratif unique et cohérent.

### 6.3 Sélection des événements (`src/lib/simulator/engine.ts`)

Au démarrage, 8-12 templates sont sélectionnés selon :
- La filière (certains templates sont plus pertinents selon le secteur)
- La difficulté (les templates AVANCÉ incluent cyberattaque, audit fiscal...)
- Les compétences ciblées (un module comptabilité → plus de scénarios financiers)

La séquence est générée une fois avec l'entreprise et stockée dans `VirtualCompany.arcNarratif`.

### 6.4 Calcul des impacts (`src/lib/simulator/scoring.ts`)

Chaque choix a des impacts prédéfinis dans le template (±5 à ±20 points selon difficulté). Le moteur applique les impacts aux 4 indicateurs. Si satisfaction < 30 ou santé < 20 → événement de crise déclenché automatiquement.

### 6.5 Rapport IA (`src/lib/simulator/report.ts`)

Prompt : historique complet (entreprise + tous les événements + toutes les décisions + conséquences + scores finaux + compétences ciblées).

Sortie JSON : `{ pointsForts[], erreurs[], competencesMaitrisees[], competencesADevelopper[], conseils, planAmelioration, note, justification }`.

---

## 7. Navigation & Intégration UI

- Nouveau lien "Simulator" dans `NavSidebar.tsx` avec icône `Gamepad2` (Lucide)
- Charte OFPPT respectée : bleu `#0A4DA8` primaire, navy `#003087`, orange `#E8651A` accent
- Interface de jeu en plein écran possible (bouton expand) pour la projection
- Export PDF du rapport via `jsPDF` (bibliothèque déjà en place)

---

## 8. Migrations DB

Une seule migration additive (jamais `prisma migrate dev` sur PROD) :
- Ajouter les 6 nouveaux modèles
- Appliquer via `prisma db execute --url $DIRECT_URL` sur Supabase

---

## 9. Hors scope (version 1)

- Vote multi-appareils (smartphones stagiaires)
- Comptes stagiaires dédiés
- Simulation multi-groupes en temps réel
- Génération de documents PDF (factures, contrats) téléchargeables
- Marketplace de simulations entre formateurs
