# Référentiel OFPPT — Génération pilotée par le référentiel — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre au formateur de sélectionner Filière → Module → Séquence → Compétence dans le référentiel, puis d'ouvrir les générateurs (séance, fiche, évaluation) pré-remplis.

**Architecture:** Niveau `Séquence` ajouté de façon additive sous `RefModule` (compétences gardent `moduleId`, gagnent `sequenceId?`). Une nouvelle page `/referentiel/generer` fait la cascade et dépose un contexte dans `sessionStorage` ; chaque générateur le lit au montage et se pré-remplit (et vide la clé).

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL, Anthropic SDK, TypeScript, Tailwind. **Pas de framework de tests** : la vérification de chaque tâche est `npm run build` (type-check + lint) + contrôles manuels, avec commits fréquents.

**Spec :** `docs/superpowers/specs/2026-06-13-referentiel-generation-design.md`

**Convention de vérification (rappel) :** À chaque tâche, lancer depuis `generateur-seances-ofppt/` :
```bash
npm run build
```
Attendu : `✓ Compiled successfully` sans erreur TypeScript ni ESLint. (`npm run build` exécute `prisma generate` puis `next build`.)

---

## Task 1 : Modèle de données — Séquence ✅ (fait inline — voir note)

> **Note d'exécution (2026-06-13) :** la base est une instance **Supabase de production** et le référentiel y a été créé via SQL additif brut (`prisma/migrations/referentiel_pedagogique.sql`), pas via `prisma migrate dev`. Pour éviter tout reset, cette tâche a été réalisée par le contrôleur : mise à jour de `schema.prisma`, écriture de `prisma/migrations/add_sequences.sql` (additif/idempotent), application via `npx prisma db execute --url "$DIRECT_URL" --file prisma/migrations/add_sequences.sql`, puis `npx prisma generate`. Les sous-agents commencent à la Tâche 2.

**Files:**
- Modify: `prisma/schema.prisma`
- Migration: `prisma/migrations/add_sequences.sql` (SQL additif appliqué via `prisma db execute`)

- [ ] **Step 1 : Ajouter le modèle `Sequence` et la relation dans `RefModule`**

Dans `prisma/schema.prisma`, remplacer le modèle `RefModule` existant par :

```prisma
model RefModule {
  id          String       @id @default(cuid())
  nom         String
  code        String?
  mhg         Int?
  filiereId   String
  filiere     Filiere      @relation(fields: [filiereId], references: [id], onDelete: Cascade)
  sequences   Sequence[]
  competences Competence[]
  createdAt   DateTime     @default(now())

  @@map("RefModule")
}

model Sequence {
  id          String       @id @default(cuid())
  titre       String
  code        String?
  ordre       Int?
  moduleId    String
  module      RefModule    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  competences Competence[]
  createdAt   DateTime     @default(now())

  @@index([moduleId])
}
```

- [ ] **Step 2 : Ajouter `sequenceId` à `Competence`**

Dans le modèle `Competence`, ajouter les deux lignes de relation séquence (garder `moduleId`/`module` inchangés) :

```prisma
model Competence {
  id               String                  @id @default(cuid())
  titre            String
  moduleId         String
  module           RefModule               @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  sequenceId       String?
  sequence         Sequence?               @relation(fields: [sequenceId], references: [id], onDelete: SetNull)
  objectifs        Objectif[]
  progressions     ProgressionCompetence[]
  groupeSelections GroupeCompetence[]
  createdAt        DateTime                @default(now())

  @@index([sequenceId])
}
```

- [ ] **Step 3 : Générer et appliquer la migration**

Run :
```bash
npx prisma migrate dev --name add_sequences
```
Attendu : `Your database is now in sync with your schema.` et un dossier `prisma/migrations/<timestamp>_add_sequences/migration.sql` créé. Le SQL doit contenir `CREATE TABLE "Sequence"` et `ALTER TABLE "Competence" ADD COLUMN "sequenceId"` (nullable). Aucune table existante supprimée.

- [ ] **Step 4 : Vérifier la génération du client**

Run :
```bash
npx prisma generate
```
Attendu : `Generated Prisma Client` sans erreur.

- [ ] **Step 5 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): ajout du niveau Séquence (Module→Séquence→Compétence, additif)"
```

---

## Task 2 : Extraction IA — séquences optionnelles

**Files:**
- Modify: `src/lib/referentiel-extractor.ts`

- [ ] **Step 1 : Étendre le type `ExtractedReferentiel`**

Remplacer l'interface `ExtractedReferentiel` par (ajout du champ optionnel `sequences` au niveau module) :

```ts
export interface ExtractedCompetence {
  titre: string;
  objectifs: { titre: string; criteres: string[] }[];
}

export interface ExtractedReferentiel {
  secteur: string;
  secteurCode?: string;
  filiere: string;
  filiereCode?: string;
  modules: {
    nom: string;
    code?: string;
    mhg?: number;
    competences?: ExtractedCompetence[];
    sequences?: {
      titre: string;
      code?: string;
      competences: ExtractedCompetence[];
    }[];
  }[];
}
```

- [ ] **Step 2 : Mettre à jour le prompt pour extraire les séquences**

Dans `extractReferentielFromText`, remplacer le bloc de structure JSON attendue (la partie `"modules": [...]`) par :

```ts
{
  "secteur": "nom du secteur (ex: Tertiaire, Industrie, BTP...)",
  "secteurCode": "code optionnel du secteur",
  "filiere": "nom de la filière (ex: Comptabilité, Gestion des Entreprises...)",
  "filiereCode": "code optionnel de la filière",
  "modules": [
    {
      "nom": "intitulé du module",
      "code": "code module (ex: M101)",
      "mhg": 120,
      "sequences": [
        {
          "titre": "intitulé de la séquence pédagogique",
          "code": "code optionnel (ex: S1)",
          "competences": [
            {
              "titre": "titre de la compétence",
              "objectifs": [
                { "titre": "titre de l'objectif", "criteres": ["critère 1", "critère 2"] }
              ]
            }
          ]
        }
      ],
      "competences": []
    }
  ]
}
```

Et ajouter, juste avant la dernière phrase d'instruction du prompt :

```
Si le document découpe le module en SÉQUENCES pédagogiques, place les compétences sous leur séquence dans "sequences" et laisse "competences" vide. Si le document ne mentionne PAS de séquences, laisse "sequences" vide et place les compétences directement dans "competences".
```

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : compilation OK (les nouveaux champs sont optionnels, pas d'erreur de type).

- [ ] **Step 4 : Commit**

```bash
git add src/lib/referentiel-extractor.ts
git commit -m "feat(referentiel): extraction IA des séquences (optionnel)"
```

---

## Task 3 : Import — persister les séquences

**Files:**
- Modify: `src/app/api/referentiel/route.ts` (fonction `POST`)

- [ ] **Step 1 : Remplacer la boucle d'insertion des modules**

Dans `POST`, remplacer le bloc qui commence à `let modulesCreated = 0;` et va jusqu'à la fermeture de la boucle `for (const mod of extracted.modules ?? [])` par :

```ts
    let modulesCreated = 0;
    let sequencesCreated = 0;
    let competencesCreated = 0;
    let objectifsCreated = 0;
    let criteresCreated = 0;

    // Crée une compétence + ses objectifs + critères sous un module, éventuellement rattachée à une séquence.
    async function createCompetence(
      comp: { titre: string; objectifs?: { titre: string; criteres?: string[] }[] },
      moduleId: string,
      sequenceId: string | null
    ) {
      const competence = await prisma.competence.create({
        data: { titre: comp.titre, moduleId, sequenceId },
      });
      competencesCreated++;

      for (const obj of comp.objectifs ?? []) {
        const objectif = await prisma.objectif.create({
          data: { titre: obj.titre, competenceId: competence.id },
        });
        objectifsCreated++;

        for (const crit of obj.criteres ?? []) {
          await prisma.criterePerformance.create({
            data: { description: crit, objectifId: objectif.id },
          });
          criteresCreated++;
        }
      }
    }

    for (const mod of extracted.modules ?? []) {
      const refModule = await prisma.refModule.create({
        data: {
          nom: mod.nom,
          code: mod.code ?? null,
          mhg: mod.mhg ?? null,
          filiereId: filiere.id,
        },
      });
      modulesCreated++;

      // Compétences directement sous le module (pas de séquence)
      for (const comp of mod.competences ?? []) {
        await createCompetence(comp, refModule.id, null);
      }

      // Compétences regroupées par séquence
      for (const seq of mod.sequences ?? []) {
        const sequence = await prisma.sequence.create({
          data: { titre: seq.titre, code: seq.code ?? null, moduleId: refModule.id },
        });
        sequencesCreated++;
        for (const comp of seq.competences ?? []) {
          await createCompetence(comp, refModule.id, sequence.id);
        }
      }
    }
```

- [ ] **Step 2 : Ajouter `sequencesCreated` à la réponse**

Remplacer le `stats: { ... }` du `return NextResponse.json({...})` final par :

```ts
      stats: { modulesCreated, sequencesCreated, competencesCreated, objectifsCreated, criteresCreated },
```

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/referentiel/route.ts
git commit -m "feat(referentiel): import persiste les séquences et leurs compétences"
```

---

## Task 4 : API — mode `cascade` + GET complet

**Files:**
- Modify: `src/app/api/referentiel/route.ts` (fonction `GET`)

- [ ] **Step 1 : Ajouter le mode `cascade` dans `GET`**

Dans `GET`, juste après le bloc `if (mode === "summary") { ... }`, insérer :

```ts
  if (mode === "cascade") {
    const filieres = await prisma.filiere.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        modules: {
          select: {
            id: true,
            nom: true,
            code: true,
            sequences: {
              select: {
                id: true,
                titre: true,
                code: true,
                competences: {
                  select: {
                    id: true,
                    titre: true,
                    objectifs: { select: { titre: true, criteres: { select: { description: true } } } },
                  },
                  orderBy: { titre: "asc" },
                },
              },
              orderBy: [{ ordre: "asc" }, { titre: "asc" }],
            },
            competences: {
              where: { sequenceId: null },
              select: {
                id: true,
                titre: true,
                objectifs: { select: { titre: true, criteres: { select: { description: true } } } },
              },
              orderBy: { titre: "asc" },
            },
          },
          orderBy: { nom: "asc" },
        },
      },
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(filieres);
  }
```

- [ ] **Step 2 : Inclure les séquences dans le GET complet**

Dans le même `GET`, dans la requête `prisma.secteur.findMany({ include: {...} })`, à l'intérieur de `modules: { include: { ... } }`, ajouter `sequences` à côté de `competences` :

```ts
          modules: {
            include: {
              sequences: {
                include: {
                  competences: {
                    include: { objectifs: { include: { criteres: true } } },
                  },
                },
              },
              competences: {
                include: { objectifs: { include: { criteres: true } } },
              },
            },
          },
```

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/referentiel/route.ts
git commit -m "feat(referentiel): endpoint cascade + séquences dans le GET complet"
```

---

## Task 5 : Type de contexte + helper sessionStorage

**Files:**
- Modify: `src/types/seance.ts`
- Create: `src/lib/referentiel-context.ts`

- [ ] **Step 1 : Ajouter le type `ReferentielContext`**

À la fin de `src/types/seance.ts`, ajouter :

```ts
export interface ReferentielContext {
  filiere: string;
  module: string;
  codeModule: string;
  sequence?: string;
  competence: string;
  objectifs: string;
  criteres: string;
}
```

- [ ] **Step 2 : Créer le helper**

Créer `src/lib/referentiel-context.ts` :

```ts
import type { ReferentielContext } from "@/types/seance";

const KEY = "referentielContext";

/** Dépose le contexte référentiel avant de naviguer vers un générateur. */
export function setReferentielContext(ctx: ReferentielContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(ctx));
}

/** Lit puis SUPPRIME le contexte (consommation unique) pour ne pas polluer les générations manuelles. */
export function consumeReferentielContext(): ReferentielContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as ReferentielContext;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

- [ ] **Step 4 : Commit**

```bash
git add src/types/seance.ts src/lib/referentiel-context.ts
git commit -m "feat(referentiel): type ReferentielContext + helper sessionStorage"
```

---

## Task 6 : Page `/referentiel/generer` (cascade + handoff)

**Files:**
- Create: `src/app/referentiel/generer/page.tsx`
- Create: `src/app/referentiel/generer/GenererClient.tsx`

- [ ] **Step 1 : Créer le server component**

Créer `src/app/referentiel/generer/page.tsx` :

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import GenererClient from "./GenererClient";

export const dynamic = "force-dynamic";

export default async function GenererPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <GenererClient />;
}
```

- [ ] **Step 2 : Créer le client de cascade**

Créer `src/app/referentiel/generer/GenererClient.tsx` :

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setReferentielContext } from "@/lib/referentiel-context";

interface Critere { description: string }
interface Objectif { titre: string; criteres: Critere[] }
interface Competence { id: string; titre: string; objectifs: Objectif[] }
interface Sequence { id: string; titre: string; code: string | null; competences: Competence[] }
interface Module { id: string; nom: string; code: string | null; sequences: Sequence[]; competences: Competence[] }
interface Filiere { id: string; nom: string; code: string | null; modules: Module[] }

export default function GenererClient() {
  const router = useRouter();
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [filiereId, setFiliereId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [competenceId, setCompetenceId] = useState("");

  useEffect(() => {
    fetch("/api/referentiel?mode=cascade")
      .then((r) => r.json())
      .then((data: Filiere[]) => setFilieres(Array.isArray(data) ? data : []))
      .catch(() => setFilieres([]))
      .finally(() => setLoading(false));
  }, []);

  const filiere = useMemo(() => filieres.find((f) => f.id === filiereId), [filieres, filiereId]);
  const module = useMemo(() => filiere?.modules.find((m) => m.id === moduleId), [filiere, moduleId]);
  const hasSequences = (module?.sequences.length ?? 0) > 0;
  const sequence = useMemo(() => module?.sequences.find((s) => s.id === sequenceId), [module, sequenceId]);

  // Compétences disponibles : celles de la séquence choisie, sinon celles directes du module.
  const competences = useMemo<Competence[]>(() => {
    if (!module) return [];
    if (hasSequences) return sequence?.competences ?? [];
    return module.competences;
  }, [module, hasSequences, sequence]);

  const competence = useMemo(() => competences.find((c) => c.id === competenceId), [competences, competenceId]);

  const objectifsText = useMemo(
    () => (competence?.objectifs ?? []).map((o) => o.titre).join("\n"),
    [competence]
  );
  const criteresText = useMemo(
    () => (competence?.objectifs ?? []).flatMap((o) => o.criteres.map((c) => c.description)).join("\n"),
    [competence]
  );

  function go(target: "/seances" | "/fiches" | "/evaluations") {
    if (!filiere || !module || !competence) return;
    setReferentielContext({
      filiere: filiere.nom,
      module: module.nom,
      codeModule: module.code ?? "",
      sequence: sequence?.titre,
      competence: competence.titre,
      objectifs: objectifsText,
      criteres: criteresText,
    });
    router.push(target);
  }

  const selectStyle = { background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-6 py-20 text-center" style={{ color: "#9CA3AF" }}>Chargement du référentiel…</div>;
  }

  if (filieres.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "#374151" }}>Aucun référentiel importé</h2>
        <p className="text-sm mb-6" style={{ color: "#4B5563" }}>Importez un référentiel depuis Paramètres pour utiliser la génération guidée.</p>
        <Link href="/referentiel" className="text-sm px-4 py-2 rounded-lg font-medium text-white" style={{ background: "#0A4DA8" }}>
          Voir le référentiel
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Générer depuis le référentiel</h1>
        <p className="mt-1" style={{ color: "#9CA3AF" }}>Choisissez une compétence, puis générez la séance, la fiche ou l&apos;évaluation correspondante.</p>
      </div>

      <div className="card space-y-5">
        {/* Filière */}
        <div>
          <label className="label">Filière *</label>
          <select className="input-field" style={selectStyle} value={filiereId}
            onChange={(e) => { setFiliereId(e.target.value); setModuleId(""); setSequenceId(""); setCompetenceId(""); }}>
            <option value="">— Choisir une filière —</option>
            {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </div>

        {/* Module */}
        {filiere && (
          <div>
            <label className="label">Module *</label>
            <select className="input-field" style={selectStyle} value={moduleId}
              onChange={(e) => { setModuleId(e.target.value); setSequenceId(""); setCompetenceId(""); }}>
              <option value="">— Choisir un module —</option>
              {filiere.modules.map((m) => <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ""}{m.nom}</option>)}
            </select>
          </div>
        )}

        {/* Séquence (si le module en a) */}
        {module && hasSequences && (
          <div>
            <label className="label">Séquence *</label>
            <select className="input-field" style={selectStyle} value={sequenceId}
              onChange={(e) => { setSequenceId(e.target.value); setCompetenceId(""); }}>
              <option value="">— Choisir une séquence —</option>
              {module.sequences.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} — ` : ""}{s.titre}</option>)}
            </select>
          </div>
        )}

        {/* Compétence */}
        {module && (!hasSequences || sequence) && (
          <div>
            <label className="label">Compétence *</label>
            <select className="input-field" style={selectStyle} value={competenceId}
              onChange={(e) => setCompetenceId(e.target.value)}>
              <option value="">— Choisir une compétence —</option>
              {competences.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
          </div>
        )}

        {/* Aperçu + actions */}
        {competence && (
          <div className="rounded-xl p-4" style={{ background: "#0A4DA80A", border: "1px solid #0A4DA830" }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#0A4DA8" }}>{competence.titre}</h3>
            {objectifsText && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: "#4B5563" }}>Objectifs</p>
                <ul className="list-disc list-inside text-xs space-y-0.5" style={{ color: "#374151" }}>
                  {competence.objectifs.map((o, i) => <li key={i}>{o.titre}</li>)}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => go("/seances")} className="text-sm px-4 py-2 rounded-lg font-medium text-white" style={{ background: "#0A4DA8" }}>Générer la séance</button>
              <button onClick={() => go("/fiches")} className="text-sm px-4 py-2 rounded-lg font-medium" style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}>Générer la fiche</button>
              <button onClick={() => go("/evaluations")} className="text-sm px-4 py-2 rounded-lg font-medium" style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}>Générer l&apos;évaluation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : la route `/referentiel/generer` apparaît dans la sortie du build, sans erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/app/referentiel/generer
git commit -m "feat(referentiel): page de génération guidée (cascade + handoff)"
```

---

## Task 7 : Navigation + CTA

**Files:**
- Modify: `src/components/ui/NavSidebar.tsx`
- Modify: `src/app/referentiel/ReferentielClient.tsx`

- [ ] **Step 1 : Ajouter l'item de nav dans le groupe Génération**

Dans `src/components/ui/NavSidebar.tsx`, dans `navSections`, section `id: "generation"`, ajouter en première position du tableau `items` :

```tsx
      { href: "/referentiel/generer", label: "Générer (référentiel)", icon: <RefIcon />, exact: true },
```

(Réutilise `RefIcon`, déjà importé/défini dans ce fichier.)

- [ ] **Step 2 : Ajouter un bouton CTA sur la page Référentiel**

Dans `src/app/referentiel/ReferentielClient.tsx`, importer `Link` est déjà fait. Dans le header (le `div` sticky contenant le bouton « Exporter Excel »), remplacer le bouton seul par un groupe de deux boutons. Repérer `<button onClick={exportFiltered} ...>` et l'envelopper :

```tsx
        <div className="flex items-center gap-2">
          <Link
            href="/referentiel/generer"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#0A4DA8" }}
          >
            ✨ Générer depuis le référentiel
          </Link>
          <button
            onClick={exportFiltered}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Exporter Excel
          </button>
        </div>
```

(Note : ceci change la couleur du bouton Export en style secondaire ; c'est voulu pour mettre le CTA en avant.)

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

- [ ] **Step 4 : Commit**

```bash
git add src/components/ui/NavSidebar.tsx src/app/referentiel/ReferentielClient.tsx
git commit -m "feat(referentiel): accès nav + CTA vers la génération guidée"
```

---

## Task 8 : Pré-remplissage de la Séance

**Files:**
- Modify: `src/components/forms/SeanceForm.tsx`
- Modify: `src/app/seances/page.tsx`

- [ ] **Step 1 : Ajouter les props `initial` et `forceReferentiel` à `SeanceForm`**

Dans `src/components/forms/SeanceForm.tsx`, remplacer l'interface `Props` et la signature du composant + l'init du state par :

```tsx
interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
  initial?: Partial<SeanceFormData>;
  forceReferentiel?: boolean;
}

export default function SeanceForm({ onGenerate, isLoading, initial, forceReferentiel }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    codeModule: "",
    duree: "2h30",
    niveau: "TS",
    annee: "1ere-annee",
    type: "theorique",
    competence: "",
    niveauApprentissage: "intermediaire",
    mode: "presentiel",
    ...initial,
  });
```

- [ ] **Step 2 : Forcer la disposition manuelle quand le contexte référentiel est présent**

Toujours dans `SeanceForm.tsx`, remplacer l'ouverture de la branche d'affichage `{hasImport ? (` par `{hasImport && !forceReferentiel ? (`.

Puis, dans la branche `else` (saisie manuelle, qui commence par `<label className="label">Filière *</label>`), remplacer le `<select>` de la filière par un champ texte (pour accepter une filière issue du référentiel hors liste figée) :

```tsx
          <div>
            <label className="label">Filière *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Gestion des Entreprises"
              value={form.filiere}
              onChange={set("filiere")}
              required
            />
          </div>
```

(Le champ « Intitulé module » manuel reste un `<input type="text">` déjà en place ; il sera pré-rempli par `initial.module`.)

- [ ] **Step 3 : Lire le contexte dans la page Séance et le passer au formulaire**

Dans `src/app/seances/page.tsx`, ajouter les imports en haut :

```tsx
import { useEffect } from "react";
import { consumeReferentielContext } from "@/lib/referentiel-context";
```

(Fusionner avec l'import `useState` existant : `import { useState, useEffect } from "react";`.)

Puis, dans le composant `SeancesPage`, ajouter un état et un effet juste après les `useState` existants :

```tsx
  const [initial, setInitial] = useState<Partial<SeanceFormData> | undefined>(undefined);

  useEffect(() => {
    const ctx = consumeReferentielContext();
    if (ctx) {
      setInitial({
        filiere: ctx.filiere,
        module: ctx.module,
        codeModule: ctx.codeModule,
        competence: ctx.competence,
        objectifs: ctx.objectifs,
      });
    }
  }, []);
```

Enfin, passer les props au formulaire — remplacer `<SeanceForm onGenerate={handleGenerate} isLoading={isLoading} />` par :

```tsx
            <SeanceForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} forceReferentiel={!!initial} />
```

- [ ] **Step 4 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

- [ ] **Step 5 : Commit**

```bash
git add src/components/forms/SeanceForm.tsx src/app/seances/page.tsx
git commit -m "feat(seances): pré-remplissage depuis le contexte référentiel"
```

---

## Task 9 : Pré-remplissage de la Fiche

**Files:**
- Modify: `src/app/fiches/page.tsx`

> `FicheForm` accepte déjà `defaultValues?: Partial<FicheFormData>` et le fusionne dans son state. Il suffit donc d'alimenter `defaultValues` depuis le contexte référentiel.

- [ ] **Step 1 : Lire le contexte et compléter `defaultValues`**

Dans `src/app/fiches/page.tsx`, ajouter l'import :

```tsx
import { consumeReferentielContext } from "@/lib/referentiel-context";
```

Dans `FichesContent`, ajouter un `useEffect` (après le `useEffect` existant qui gère `searchParams.get("from")`) :

```tsx
  useEffect(() => {
    const ctx = consumeReferentielContext();
    if (ctx) {
      setDefaultValues((prev) => ({
        ...prev,
        filiere: ctx.filiere,
        module: ctx.module,
        codeModule: ctx.codeModule,
        intitule: ctx.competence,
        objectifsSavoir: ctx.objectifs,
      }));
    }
  }, []);
```

- [ ] **Step 2 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

> Note : `FicheForm` a une branche `hasImport` (select de filières importées). Si le formateur a des modules Excel importés, la filière du référentiel peut ne pas figurer dans le select. C'est acceptable : `intitule`, `module`, `codeModule` et `objectifsSavoir` sont pré-remplis ; le formateur ajuste la filière si besoin. (Ne pas modifier `FicheForm` dans cette tâche — YAGNI.)

- [ ] **Step 3 : Commit**

```bash
git add src/app/fiches/page.tsx
git commit -m "feat(fiches): pré-remplissage depuis le contexte référentiel"
```

---

## Task 10 : Pré-remplissage de l'Évaluation

**Files:**
- Modify: `src/components/forms/EvaluationForm.tsx`
- Modify: `src/app/evaluations/page.tsx`

- [ ] **Step 1 : Ajouter une prop `initial` à `EvaluationForm`**

Dans `src/components/forms/EvaluationForm.tsx`, remplacer l'interface `Props`, la signature et l'init du state par :

```tsx
interface Props {
  onGenerate: (data: EvaluationFormData) => void;
  isLoading: boolean;
  initial?: Partial<EvaluationFormData>;
}

export default function EvaluationForm({ onGenerate, isLoading, initial }: Props) {
  const [form, setForm] = useState<EvaluationFormData>({
    type: "qcm",
    filiere: "",
    module: "",
    codeModule: "",
    niveau: "TS",
    annee: "1ere-annee",
    theme: "",
    nbQuestions: 10,
    nbExercices: 3,
    dureeExamen: "2h",
    themesCouverts: "",
    ...initial,
  });
```

- [ ] **Step 2 : Lire le contexte dans la page Évaluation**

Dans `src/app/evaluations/page.tsx`, ajouter les imports :

```tsx
import { useEffect } from "react";
import { consumeReferentielContext } from "@/lib/referentiel-context";
```

(Fusionner avec `import { useState } from "react";` → `import { useState, useEffect } from "react";`.)

Dans `EvaluationsPage`, ajouter après les `useState` :

```tsx
  const [initial, setInitial] = useState<Partial<EvaluationFormData> | undefined>(undefined);

  useEffect(() => {
    const ctx = consumeReferentielContext();
    if (ctx) {
      setInitial({
        filiere: ctx.filiere,
        module: ctx.module,
        codeModule: ctx.codeModule,
        theme: ctx.competence,
        themesCouverts: ctx.objectifs,
      });
    }
  }, []);
```

Puis passer la prop : repérer `<EvaluationForm onGenerate={handleGenerate} isLoading={isLoading} />` et le remplacer par :

```tsx
        <EvaluationForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} />
```

(Si le composant `EvaluationForm` est utilisé avec d'autres props/markup, conserver le reste et n'ajouter que `initial={initial}`.)

- [ ] **Step 3 : Vérifier**

Run : `npm run build`
Attendu : compilation OK.

- [ ] **Step 4 : Commit**

```bash
git add src/components/forms/EvaluationForm.tsx src/app/evaluations/page.tsx
git commit -m "feat(evaluations): pré-remplissage depuis le contexte référentiel"
```

---

## Task 11 : Journal de décisions + vérification manuelle de bout en bout

**Files:**
- Modify (ou Create): `decisions/ledger.md`

- [ ] **Step 1 : Consigner les décisions (règle projet du CLAUDE.md)**

Ajouter à la fin de `decisions/ledger.md` (créer le fichier s'il n'existe pas) :

```markdown
## 2026-06-13 — Référentiel : génération guidée

- **A1** : niveau `Séquence` ajouté de façon additive (`Competence.moduleId` requis, `sequenceId?` nullable). Rétro-compatible avec le Suivi des compétences.
- **B1** : handoff du contexte de génération via `sessionStorage` (clé `referentielContext`), consommée une seule fois par chaque générateur.
- Nouvelle page `/referentiel/generer` : cascade Filière→Module→Séquence→Compétence → boutons Séance / Fiche / Évaluation pré-remplis.
```

- [ ] **Step 2 : Build final complet**

Run :
```bash
npm run build
```
Attendu : `✓ Compiled successfully`, route `/referentiel/generer` listée, aucune erreur.

- [ ] **Step 3 : Vérification manuelle de bout en bout**

Lancer `npm run dev`, puis vérifier dans le navigateur (connecté avec `ezzouhir2122@gmail.com`) :

1. **Import avec séquences** : via ⚙ Paramètres, importer un référentiel dont un module est découpé en séquences. La réponse JSON doit inclure `stats.sequencesCreated > 0`.
2. **Cascade** : ouvrir `/referentiel/generer`. Sélectionner Filière → Module. Si le module a des séquences, le select Séquence apparaît ; sinon les compétences s'affichent directement.
3. **Aperçu** : à la sélection d'une compétence, ses objectifs s'affichent et 3 boutons apparaissent.
4. **Séance** : cliquer *Générer la séance* → `/seances` ; les champs Filière, Module, Code module, Thème (compétence) sont pré-remplis. Générer → contenu produit.
5. **Fiche** : revenir à `/referentiel/generer`, cliquer *Générer la fiche* → `/fiches` ; Intitulé = compétence, Module pré-rempli.
6. **Évaluation** : idem → `/evaluations` ; Thème = compétence pré-rempli.
7. **Non-pollution** : recharger `/seances` directement (sans passer par la cascade) → les champs ne doivent PAS être pré-remplis (le contexte a été consommé).
8. **Rétro-compatibilité** : un référentiel importé sans séquences reste navigable (compétences directement sous le module) sur `/referentiel/generer` et `/referentiel`.

- [ ] **Step 4 : Commit**

```bash
git add decisions/ledger.md
git commit -m "docs: journal de décisions — génération guidée par le référentiel"
```

---

## Self-review (couverture spec)

- Modèle `Sequence` + `Competence.sequenceId` → Task 1 ✓
- Extraction IA des séquences → Task 2 ✓
- Import persiste séquences → Task 3 ✓
- `mode=cascade` + GET complet → Task 4 ✓
- Type contexte + helper sessionStorage → Task 5 ✓
- Page `/referentiel/generer` (cascade + 3 boutons + handoff) → Task 6 ✓
- Nav + CTA → Task 7 ✓
- Pré-remplissage Séance / Fiche / Évaluation → Tasks 8, 9, 10 ✓
- Vérification + décisions → Task 11 ✓

Types cohérents : `ReferentielContext` (Task 5) consommé tel quel dans Tasks 8–10 ; `setReferentielContext`/`consumeReferentielContext` utilisés Tasks 6 et 8–10.
