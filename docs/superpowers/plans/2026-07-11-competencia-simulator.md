# Competencia Simulator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a virtual enterprise AI simulator module where trainers project scenarios, guide class decisions, and receive AI evaluation reports.

**Architecture:** 6 new Prisma models + lib engine layer (`src/lib/simulator/`) + 8 new API routes + 5 new pages, all integrated into the existing Next.js 16 app. Claude generates the full virtual company at startup; hardcoded templates define scenario types; scoring engine tracks 4 indicators.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL (Supabase), Anthropic SDK (direct), Tailwind CSS, NextAuth v5, jsPDF (existing)

## Global Constraints

- NEVER run `prisma migrate dev` on prod — use `prisma db execute --url $DIRECT_URL` for all schema changes
- After every task: `git add + commit + push` to trigger Vercel deploy
- Brand: blue `#0A4DA8` primary, navy `#003087` sidebar/institutional, orange `#E8651A` accent
- Auth: `import { auth } from '@/auth'` — check `session?.user?.id` in every API route
- Prisma: `import { prisma } from '@/lib/db'`
- Claude: `import Anthropic from '@anthropic-ai/sdk'` (direct, not via `@/lib/claude`)
- Model: `claude-sonnet-4-6` default; respect user's `preferredModel` if set
- French UI throughout; Moroccan context in AI-generated content

---

## File Map

**Create:**
```
src/lib/simulator/types.ts
src/lib/simulator/templates.ts
src/lib/simulator/engine.ts
src/lib/simulator/scoring.ts
src/lib/simulator/generator.ts
src/lib/simulator/report.ts
src/app/api/simulator/route.ts
src/app/api/simulator/generate/route.ts
src/app/api/simulator/[id]/route.ts
src/app/api/simulator/[id]/runs/route.ts
src/app/api/simulator/[id]/runs/[runId]/route.ts
src/app/api/simulator/[id]/runs/[runId]/decide/route.ts
src/app/api/simulator/[id]/runs/[runId]/status/route.ts
src/app/api/simulator/[id]/runs/[runId]/report/route.ts
src/app/simulator/page.tsx
src/app/simulator/new/page.tsx
src/app/simulator/[id]/page.tsx
src/app/simulator/[id]/run/[runId]/page.tsx
src/app/simulator/[id]/run/[runId]/rapport/page.tsx
```

**Modify:**
```
prisma/schema.prisma           (add 6 models + User.simulations relation)
src/components/ui/NavSidebar.tsx  (add Simulator nav section)
```

---

### Task 1: Prisma Schema — 6 New Models

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Simulation`, `VirtualCompany`, `SimulationRun`, `RunEvent`, `RunDecision`, `SimulationReport` Prisma models

- [ ] **Step 1: Add models to schema.prisma**

Add `simulations Simulation[]` to the existing `User` model, then append at the end of `prisma/schema.prisma`:

```prisma
// ─── Competencia Simulator ────────────────────────────────────────────────────

model Simulation {
  id                 String          @id @default(cuid())
  titre              String
  filiere            String
  module             String
  niveau             String
  duree              String
  nbStagiaires       Int
  difficulte         String          // DEBUTANT | INTERMEDIAIRE | AVANCE
  competencesCiblees String[]
  userId             String
  user               User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  company            VirtualCompany?
  runs               SimulationRun[]
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  @@index([userId])
}

model VirtualCompany {
  id                 String     @id @default(cuid())
  simulationId       String     @unique
  simulation         Simulation @relation(fields: [simulationId], references: [id], onDelete: Cascade)
  nom                String
  secteur            String
  description        String     @db.Text
  contexteEconomique String     @db.Text
  organigramme       Json
  personnages        Json
  clients            Json
  fournisseurs       Json
  documents          Json
  problemesCles      String[]
  arcNarratif        Json
  createdAt          DateTime   @default(now())
}

model SimulationRun {
  id                 String           @id @default(cuid())
  simulationId       String
  simulation         Simulation       @relation(fields: [simulationId], references: [id], onDelete: Cascade)
  status             String           @default("EN_COURS")
  score              Int              @default(100)
  satisfactionClient Int              @default(75)
  santeFinanciere    Int              @default(75)
  moralEquipe        Int              @default(75)
  evenementCourant   Int              @default(0)
  tempsTotal         Int              @default(0)
  startedAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  events             RunEvent[]
  report             SimulationReport?

  @@index([simulationId])
}

model RunEvent {
  id                 String        @id @default(cuid())
  runId              String
  run                SimulationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  ordre              Int
  templateType       String
  titre              String
  description        String        @db.Text
  contexte           String        @db.Text
  personnageImplique String
  documentAttache    String?       @db.Text
  choixA             Json
  choixB             Json
  choixC             Json
  decision           RunDecision?
  createdAt          DateTime      @default(now())

  @@index([runId])
}

model RunDecision {
  id                 String   @id @default(cuid())
  eventId            String   @unique
  event              RunEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  choixSelectionne   String
  consequences       String   @db.Text
  impactScore        Int
  impactSatisfaction Int
  impactFinancier    Int
  impactMoral        Int
  tempsReponse       Int
  createdAt          DateTime @default(now())
}

model SimulationReport {
  id                     String        @id @default(cuid())
  runId                  String        @unique
  run                    SimulationRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  pointsForts            String[]
  erreurs                String[]
  competencesMaitrisees  String[]
  competencesADevelopper String[]
  conseils               String        @db.Text
  planAmelioration       String        @db.Text
  note                   Int
  justification          String        @db.Text
  createdAt              DateTime      @default(now())
}
```

Also add `simulations Simulation[]` to the `User` model block.

- [ ] **Step 2: Apply migration to Supabase**

```bash
# In project root, with DIRECT_URL set in .env
npx prisma db execute --url "$DIRECT_URL" --stdin <<'SQL'
CREATE TABLE "Simulation" (
  "id" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "filiere" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "niveau" TEXT NOT NULL,
  "duree" TEXT NOT NULL,
  "nbStagiaires" INTEGER NOT NULL,
  "difficulte" TEXT NOT NULL,
  "competencesCiblees" TEXT[] DEFAULT '{}',
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Simulation_userId_idx" ON "Simulation"("userId");

CREATE TABLE "VirtualCompany" (
  "id" TEXT NOT NULL,
  "simulationId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "secteur" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contexteEconomique" TEXT NOT NULL,
  "organigramme" JSONB NOT NULL DEFAULT '{}',
  "personnages" JSONB NOT NULL DEFAULT '[]',
  "clients" JSONB NOT NULL DEFAULT '[]',
  "fournisseurs" JSONB NOT NULL DEFAULT '[]',
  "documents" JSONB NOT NULL DEFAULT '[]',
  "problemesCles" TEXT[] DEFAULT '{}',
  "arcNarratif" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VirtualCompany_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "VirtualCompany" ADD CONSTRAINT "VirtualCompany_simulationId_fkey"
  FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "VirtualCompany_simulationId_key" ON "VirtualCompany"("simulationId");

CREATE TABLE "SimulationRun" (
  "id" TEXT NOT NULL,
  "simulationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'EN_COURS',
  "score" INTEGER NOT NULL DEFAULT 100,
  "satisfactionClient" INTEGER NOT NULL DEFAULT 75,
  "santeFinanciere" INTEGER NOT NULL DEFAULT 75,
  "moralEquipe" INTEGER NOT NULL DEFAULT 75,
  "evenementCourant" INTEGER NOT NULL DEFAULT 0,
  "tempsTotal" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_simulationId_fkey"
  FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "SimulationRun_simulationId_idx" ON "SimulationRun"("simulationId");

CREATE TABLE "RunEvent" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "ordre" INTEGER NOT NULL,
  "templateType" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contexte" TEXT NOT NULL,
  "personnageImplique" TEXT NOT NULL,
  "documentAttache" TEXT,
  "choixA" JSONB NOT NULL DEFAULT '{}',
  "choixB" JSONB NOT NULL DEFAULT '{}',
  "choixC" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RunEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RunEvent" ADD CONSTRAINT "RunEvent_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "SimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RunEvent_runId_idx" ON "RunEvent"("runId");

CREATE TABLE "RunDecision" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "choixSelectionne" TEXT NOT NULL,
  "consequences" TEXT NOT NULL,
  "impactScore" INTEGER NOT NULL,
  "impactSatisfaction" INTEGER NOT NULL,
  "impactFinancier" INTEGER NOT NULL,
  "impactMoral" INTEGER NOT NULL,
  "tempsReponse" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RunDecision_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RunDecision" ADD CONSTRAINT "RunDecision_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "RunEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "RunDecision_eventId_key" ON "RunDecision"("eventId");

CREATE TABLE "SimulationReport" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "pointsForts" TEXT[] DEFAULT '{}',
  "erreurs" TEXT[] DEFAULT '{}',
  "competencesMaitrisees" TEXT[] DEFAULT '{}',
  "competencesADevelopper" TEXT[] DEFAULT '{}',
  "conseils" TEXT NOT NULL,
  "planAmelioration" TEXT NOT NULL,
  "note" INTEGER NOT NULL,
  "justification" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationReport_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SimulationReport" ADD CONSTRAINT "SimulationReport_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "SimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SimulationReport_runId_key" ON "SimulationReport"("runId");
SQL
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with new model types visible.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(simulator): add 6 Prisma models for Competencia Simulator"
git push
```

---

### Task 2: Shared Types + Scenario Templates

**Files:**
- Create: `src/lib/simulator/types.ts`
- Create: `src/lib/simulator/templates.ts`

**Interfaces:**
- Produces: `Choix`, `PersonnageVirtuel`, `EntiteExterne`, `DocumentVirtuel`, `EvenementNarratif`, `EntrepriseVirtuelle`, `SimulatorConfig`, `ScenarioTemplate`, `Difficulte`, `RunStatus`

- [ ] **Step 1: Create src/lib/simulator/types.ts**

```typescript
export interface Choix {
  label: string;
  description: string;
  consequences: string;
  impactScore: number;
  impactSatisfaction: number;
  impactFinancier: number;
  impactMoral: number;
}

export interface PersonnageVirtuel {
  nom: string;
  fonction: string;
  personnalite: string;
  objectifs: string;
  styleCommunication: string;
  niveauExigence: 'FAIBLE' | 'MOYEN' | 'ELEVE';
}

export interface EntiteExterne {
  nom: string;
  type: 'CLIENT' | 'FOURNISSEUR';
  description: string;
  relation: string;
}

export interface DocumentVirtuel {
  type: string;
  titre: string;
  contenu: string;
}

export interface EvenementNarratif {
  ordre: number;
  templateType: string;
  titre: string;
  description: string;
  contexte: string;
  personnageImplique: string;
  documentAttache?: string;
  choixA: Choix;
  choixB: Choix;
  choixC: Choix;
}

export interface EntrepriseVirtuelle {
  nom: string;
  secteur: string;
  description: string;
  contexteEconomique: string;
  organigramme: { postes: Array<{ titre: string; responsable: string }> };
  personnages: PersonnageVirtuel[];
  clients: EntiteExterne[];
  fournisseurs: EntiteExterne[];
  documents: DocumentVirtuel[];
  problemesCles: string[];
  arcNarratif: EvenementNarratif[];
}

export type Difficulte = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE';
export type RunStatus = 'EN_COURS' | 'PAUSE' | 'TERMINE';
export type ChoixLettre = 'A' | 'B' | 'C';

export interface SimulatorConfig {
  filiere: string;
  module: string;
  niveau: string;
  duree: string;
  nbStagiaires: number;
  difficulte: Difficulte;
  competencesCiblees: string[];
}

export interface ScenarioTemplate {
  type: string;
  categorie: 'FINANCIER' | 'OPERATIONNEL' | 'RH' | 'COMMERCIAL' | 'SECURITE';
  titre_generique: string;
  personnage_type: string;
  document_type?: string;
  niveaux: Difficulte[];
}
```

- [ ] **Step 2: Create src/lib/simulator/templates.ts**

```typescript
import type { ScenarioTemplate } from './types';

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    type: 'ERREUR_COMPTABLE',
    categorie: 'FINANCIER',
    titre_generique: 'Erreur dans les comptes',
    personnage_type: 'Comptable / Directeur Financier',
    document_type: 'Relevé de compte',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'RETARD_PAIEMENT',
    categorie: 'FINANCIER',
    titre_generique: 'Retard de paiement client',
    personnage_type: 'Responsable Commercial',
    document_type: 'Facture en souffrance',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'CONTROLE_FISCAL',
    categorie: 'FINANCIER',
    titre_generique: 'Contrôle fiscal annoncé',
    personnage_type: 'Directeur Général',
    document_type: 'Avis de contrôle',
    niveaux: ['INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'PANNE_RESEAU',
    categorie: 'OPERATIONNEL',
    titre_generique: 'Panne réseau / système',
    personnage_type: 'Responsable Informatique',
    document_type: 'Ticket incident',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'RUPTURE_STOCK',
    categorie: 'OPERATIONNEL',
    titre_generique: 'Rupture de stock critique',
    personnage_type: 'Responsable Logistique',
    document_type: 'Fiche stock',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'RETARD_FOURNISSEUR',
    categorie: 'OPERATIONNEL',
    titre_generique: 'Retard de livraison fournisseur',
    personnage_type: 'Responsable Achats',
    document_type: 'Bon de commande',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'CONFLIT_INTERNE',
    categorie: 'RH',
    titre_generique: 'Conflit entre collaborateurs',
    personnage_type: 'Responsable RH',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'ACCIDENT_TRAVAIL',
    categorie: 'RH',
    titre_generique: 'Accident de travail',
    personnage_type: 'Responsable Sécurité',
    document_type: 'Déclaration accident',
    niveaux: ['INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'RECRUTEMENT_URGENT',
    categorie: 'RH',
    titre_generique: 'Besoin de recrutement urgent',
    personnage_type: 'Directeur / RH',
    document_type: "Offre d'emploi",
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'PROBLEME_DISCIPLINAIRE',
    categorie: 'RH',
    titre_generique: 'Problème disciplinaire employé',
    personnage_type: 'Responsable RH',
    document_type: 'Mise en demeure',
    niveaux: ['INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'CLIENT_MECONTENT',
    categorie: 'COMMERCIAL',
    titre_generique: 'Client mécontent / réclamation',
    personnage_type: 'Responsable Commercial',
    document_type: 'Courrier de réclamation',
    niveaux: ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'NEGOCIATION',
    categorie: 'COMMERCIAL',
    titre_generique: 'Négociation commerciale',
    personnage_type: 'Directeur Commercial',
    document_type: 'Contrat commercial',
    niveaux: ['INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'AUDIT_QUALITE',
    categorie: 'COMMERCIAL',
    titre_generique: 'Audit qualité / certification',
    personnage_type: 'Responsable Qualité',
    document_type: "Rapport d'audit",
    niveaux: ['INTERMEDIAIRE', 'AVANCE'],
  },
  {
    type: 'CYBERATTAQUE',
    categorie: 'SECURITE',
    titre_generique: 'Cyberattaque / ransomware',
    personnage_type: 'Responsable Informatique',
    document_type: 'Rapport incident sécurité',
    niveaux: ['AVANCE'],
  },
  {
    type: 'INCIDENT_SECURITE',
    categorie: 'SECURITE',
    titre_generique: 'Incident de sécurité physique',
    personnage_type: 'Responsable Sécurité',
    document_type: "Rapport d'incident",
    niveaux: ['INTERMEDIAIRE', 'AVANCE'],
  },
];
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/simulator/types.ts src/lib/simulator/templates.ts
git commit -m "feat(simulator): shared types and 15 scenario templates"
git push
```

---

### Task 3: Engine + Scoring

**Files:**
- Create: `src/lib/simulator/engine.ts`
- Create: `src/lib/simulator/scoring.ts`

**Interfaces:**
- Consumes: `ScenarioTemplate`, `SimulatorConfig`, `Difficulte` from `./types`; `SCENARIO_TEMPLATES` from `./templates`
- Produces: `selectTemplates(config): ScenarioTemplate[]`, `buildTemplateList(templates): string`, `applyDecision(state, choix): RunState`, `isCrisis(state): boolean`

- [ ] **Step 1: Create src/lib/simulator/engine.ts**

```typescript
import { SCENARIO_TEMPLATES } from './templates';
import type { ScenarioTemplate, SimulatorConfig } from './types';

export function selectTemplates(config: SimulatorConfig): ScenarioTemplate[] {
  const eligible = SCENARIO_TEMPLATES.filter(t =>
    t.niveaux.includes(config.difficulte)
  );

  const categories = [...new Set(eligible.map(t => t.categorie))] as string[];
  const selected: ScenarioTemplate[] = [];

  // Pick one from each category to ensure variety
  for (const cat of categories) {
    const pool = eligible.filter(t => t.categorie === cat);
    selected.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Fill up to target count
  const target = config.difficulte === 'AVANCE' ? 10 : config.difficulte === 'INTERMEDIAIRE' ? 9 : 8;
  const remaining = eligible.filter(t => !selected.includes(t));

  while (selected.length < target && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    selected.push(...remaining.splice(idx, 1));
  }

  // Shuffle to avoid predictable ordering by category
  return selected.sort(() => Math.random() - 0.5);
}

export function buildTemplateList(templates: ScenarioTemplate[]): string {
  return templates
    .map((t, i) => `${i + 1}. ${t.type} (${t.categorie}) — ${t.titre_generique}`)
    .join('\n');
}
```

- [ ] **Step 2: Create src/lib/simulator/scoring.ts**

```typescript
import type { Choix } from './types';

export interface RunState {
  score: number;
  satisfactionClient: number;
  santeFinanciere: number;
  moralEquipe: number;
}

export function applyDecision(state: RunState, choix: Choix): RunState {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return {
    score: clamp(state.score + choix.impactScore),
    satisfactionClient: clamp(state.satisfactionClient + choix.impactSatisfaction),
    santeFinanciere: clamp(state.santeFinanciere + choix.impactFinancier),
    moralEquipe: clamp(state.moralEquipe + choix.impactMoral),
  };
}

export function isCrisis(state: RunState): boolean {
  return state.satisfactionClient < 30 || state.santeFinanciere < 20;
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/simulator/engine.ts src/lib/simulator/scoring.ts
git commit -m "feat(simulator): engine template selector and scoring utils"
git push
```

---

### Task 4: AI Generator + AI Report

**Files:**
- Create: `src/lib/simulator/generator.ts`
- Create: `src/lib/simulator/report.ts`

**Interfaces:**
- Consumes: `SimulatorConfig`, `EntrepriseVirtuelle` from `./types`; `selectTemplates`, `buildTemplateList` from `./engine`
- Produces: `generateEntreprise(config, apiKey, model?): Promise<EntrepriseVirtuelle>`, `streamGenerate(config, apiKey, model?): AsyncGenerator<string>`, `generateReport(input, apiKey, model?): Promise<ReportData>`

- [ ] **Step 1: Create src/lib/simulator/generator.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { selectTemplates, buildTemplateList } from './engine';
import type { SimulatorConfig, EntrepriseVirtuelle } from './types';

function buildPrompt(config: SimulatorConfig): string {
  const templates = selectTemplates(config);
  const templateList = buildTemplateList(templates);

  return `Tu es un générateur d'entreprises virtuelles pour des simulations pédagogiques OFPPT au Maroc.

Génère une entreprise fictive COMPLÈTE pour :
- Filière : ${config.filiere}
- Module : ${config.module}
- Niveau : ${config.niveau}
- Durée simulation : ${config.duree}
- Difficulté : ${config.difficulte}
- Stagiaires : ${config.nbStagiaires}

Types d'événements à intégrer (dans cet ordre dans arcNarratif) :
${templateList}

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte avant/après) :

{
  "nom": "Nom entreprise marocaine fictive",
  "secteur": "Secteur lié à ${config.filiere}",
  "description": "Description 3-4 phrases",
  "contexteEconomique": "Contexte économique 2-3 phrases",
  "organigramme": {"postes": [{"titre": "...", "responsable": "Prénom Nom"}]},
  "personnages": [
    {
      "nom": "Prénom Nom",
      "fonction": "Fonction",
      "personnalite": "Description personnalité",
      "objectifs": "Objectifs professionnels",
      "styleCommunication": "Style de communication",
      "niveauExigence": "MOYEN"
    }
  ],
  "clients": [{"nom": "...", "type": "CLIENT", "description": "...", "relation": "..."}],
  "fournisseurs": [{"nom": "...", "type": "FOURNISSEUR", "description": "...", "relation": "..."}],
  "documents": [{"type": "Facture", "titre": "...", "contenu": "..."}],
  "problemesCles": ["Problème 1", "Problème 2"],
  "arcNarratif": [
    {
      "ordre": 1,
      "templateType": "TYPE_EXACT_DU_TEMPLATE",
      "titre": "Titre événement",
      "description": "Description narrative immersive 2-3 paragraphes",
      "contexte": "Contexte additionnel",
      "personnageImplique": "Nom du personnage",
      "documentAttache": "Contenu document si applicable (sinon omettre)",
      "choixA": {"label": "A — Courte étiquette", "description": "Description choix A", "consequences": "Conséquences si A choisi", "impactScore": 15, "impactSatisfaction": 10, "impactFinancier": 8, "impactMoral": 10},
      "choixB": {"label": "B — ...", "description": "...", "consequences": "...", "impactScore": 0, "impactSatisfaction": 0, "impactFinancier": 0, "impactMoral": 0},
      "choixC": {"label": "C — ...", "description": "...", "consequences": "...", "impactScore": -15, "impactSatisfaction": -10, "impactFinancier": -8, "impactMoral": -10}
    }
  ]
}

Règles :
- 5-6 personnages ; 3-4 clients ; 2-3 fournisseurs ; 2-3 documents
- ${templates.length} événements dans arcNarratif
- choixA = meilleure décision (+), choixB = neutre (0±3), choixC = mauvaise décision (-)
- Impacts : ±5 à ±20 selon gravité
- Noms marocains réalistes (entreprises, personnes, villes)
- Filière et module intégrés dans le contexte
- Langue française`;
}

function parseJson(raw: string): EntrepriseVirtuelle {
  const clean = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean) as EntrepriseVirtuelle;
}

export async function generateEntreprise(
  config: SimulatorConfig,
  apiKey: string,
  model = 'claude-sonnet-4-6'
): Promise<EntrepriseVirtuelle> {
  const client = new Anthropic({ apiKey });
  let fullText = '';
  const stream = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(config) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }
  return parseJson(fullText);
}

export async function* streamGenerate(
  config: SimulatorConfig,
  apiKey: string,
  model = 'claude-sonnet-4-6'
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(config) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
```

- [ ] **Step 2: Create src/lib/simulator/report.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { EntrepriseVirtuelle } from './types';

export interface ReportInput {
  entreprise: EntrepriseVirtuelle;
  decisions: Array<{
    ordre: number;
    titre: string;
    choixSelectionne: string;
    choixLabel: string;
    consequences: string;
    impactScore: number;
  }>;
  scoresFinal: {
    score: number;
    satisfactionClient: number;
    santeFinanciere: number;
    moralEquipe: number;
  };
  competencesCiblees: string[];
  difficulte: string;
}

export interface ReportData {
  pointsForts: string[];
  erreurs: string[];
  competencesMaitrisees: string[];
  competencesADevelopper: string[];
  conseils: string;
  planAmelioration: string;
  note: number;
  justification: string;
}

function buildReportPrompt(input: ReportInput): string {
  const decisionsText = input.decisions
    .map(d => `Événement ${d.ordre}: "${d.titre}" → Choix ${d.choixSelectionne} (${d.choixLabel}) | Impact: ${d.impactScore > 0 ? '+' : ''}${d.impactScore}`)
    .join('\n');

  const noteBase = Math.round(input.scoresFinal.score * 0.2);

  return `Tu es un évaluateur pédagogique OFPPT. Analyse cette simulation professionnelle.

ENTREPRISE : ${input.entreprise.nom} (${input.entreprise.secteur})

DÉCISIONS :
${decisionsText}

SCORES FINAUX :
- Score global : ${input.scoresFinal.score}/100
- Satisfaction client : ${input.scoresFinal.satisfactionClient}/100
- Santé financière : ${input.scoresFinal.santeFinanciere}/100
- Moral équipe : ${input.scoresFinal.moralEquipe}/100

COMPÉTENCES CIBLÉES : ${input.competencesCiblees.join(', ') || 'Non spécifiées'}
DIFFICULTÉ : ${input.difficulte}

Génère un rapport d'évaluation en JSON valide (sans markdown) :

{
  "pointsForts": ["3 points forts observés"],
  "erreurs": ["2-3 erreurs ou décisions sous-optimales"],
  "competencesMaitrisees": ["Compétences démontrées"],
  "competencesADevelopper": ["Compétences à améliorer"],
  "conseils": "Conseils détaillés en 3-4 paragraphes",
  "planAmelioration": "Plan concret en 4-5 étapes numérotées",
  "note": ${noteBase},
  "justification": "Justification de la note en 2-3 phrases"
}

La note /20 doit être cohérente avec le score ${input.scoresFinal.score}/100 (base ≈${noteBase}/20, ajustée selon qualité des décisions).`;
}

export async function generateReport(
  input: ReportInput,
  apiKey: string,
  model = 'claude-sonnet-4-6'
): Promise<ReportData> {
  const client = new Anthropic({ apiKey });
  let fullText = '';
  const stream = await client.messages.create({
    model,
    max_tokens: 3000,
    messages: [{ role: 'user', content: buildReportPrompt(input) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }
  const clean = fullText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean) as ReportData;
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/simulator/generator.ts src/lib/simulator/report.ts
git commit -m "feat(simulator): AI generator and report lib"
git push
```

---

### Task 5: API Routes — Simulation CRUD + Generate + Runs

**Files:**
- Create: `src/app/api/simulator/route.ts`
- Create: `src/app/api/simulator/generate/route.ts`
- Create: `src/app/api/simulator/[id]/route.ts`
- Create: `src/app/api/simulator/[id]/runs/route.ts`

**Interfaces:**
- Consumes: `prisma`, `auth`, `streamGenerate` from `@/lib/simulator/generator`, `EvenementNarratif` from `@/lib/simulator/types`
- Produces: REST endpoints for simulation + run lifecycle

- [ ] **Step 1: Create src/app/api/simulator/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulations = await prisma.simulation.findMany({
    where: { userId: session.user.id },
    include: {
      company: { select: { nom: true, secteur: true } },
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { status: true, score: true, startedAt: true },
      },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(simulations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const { titre, filiere, module, niveau, duree, nbStagiaires, difficulte, competencesCiblees } = body;

  if (!titre || !filiere || !module) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const simulation = await prisma.simulation.create({
    data: {
      titre,
      filiere,
      module,
      niveau: niveau ?? '',
      duree: duree ?? '2h',
      nbStagiaires: nbStagiaires ?? 20,
      difficulte: difficulte ?? 'INTERMEDIAIRE',
      competencesCiblees: competencesCiblees ?? [],
      userId: session.user.id,
    },
  });

  return NextResponse.json(simulation, { status: 201 });
}
```

- [ ] **Step 2: Create src/app/api/simulator/generate/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { streamGenerate } from '@/lib/simulator/generator';
import type { EntrepriseVirtuelle } from '@/lib/simulator/types';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const { simulationId, filiere, module, niveau, duree, nbStagiaires, difficulte, competencesCiblees } = body;

  if (!simulationId) return NextResponse.json({ error: 'simulationId manquant' }, { status: 400 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Simulation introuvable' }, { status: 404 });

  const userKeys = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { claudeApiKey: true, preferredModel: true },
  });
  const apiKey = userKeys?.claudeApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Clé Claude manquante' }, { status: 400 });

  const model = userKeys?.preferredModel?.startsWith('claude') ? userKeys.preferredModel : 'claude-sonnet-4-6';

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        let fullText = '';
        for await (const chunk of streamGenerate(
          { filiere, module, niveau, duree, nbStagiaires, difficulte, competencesCiblees },
          apiKey,
          model
        )) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        const clean = fullText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const entreprise = JSON.parse(clean) as EntrepriseVirtuelle;

        await prisma.virtualCompany.upsert({
          where: { simulationId },
          update: {
            nom: entreprise.nom,
            secteur: entreprise.secteur,
            description: entreprise.description,
            contexteEconomique: entreprise.contexteEconomique,
            organigramme: entreprise.organigramme as object,
            personnages: entreprise.personnages as object,
            clients: entreprise.clients as object,
            fournisseurs: entreprise.fournisseurs as object,
            documents: entreprise.documents as object,
            problemesCles: entreprise.problemesCles,
            arcNarratif: entreprise.arcNarratif as object,
          },
          create: {
            simulationId,
            nom: entreprise.nom,
            secteur: entreprise.secteur,
            description: entreprise.description,
            contexteEconomique: entreprise.contexteEconomique,
            organigramme: entreprise.organigramme as object,
            personnages: entreprise.personnages as object,
            clients: entreprise.clients as object,
            fournisseurs: entreprise.fournisseurs as object,
            documents: entreprise.documents as object,
            problemesCles: entreprise.problemesCles,
            arcNarratif: entreprise.arcNarratif as object,
          },
        });

        controller.enqueue(encoder.encode(`\n[[DONE]]${JSON.stringify({ simulationId })}`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur génération';
        controller.enqueue(encoder.encode(`[[ERROR]]${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
```

- [ ] **Step 3: Create src/app/api/simulator/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      company: true,
      runs: {
        orderBy: { startedAt: 'desc' },
        include: { report: { select: { note: true } } },
      },
    },
  });

  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(simulation);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.simulation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create src/app/api/simulator/[id]/runs/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { EvenementNarratif } from '@/lib/simulator/types';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const runs = await prisma.simulationRun.findMany({
    where: { simulationId: params.id },
    orderBy: { startedAt: 'desc' },
    include: { report: { select: { note: true } } },
  });

  return NextResponse.json(runs);
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { company: true },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  if (!simulation.company) return NextResponse.json({ error: "Générez d'abord l'entreprise" }, { status: 400 });

  const arc = simulation.company.arcNarratif as unknown as EvenementNarratif[];

  const run = await prisma.simulationRun.create({
    data: { simulationId: params.id },
  });

  // Instantiate all RunEvents from arcNarratif
  await prisma.runEvent.createMany({
    data: arc.map(ev => ({
      runId: run.id,
      ordre: ev.ordre,
      templateType: ev.templateType,
      titre: ev.titre,
      description: ev.description,
      contexte: ev.contexte,
      personnageImplique: ev.personnageImplique,
      documentAttache: ev.documentAttache ?? null,
      choixA: ev.choixA as object,
      choixB: ev.choixB as object,
      choixC: ev.choixC as object,
    })),
  });

  return NextResponse.json(run, { status: 201 });
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/simulator/
git commit -m "feat(simulator): API routes for simulation CRUD, generate SSE, run creation"
git push
```

---

### Task 6: API Routes — Decide, Status, Report

**Files:**
- Create: `src/app/api/simulator/[id]/runs/[runId]/route.ts`
- Create: `src/app/api/simulator/[id]/runs/[runId]/decide/route.ts`
- Create: `src/app/api/simulator/[id]/runs/[runId]/status/route.ts`
- Create: `src/app/api/simulator/[id]/runs/[runId]/report/route.ts`

**Interfaces:**
- Consumes: `applyDecision`, `RunState` from `@/lib/simulator/scoring`; `generateReport`, `ReportInput` from `@/lib/simulator/report`; `Choix`, `EvenementNarratif` from `@/lib/simulator/types`
- Produces: REST + SSE endpoints for game loop and report generation

- [ ] **Step 1: Create src/app/api/simulator/[id]/runs/[runId]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const run = await prisma.simulationRun.findFirst({
    where: { id: params.runId, simulationId: params.id },
    include: {
      events: {
        orderBy: { ordre: 'asc' },
        include: { decision: true },
      },
      report: true,
    },
  });

  if (!run) return NextResponse.json({ error: 'Run introuvable' }, { status: 404 });
  return NextResponse.json(run);
}
```

- [ ] **Step 2: Create src/app/api/simulator/[id]/runs/[runId]/decide/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { applyDecision } from '@/lib/simulator/scoring';
import type { Choix } from '@/lib/simulator/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const run = await prisma.simulationRun.findFirst({
    where: { id: params.runId, simulationId: params.id },
  });
  if (!run) return NextResponse.json({ error: 'Run introuvable' }, { status: 404 });
  if (run.status === 'TERMINE') return NextResponse.json({ error: 'Run terminé' }, { status: 400 });

  const { eventId, choixSelectionne, tempsReponse } = await req.json();
  if (!eventId || !['A', 'B', 'C'].includes(choixSelectionne)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const event = await prisma.runEvent.findFirst({
    where: { id: eventId, runId: params.runId },
  });
  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });

  const choixMap: Record<string, Choix> = {
    A: event.choixA as unknown as Choix,
    B: event.choixB as unknown as Choix,
    C: event.choixC as unknown as Choix,
  };
  const choix = choixMap[choixSelectionne];

  // Apply scoring
  const newState = applyDecision(
    {
      score: run.score,
      satisfactionClient: run.satisfactionClient,
      santeFinanciere: run.santeFinanciere,
      moralEquipe: run.moralEquipe,
    },
    choix
  );

  const totalEvents = await prisma.runEvent.count({ where: { runId: params.runId } });
  const nextEvenement = run.evenementCourant + 1;
  const isLast = nextEvenement >= totalEvents;

  const [decision, updatedRun] = await prisma.$transaction([
    prisma.runDecision.create({
      data: {
        eventId,
        choixSelectionne,
        consequences: choix.consequences,
        impactScore: choix.impactScore,
        impactSatisfaction: choix.impactSatisfaction,
        impactFinancier: choix.impactFinancier,
        impactMoral: choix.impactMoral,
        tempsReponse: tempsReponse ?? 0,
      },
    }),
    prisma.simulationRun.update({
      where: { id: params.runId },
      data: {
        ...newState,
        evenementCourant: nextEvenement,
        status: isLast ? 'TERMINE' : 'EN_COURS',
      },
    }),
  ]);

  return NextResponse.json({ decision, run: updatedRun, isLast });
}
```

- [ ] **Step 3: Create src/app/api/simulator/[id]/runs/[runId]/status/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const { status, tempsTotal } = await req.json();
  if (!['EN_COURS', 'PAUSE', 'TERMINE'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  const run = await prisma.simulationRun.update({
    where: { id: params.runId },
    data: { status, ...(tempsTotal !== undefined ? { tempsTotal } : {}) },
  });

  return NextResponse.json(run);
}
```

- [ ] **Step 4: Create src/app/api/simulator/[id]/runs/[runId]/report/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateReport } from '@/lib/simulator/report';
import type { EntrepriseVirtuelle, EvenementNarratif } from '@/lib/simulator/types';

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { company: true },
  });
  if (!simulation?.company) return NextResponse.json({ error: 'Simulation introuvable' }, { status: 404 });

  const run = await prisma.simulationRun.findFirst({
    where: { id: params.runId, simulationId: params.id },
    include: {
      events: { orderBy: { ordre: 'asc' }, include: { decision: true } },
      report: true,
    },
  });
  if (!run) return NextResponse.json({ error: 'Run introuvable' }, { status: 404 });

  // Return cached report if already generated
  if (run.report) return NextResponse.json(run.report);

  const userKeys = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { claudeApiKey: true, preferredModel: true },
  });
  const apiKey = userKeys?.claudeApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Clé Claude manquante' }, { status: 400 });

  const model = userKeys?.preferredModel?.startsWith('claude') ? userKeys.preferredModel : 'claude-sonnet-4-6';
  const entreprise = simulation.company as unknown as EntrepriseVirtuelle;

  const decisions = run.events
    .filter(ev => ev.decision)
    .map(ev => {
      const choixMap: Record<string, { label: string }> = {
        A: ev.choixA as unknown as { label: string },
        B: ev.choixB as unknown as { label: string },
        C: ev.choixC as unknown as { label: string },
      };
      return {
        ordre: ev.ordre,
        titre: ev.titre,
        choixSelectionne: ev.decision!.choixSelectionne,
        choixLabel: choixMap[ev.decision!.choixSelectionne]?.label ?? '',
        consequences: ev.decision!.consequences,
        impactScore: ev.decision!.impactScore,
      };
    });

  const reportData = await generateReport(
    {
      entreprise,
      decisions,
      scoresFinal: {
        score: run.score,
        satisfactionClient: run.satisfactionClient,
        santeFinanciere: run.santeFinanciere,
        moralEquipe: run.moralEquipe,
      },
      competencesCiblees: simulation.competencesCiblees,
      difficulte: simulation.difficulte,
    },
    apiKey,
    model
  );

  const report = await prisma.simulationReport.create({
    data: {
      runId: params.runId,
      ...reportData,
    },
  });

  return NextResponse.json(report);
}
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/simulator/
git commit -m "feat(simulator): API routes for decisions, status, report"
git push
```

---

### Task 7: Pages — List + New Simulation

**Files:**
- Create: `src/app/simulator/page.tsx`
- Create: `src/app/simulator/new/page.tsx`

**Interfaces:**
- Consumes: `/api/simulator` GET/POST, `/api/simulator/generate` POST (streaming), `/api/referentiel/structure` GET (existing route for filières/modules)
- Produces: `/simulator` list page, `/simulator/new` config + generation form

- [ ] **Step 1: Create src/app/simulator/page.tsx**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SimulationItem {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  difficulte: string;
  company: { nom: string; secteur: string } | null;
  runs: Array<{ status: string; score: number; startedAt: string }>;
  _count: { runs: number };
  createdAt: string;
}

const DIFF_COLORS: Record<string, string> = {
  DEBUTANT: '#22C55E',
  INTERMEDIAIRE: '#F59E0B',
  AVANCE: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  PAUSE: 'En pause',
  TERMINE: 'Terminé',
};

export default function SimulatorListPage() {
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/simulator')
      .then(r => r.json())
      .then(data => { setSimulations(data); setLoading(false); });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette simulation ?')) return;
    await fetch(`/api/simulator/${id}`, { method: 'DELETE' });
    setSimulations(prev => prev.filter(s => s.id !== id));
  }

  async function handleNewRun(id: string) {
    const res = await fetch(`/api/simulator/${id}/runs`, { method: 'POST' });
    const run = await res.json();
    router.push(`/simulator/${id}/run/${run.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#003087' }}>Competencia Simulator</h1>
          <p className="text-sm text-gray-500 mt-1">Entreprises virtuelles IA pour vos classes</p>
        </div>
        <Link
          href="/simulator/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
          style={{ background: '#0A4DA8' }}
        >
          + Nouvelle simulation
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Chargement...</div>
      ) : simulations.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-4xl mb-3">🎮</div>
          <div className="text-lg font-medium text-gray-600">Aucune simulation</div>
          <div className="text-sm text-gray-400 mt-1 mb-4">Créez votre première entreprise virtuelle</div>
          <Link
            href="/simulator/new"
            className="inline-flex px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: '#0A4DA8' }}
          >
            Créer une simulation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map(sim => {
            const lastRun = sim.runs[0];
            return (
              <div
                key={sim.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{sim.titre}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: DIFF_COLORS[sim.difficulte] ?? '#6B7280' }}
                    >
                      {sim.difficulte}
                    </span>
                    {lastRun && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {STATUS_LABELS[lastRun.status]}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {sim.company?.nom ?? 'Entreprise non générée'} · {sim.filiere} / {sim.module}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {sim._count.runs} run{sim._count.runs !== 1 ? 's' : ''}
                    {lastRun ? ` · Dernier score : ${lastRun.score}/100` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {sim.company ? (
                    <button
                      onClick={() => handleNewRun(sim.id)}
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors"
                      style={{ background: '#0A4DA8' }}
                    >
                      ▶ Lancer
                    </button>
                  ) : (
                    <Link
                      href={`/simulator/new?regenerate=${sim.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ borderColor: '#0A4DA8', color: '#0A4DA8' }}
                    >
                      Générer
                    </Link>
                  )}
                  <Link
                    href={`/simulator/${sim.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
                  >
                    Détails
                  </Link>
                  <button
                    onClick={() => handleDelete(sim.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create src/app/simulator/new/page.tsx**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Filiere { id: string; nom: string; filiere: string | null; modules: Array<{ id: string; nom: string; code: string | null }> }

const NIVEAUX = ['1ère Année', '2ème Année', 'Technicien', 'Technicien Spécialisé'];
const DUREES = ['1h', '2h', '3h', '4h+'];
const DIFFICULTES = [
  { value: 'DEBUTANT', label: 'Débutant', color: '#22C55E' },
  { value: 'INTERMEDIAIRE', label: 'Intermédiaire', color: '#F59E0B' },
  { value: 'AVANCE', label: 'Avancé', color: '#EF4444' },
];

export default function NewSimulationPage() {
  const router = useRouter();
  const streamRef = useRef<HTMLDivElement>(null);

  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [form, setForm] = useState({
    titre: '',
    filiere: '',
    filiereId: '',
    module: '',
    moduleId: '',
    niveau: NIVEAUX[0],
    duree: '2h',
    nbStagiaires: 20,
    difficulte: 'INTERMEDIAIRE',
    competencesCiblees: [] as string[],
  });
  const [step, setStep] = useState<'form' | 'generating' | 'done'>('form');
  const [streamText, setStreamText] = useState('');
  const [simulationId, setSimulationId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/referentiel/structure').then(r => r.json()).then(setFilieres).catch(() => {});
  }, []);

  const selectedFiliere = filieres.find(f => f.id === form.filiereId);

  async function handleGenerate() {
    if (!form.titre || !form.filiere) { setError('Titre et filière requis'); return; }
    setError('');
    setStep('generating');
    setStreamText('');

    // Create simulation first
    const createRes = await fetch('/api/simulator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: form.titre,
        filiere: form.filiere,
        module: form.module,
        niveau: form.niveau,
        duree: form.duree,
        nbStagiaires: form.nbStagiaires,
        difficulte: form.difficulte,
        competencesCiblees: form.competencesCiblees,
      }),
    });
    const sim = await createRes.json();
    setSimulationId(sim.id);

    // Stream generation
    const response = await fetch('/api/simulator/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulationId: sim.id,
        filiere: form.filiere,
        module: form.module,
        niveau: form.niveau,
        duree: form.duree,
        nbStagiaires: form.nbStagiaires,
        difficulte: form.difficulte,
        competencesCiblees: form.competencesCiblees,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let accum = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accum += chunk;
      if (accum.includes('[[DONE]]')) {
        setStep('done');
        break;
      }
      if (accum.includes('[[ERROR]]')) {
        setError(accum.split('[[ERROR]]')[1] ?? 'Erreur génération');
        setStep('form');
        break;
      }
      setStreamText(accum);
      if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }

  async function handleLaunch() {
    const runRes = await fetch(`/api/simulator/${simulationId}/runs`, { method: 'POST' });
    const run = await runRes.json();
    router.push(`/simulator/${simulationId}/run/${run.id}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#003087' }}>Nouvelle simulation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la simulation</label>
            <input
              type="text"
              value={form.titre}
              onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
              placeholder="Ex: Comptabilité PME — Cas pratique"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
            <select
              value={form.filiereId}
              onChange={e => {
                const f = filieres.find(x => x.id === e.target.value);
                setForm(p => ({ ...p, filiereId: e.target.value, filiere: f ? `${f.filiere ?? f.nom}` : '', module: '', moduleId: '' }));
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Sélectionner une filière</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.filiere ?? f.nom}</option>
              ))}
            </select>
          </div>

          {selectedFiliere && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select
                value={form.moduleId}
                onChange={e => {
                  const m = selectedFiliere.modules.find(x => x.id === e.target.value);
                  setForm(p => ({ ...p, moduleId: e.target.value, module: m?.nom ?? '' }));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sélectionner un module</option>
                {selectedFiliere.modules.map(m => (
                  <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ''}{m.nom}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={form.niveau}
                onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {NIVEAUX.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
              <select
                value={form.duree}
                onChange={e => setForm(p => ({ ...p, duree: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {DUREES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de stagiaires : <span className="font-bold" style={{ color: '#0A4DA8' }}>{form.nbStagiaires}</span>
            </label>
            <input
              type="range" min={5} max={35} value={form.nbStagiaires}
              onChange={e => setForm(p => ({ ...p, nbStagiaires: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté</label>
            <div className="flex gap-2">
              {DIFFICULTES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setForm(p => ({ ...p, difficulte: d.value }))}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: form.difficulte === d.value ? d.color : '#E5E7EB',
                    background: form.difficulte === d.value ? d.color + '20' : 'white',
                    color: form.difficulte === d.value ? d.color : '#6B7280',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <button
            onClick={handleGenerate}
            disabled={step === 'generating'}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-60"
            style={{ background: '#0A4DA8' }}
          >
            {step === 'generating' ? '⏳ Génération en cours...' : '🏢 Générer l\'entreprise virtuelle'}
          </button>
        </div>

        {/* Right: Streaming output */}
        <div
          className="bg-gray-950 rounded-xl p-5 min-h-[400px] flex flex-col"
          style={{ fontFamily: 'monospace' }}
        >
          {step === 'form' && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center">
              <div>
                <div className="text-3xl mb-3">🏢</div>
                <div>L'entreprise virtuelle apparaîtra ici</div>
              </div>
            </div>
          )}
          {step === 'generating' && (
            <>
              <div className="text-green-400 text-xs mb-3 font-semibold">⚡ Génération en streaming...</div>
              <div
                ref={streamRef}
                className="flex-1 overflow-y-auto text-green-300 text-xs leading-relaxed whitespace-pre-wrap"
              >
                {streamText}
                <span className="animate-pulse">▋</span>
              </div>
            </>
          )}
          {step === 'done' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-4xl">✅</div>
              <div className="text-white font-semibold">Entreprise générée avec succès !</div>
              <div className="text-gray-400 text-sm text-center">
                L'entreprise virtuelle et ses scénarios sont prêts.
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleLaunch}
                  className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm"
                  style={{ background: '#0A4DA8' }}
                >
                  ▶ Lancer la simulation
                </button>
                <button
                  onClick={() => router.push(`/simulator/${simulationId}`)}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-200 text-gray-700"
                >
                  Voir les détails
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/simulator/
git commit -m "feat(simulator): list and new simulation pages"
git push
```

---

### Task 8: Simulation Detail + Game Interface

**Files:**
- Create: `src/app/simulator/[id]/page.tsx`
- Create: `src/app/simulator/[id]/run/[runId]/page.tsx`

**Interfaces:**
- Consumes: `/api/simulator/[id]` GET, `/api/simulator/[id]/runs` POST, `/api/simulator/[id]/runs/[runId]` GET, `/api/simulator/[id]/runs/[runId]/decide` POST, `/api/simulator/[id]/runs/[runId]/status` PATCH
- Produces: management page + projected game interface

- [ ] **Step 1: Create src/app/simulator/[id]/page.tsx**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface SimulationDetail {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  niveau: string;
  duree: string;
  nbStagiaires: number;
  difficulte: string;
  company: {
    nom: string; secteur: string; description: string;
    personnages: Array<{ nom: string; fonction: string; personnalite: string }>;
    clients: Array<{ nom: string; type: string }>;
    fournisseurs: Array<{ nom: string }>;
    arcNarratif: Array<{ ordre: number; titre: string; templateType: string }>;
  } | null;
  runs: Array<{ id: string; status: string; score: number; startedAt: string; report: { note: number } | null }>;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  EN_COURS: { label: 'En cours', bg: '#DBEAFE', color: '#1D4ED8' },
  PAUSE: { label: 'En pause', bg: '#FEF3C7', color: '#92400E' },
  TERMINE: { label: 'Terminé', bg: '#DCFCE7', color: '#166534' },
};

export default function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sim, setSim] = useState<SimulationDetail | null>(null);

  useEffect(() => {
    fetch(`/api/simulator/${id}`).then(r => r.json()).then(setSim);
  }, [id]);

  async function handleNewRun() {
    const res = await fetch(`/api/simulator/${id}/runs`, { method: 'POST' });
    const run = await res.json();
    router.push(`/simulator/${id}/run/${run.id}`);
  }

  if (!sim) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/simulator" className="text-sm text-blue-600 hover:underline">← Simulations</Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: '#003087' }}>{sim.titre}</h1>
          <div className="text-sm text-gray-500 mt-0.5">{sim.filiere} / {sim.module} · {sim.niveau} · {sim.duree}</div>
        </div>
        <button
          onClick={handleNewRun}
          disabled={!sim.company}
          className="px-4 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: '#0A4DA8' }}
          title={!sim.company ? "Générez d'abord l'entreprise" : undefined}
        >
          ▶ Nouveau run
        </button>
      </div>

      {/* Company card */}
      {sim.company ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#EFF6FF' }}>🏢</div>
            <div>
              <div className="font-bold text-lg" style={{ color: '#003087' }}>{sim.company.nom}</div>
              <div className="text-sm text-gray-500">{sim.company.secteur}</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{sim.company.description}</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700 mb-1">Personnages ({sim.company.personnages.length})</div>
              {sim.company.personnages.slice(0, 3).map((p, i) => (
                <div key={i} className="text-gray-500 truncate">{p.nom} — {p.fonction}</div>
              ))}
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Clients ({sim.company.clients.length})</div>
              {sim.company.clients.map((c, i) => <div key={i} className="text-gray-500 truncate">{c.nom}</div>)}
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Scénarios ({sim.company.arcNarratif.length})</div>
              {sim.company.arcNarratif.slice(0, 4).map((ev, i) => (
                <div key={i} className="text-gray-500 truncate text-xs">{ev.ordre}. {ev.titre}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
          <div className="text-amber-600 font-medium">Entreprise non encore générée</div>
          <Link href={`/simulator/new?regenerate=${id}`} className="text-sm text-blue-600 hover:underline mt-1 block">
            Générer l'entreprise →
          </Link>
        </div>
      )}

      {/* Runs */}
      <div>
        <h2 className="font-bold text-lg mb-3" style={{ color: '#003087' }}>Sessions ({sim.runs.length})</h2>
        {sim.runs.length === 0 ? (
          <div className="text-gray-400 text-sm">Aucune session. Lancez un run pour commencer.</div>
        ) : (
          <div className="space-y-2">
            {sim.runs.map(run => {
              const badge = STATUS_BADGE[run.status] ?? STATUS_BADGE.EN_COURS;
              return (
                <div key={run.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-medium text-gray-700">Score : {run.score}/100</span>
                      {run.report && <span className="text-sm text-green-700">Note IA : {run.report.note}/20</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Démarré le {new Date(run.startedAt).toLocaleDateString('fr-MA')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/simulator/${id}/run/${run.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ borderColor: '#0A4DA8', color: '#0A4DA8' }}
                    >
                      {run.status === 'TERMINE' ? 'Revoir' : '▶ Continuer'}
                    </Link>
                    {run.status === 'TERMINE' && (
                      <Link
                        href={`/simulator/${id}/run/${run.id}/rapport`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700"
                      >
                        Rapport
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/app/simulator/[id]/run/[runId]/page.tsx**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface RunState {
  id: string;
  status: string;
  score: number;
  satisfactionClient: number;
  santeFinanciere: number;
  moralEquipe: number;
  evenementCourant: number;
  events: Array<{
    id: string;
    ordre: number;
    templateType: string;
    titre: string;
    description: string;
    contexte: string;
    personnageImplique: string;
    documentAttache: string | null;
    choixA: Choix;
    choixB: Choix;
    choixC: Choix;
    decision: Decision | null;
  }>;
}

interface Choix {
  label: string;
  description: string;
  consequences: string;
  impactScore: number;
  impactSatisfaction: number;
  impactFinancier: number;
  impactMoral: number;
}

interface Decision {
  choixSelectionne: string;
  consequences: string;
  impactScore: number;
}

interface SimInfo {
  titre: string;
  company: { nom: string; secteur: string } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  FINANCIER: '#EFF6FF',
  OPERATIONNEL: '#F0FDF4',
  RH: '#FFF7ED',
  COMMERCIAL: '#F5F3FF',
  SECURITE: '#FEF2F2',
};

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function GamePage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<RunState | null>(null);
  const [simInfo, setSimInfo] = useState<SimInfo | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [lastConsequence, setLastConsequence] = useState('');
  const [showDoc, setShowDoc] = useState(false);
  const [eventStartTime, setEventStartTime] = useState(Date.now());

  const currentEvent = run?.events[run.evenementCourant] ?? null;
  const totalEvents = run?.events.length ?? 0;
  const isLastDone = run?.status === 'TERMINE';

  const fetchRun = useCallback(async () => {
    const [runRes, simRes] = await Promise.all([
      fetch(`/api/simulator/${id}/runs/${runId}`),
      fetch(`/api/simulator/${id}`),
    ]);
    const [runData, simData] = await Promise.all([runRes.json(), simRes.json()]);
    setRun(runData);
    setSimInfo({ titre: simData.titre, company: simData.company });
    setEventStartTime(Date.now());
  }, [id, runId]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  async function handleDecide(choixSelectionne: 'A' | 'B' | 'C') {
    if (!currentEvent || deciding) return;
    setDeciding(true);
    const tempsReponse = Math.round((Date.now() - eventStartTime) / 1000);

    const res = await fetch(`/api/simulator/${id}/runs/${runId}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: currentEvent.id, choixSelectionne, tempsReponse }),
    });
    const data = await res.json();

    setLastConsequence(data.decision.consequences);
    await fetchRun();
    setDeciding(false);
    setEventStartTime(Date.now());
  }

  async function handlePause() {
    await fetch(`/api/simulator/${id}/runs/${runId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAUSE' }),
    });
    router.push(`/simulator/${id}`);
  }

  if (!run || !simInfo) return <div className="flex items-center justify-center h-screen text-gray-400">Chargement...</div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10" style={{ background: '#003087' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <div className="flex-1">
            <div className="text-white font-bold text-lg">{simInfo.company?.nom ?? simInfo.titre}</div>
            <div className="text-blue-200 text-xs">{simInfo.company?.secteur}</div>
          </div>
          <div className="flex gap-4 flex-1">
            <Gauge label="Satisfaction client" value={run.satisfactionClient} color="#22C55E" />
            <Gauge label="Santé financière" value={run.santeFinanciere} color="#3B82F6" />
            <Gauge label="Moral équipe" value={run.moralEquipe} color="#F59E0B" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{run.score}</div>
            <div className="text-blue-200 text-xs">Score · Évent. {Math.min(run.evenementCourant + 1, totalEvents)}/{totalEvents}</div>
          </div>
          <button onClick={handlePause} className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded border border-white/20">
            ⏸ Pause
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {isLastDone ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl">🏁</div>
            <div className="text-white text-2xl font-bold">Simulation terminée !</div>
            <div className="text-gray-400">Score final : {run.score}/100</div>
            <div className="flex gap-3 mt-2">
              <Link href={`/simulator/${id}/run/${runId}/rapport`}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white"
                style={{ background: '#0A4DA8' }}>
                Voir le rapport IA
              </Link>
              <Link href={`/simulator/${id}`}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-600 text-gray-300">
                Retour
              </Link>
            </div>
          </div>
        ) : currentEvent ? (
          <div className="grid grid-cols-3 gap-8">
            {/* Event + Choices */}
            <div className="col-span-2 space-y-5">
              {/* Consequence banner */}
              {lastConsequence && (
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-5 py-3 text-yellow-200 text-sm">
                  <span className="font-bold">Conséquences : </span>{lastConsequence}
                </div>
              )}

              {/* Event card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: CATEGORY_COLORS[currentEvent.templateType.split('_')[0]] ?? '#F3F4F6' }}>
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">
                      {currentEvent.templateType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white font-bold text-xl">{currentEvent.titre}</div>
                    <div className="text-blue-200 text-sm">{currentEvent.personnageImplique}</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{currentEvent.description}</p>
                {currentEvent.contexte && (
                  <p className="text-gray-400 text-xs mt-3 leading-relaxed border-t border-white/10 pt-3">{currentEvent.contexte}</p>
                )}
                {currentEvent.documentAttache && (
                  <button
                    onClick={() => setShowDoc(true)}
                    className="mt-3 text-xs text-blue-300 hover:text-blue-200 underline"
                  >
                    📄 Voir le document
                  </button>
                )}
              </div>

              {/* Choices */}
              {!currentEvent.decision ? (
                <div className="space-y-3">
                  <div className="text-gray-400 text-sm font-medium">Quelle décision prenez-vous ?</div>
                  {(['A', 'B', 'C'] as const).map(letter => {
                    const choix = currentEvent[`choix${letter}` as 'choixA' | 'choixB' | 'choixC'];
                    return (
                      <button
                        key={letter}
                        onClick={() => handleDecide(letter)}
                        disabled={deciding}
                        className="w-full text-left p-5 rounded-xl border-2 transition-all disabled:opacity-50"
                        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0A4DA8'; (e.currentTarget as HTMLElement).style.background = 'rgba(10,77,168,0.15)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                            style={{ background: '#0A4DA8', color: 'white' }}>{letter}</span>
                          <div>
                            <div className="text-white font-semibold text-sm">{choix.label}</div>
                            <div className="text-gray-400 text-xs mt-0.5">{choix.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                  <div className="text-green-300 text-sm font-semibold mb-1">
                    Choix {currentEvent.decision.choixSelectionne} sélectionné
                  </div>
                  <div className="text-gray-300 text-sm">{currentEvent.decision.consequences}</div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-gray-400 text-xs font-bold uppercase mb-3">Historique</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {run.events
                    .filter(ev => ev.decision)
                    .map(ev => (
                      <div key={ev.id} className="text-xs border-b border-white/5 pb-2">
                        <div className="text-gray-300 font-medium truncate">{ev.titre}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-gray-500">Choix {ev.decision!.choixSelectionne}</span>
                          <span className={ev.decision!.impactScore >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {ev.decision!.impactScore > 0 ? '+' : ''}{ev.decision!.impactScore}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Document modal */}
      {showDoc && currentEvent?.documentAttache && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
          onClick={() => setShowDoc(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-gray-900">Document</div>
              <button onClick={() => setShowDoc(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{currentEvent.documentAttache}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/simulator/
git commit -m "feat(simulator): simulation detail and game interface pages"
git push
```

---

### Task 9: Report Page + NavSidebar

**Files:**
- Create: `src/app/simulator/[id]/run/[runId]/rapport/page.tsx`
- Modify: `src/components/ui/NavSidebar.tsx`

**Interfaces:**
- Consumes: `/api/simulator/[id]/runs/[runId]/report` POST; existing jsPDF export pattern
- Produces: AI evaluation report page + Simulator nav link

- [ ] **Step 1: Create src/app/simulator/[id]/run/[runId]/rapport/page.tsx**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Report {
  pointsForts: string[];
  erreurs: string[];
  competencesMaitrisees: string[];
  competencesADevelopper: string[];
  conseils: string;
  planAmelioration: string;
  note: number;
  justification: string;
}

interface RunSummary {
  score: number;
  satisfactionClient: number;
  santeFinanciere: number;
  moralEquipe: number;
  tempsTotal: number;
  events: Array<{ decision: { choixSelectionne: string } | null }>;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{score}</text>
      <text x="50" y="66" textAnchor="middle" fontSize="9" fill="#9CA3AF">/100</text>
    </svg>
  );
}

export default function RapportPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const runRes = await fetch(`/api/simulator/${id}/runs/${runId}`);
      const runData = await runRes.json();
      setRunSummary(runData);

      if (runData.report) {
        setReport(runData.report);
        setLoading(false);
      } else {
        setLoading(false);
      }
    })();
  }, [id, runId]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch(`/api/simulator/${id}/runs/${runId}/report`, { method: 'POST' });
    const data = await res.json();
    setReport(data);
    setGenerating(false);
  }

  const noteColor = report ? (report.note >= 14 ? '#22C55E' : report.note >= 10 ? '#F59E0B' : '#EF4444') : '#6B7280';
  const decisionsCount = runSummary?.events.filter(e => e.decision).length ?? 0;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link href={`/simulator/${id}`} className="text-sm text-blue-600 hover:underline">← Simulation</Link>
        <h1 className="text-2xl font-bold mt-1" style={{ color: '#003087' }}>Rapport d'évaluation IA</h1>
      </div>

      {/* Stats */}
      {runSummary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <ScoreCircle score={runSummary.score} />
            <div className="text-xs text-gray-500 mt-1">Score global</div>
          </div>
          {[
            { label: 'Satisfaction', value: runSummary.satisfactionClient, color: '#22C55E' },
            { label: 'Finances', value: runSummary.santeFinanciere, color: '#3B82F6' },
            { label: 'Équipe', value: runSummary.moralEquipe, color: '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              <div className="text-xs text-gray-400">/100</div>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      {report && (
        <div className="bg-white rounded-xl border-2 p-6 flex items-center gap-6" style={{ borderColor: noteColor }}>
          <div className="text-6xl font-black" style={{ color: noteColor }}>{report.note}</div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Note /20</div>
            <p className="text-sm text-gray-700 mt-1">{report.justification}</p>
          </div>
        </div>
      )}

      {!report && !generating && (
        <div className="text-center py-8 bg-blue-50 rounded-xl border border-blue-200">
          <div className="text-gray-600 mb-3">Le rapport IA n'a pas encore été généré.</div>
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm"
            style={{ background: '#0A4DA8' }}
          >
            Générer le rapport IA
          </button>
        </div>
      )}

      {generating && (
        <div className="text-center py-8">
          <div className="text-gray-500">⏳ Génération du rapport en cours...</div>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-6">
            {/* Points forts */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-green-700 mb-3">✅ Points forts</h3>
              <ul className="space-y-1">
                {report.pointsForts.map((p, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500">•</span>{p}</li>)}
              </ul>
            </div>
            {/* Erreurs */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-red-700 mb-3">⚠ Erreurs / Décisions faibles</h3>
              <ul className="space-y-1">
                {report.erreurs.map((e, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-400">•</span>{e}</li>)}
              </ul>
            </div>
            {/* Compétences maîtrisées */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-blue-700 mb-3">🎯 Compétences maîtrisées</h3>
              <div className="flex flex-wrap gap-2">
                {report.competencesMaitrisees.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{c}</span>
                ))}
              </div>
            </div>
            {/* Compétences à développer */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold mb-3" style={{ color: '#E8651A' }}>📈 À développer</h3>
              <div className="flex flex-wrap gap-2">
                {report.competencesADevelopper.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#FFF3EC', color: '#E8651A' }}>{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Conseils */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-3">💡 Conseils</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.conseils}</p>
          </div>

          {/* Plan amélioration */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-3">📋 Plan d'amélioration</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.planAmelioration}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/simulator/${id}`}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700"
            >
              ← Retour
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#003087' }}
            >
              🖨 Imprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Simulator section to NavSidebar.tsx**

In `src/components/ui/NavSidebar.tsx`, add the SimulatorIcon SVG after `GuideIcon`:

```typescript
const SimulatorIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M12 12h.01M8 12a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
    <path d="M10 10v4m-2-2h4"/>
  </svg>
);
```

Then add a new section to `navSections` after the `"pedagogie"` section:

```typescript
  {
    id: "simulator",
    label: "Simulation IA",
    items: [
      { href: "/simulator", label: "Competencia Simulator", icon: <SimulatorIcon />, exact: false },
    ],
  },
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Test manually**

```
1. npm run dev
2. Navigate to /simulator → list page visible
3. Click "Nouvelle simulation" → /simulator/new loads
4. Fill form, click "Générer l'entreprise" → streaming output appears
5. After [[DONE]], "Lancer la simulation" appears → click
6. Game interface loads with event, 3 choices
7. Click a choice → indicators update, history shows decision
8. Complete all events → "Simulation terminée" banner
9. Click "Voir le rapport IA" → report page → click "Générer" → AI report appears
10. Verify nav sidebar has "Competencia Simulator" link
```

- [ ] **Step 5: Commit**

```bash
git add src/app/simulator/[id]/run/[runId]/rapport/page.tsx src/components/ui/NavSidebar.tsx
git commit -m "feat(simulator): rapport page and nav integration — Competencia Simulator complete"
git push
```
