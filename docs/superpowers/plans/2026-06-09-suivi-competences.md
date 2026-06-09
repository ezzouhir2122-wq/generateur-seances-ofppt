# SUIVI DES COMPÉTENCES — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la section "Suivi des Compétences" — gestion de groupes/stagiaires, tableau de progression éditable, graphiques recharts, exports Excel/PDF.

**Architecture:** Routes imbriquées App Router Next.js (`/suivi`, `/suivi/nouveau`, `/suivi/[groupeId]`, `/suivi/[groupeId]/stagiaires`). Server Components pour le fetch initial, Client Components pour l'interactivité. API Routes REST pour les mutations. Exports côté client via `xlsx` et `jsPDF` déjà dans le projet.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL, Tailwind CSS, recharts (à installer), xlsx (existant), jsPDF (existant).

---

## File Map

| Fichier | Action | Rôle |
|---------|--------|------|
| `prisma/schema.prisma` | Modifier | Ajouter Groupe, Stagiaire, ProgressionCompetence |
| `src/types/suivi.ts` | Créer | Types TypeScript du module |
| `src/lib/export.ts` | Modifier | Ajouter exportProgressionExcel + exportProgressionPDF |
| `src/app/api/groupes/route.ts` | Créer | GET list + POST create groupe |
| `src/app/api/groupes/[id]/route.ts` | Créer | GET detail + DELETE groupe |
| `src/app/api/groupes/[id]/stagiaires/route.ts` | Créer | POST ajout manuel stagiaire |
| `src/app/api/groupes/[id]/stagiaires/import/route.ts` | Créer | POST import Excel stagiaires |
| `src/app/api/groupes/template/route.ts` | Créer | GET télécharger template Excel stagiaires |
| `src/app/api/stagiaires/[id]/route.ts` | Créer | DELETE stagiaire |
| `src/app/api/progressions/route.ts` | Créer | PUT upsert progression |
| `src/app/api/progressions/import-notes/[groupeId]/route.ts` | Créer | POST import notes Excel |
| `src/app/api/progressions/template/[groupeId]/route.ts` | Créer | GET template notes dynamique |
| `src/components/suivi/GroupeCard.tsx` | Créer | Card d'un groupe dans la liste |
| `src/components/suivi/GroupeForm.tsx` | Créer | Formulaire création groupe |
| `src/components/suivi/StagiairesManager.tsx` | Créer | Gestion stagiaires (ajout + import) |
| `src/components/suivi/ProgressionCharts.tsx` | Créer | BarChart + RadarChart (recharts) |
| `src/components/suivi/ProgressionTable.tsx` | Créer | Tableau éditable + boutons export |
| `src/app/suivi/page.tsx` | Créer | Liste des groupes (Server Component) |
| `src/app/suivi/nouveau/page.tsx` | Créer | Page création groupe |
| `src/app/suivi/[groupeId]/stagiaires/page.tsx` | Créer | Page gestion stagiaires |
| `src/app/suivi/[groupeId]/page.tsx` | Créer | Page principale tableau + charts |
| `src/app/page.tsx` | Modifier | Ajouter widget suivi compétences |
| `src/components/ui/NavSidebar.tsx` | Modifier | Ajouter section SUIVI DES COMPÉTENCES |

---

## Task 1 — Dependencies + Prisma Schema + Migration

**Files:**
- Modify: `package.json` (recharts install)
- Modify: `prisma/schema.prisma`

- [ ] **Étape 1 : Installer recharts**

```bash
cd generateur-seances-ofppt
npm install recharts
```

- [ ] **Étape 2 : Modifier prisma/schema.prisma**

Ajouter `groupes Groupe[]` dans le modèle `User` (après la ligne `chatSessions ChatSession[]`) :
```prisma
  groupes      Groupe[]
```

Ajouter `progressions ProgressionCompetence[]` dans le modèle `Competence` (après `objectifs Objectif[]`) :
```prisma
  progressions ProgressionCompetence[]
```

Ajouter à la fin du fichier :
```prisma
model Groupe {
  id         String      @id @default(cuid())
  nom        String
  filiere    String      // stores Filiere.id
  annee      String      // ex: "2024-2025"
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  stagiaires Stagiaire[]
  createdAt  DateTime    @default(now())
}

model Stagiaire {
  id           String                  @id @default(cuid())
  nom          String
  prenom       String
  cne          String?
  groupeId     String
  groupe       Groupe                  @relation(fields: [groupeId], references: [id], onDelete: Cascade)
  progressions ProgressionCompetence[]
  createdAt    DateTime                @default(now())
}

model ProgressionCompetence {
  id           String     @id @default(cuid())
  stagiaireId  String
  stagiaire    Stagiaire  @relation(fields: [stagiaireId], references: [id], onDelete: Cascade)
  competenceId String
  competence   Competence @relation(fields: [competenceId], references: [id], onDelete: Cascade)
  pourcentage  Int
  source       String     @default("manuel")
  updatedAt    DateTime   @updatedAt

  @@unique([stagiaireId, competenceId])
}
```

- [ ] **Étape 3 : Créer et appliquer la migration**

```bash
npx prisma migrate dev --name add-suivi-competences
```

Résultat attendu : `✔ Your database is now in sync with your schema.`

- [ ] **Étape 4 : Vérifier que le build TypeScript passe**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Étape 5 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations package.json package-lock.json
git commit -m "feat(suivi): add Groupe, Stagiaire, ProgressionCompetence schema + recharts"
```

---

## Task 2 — Types TypeScript

**Files:**
- Create: `src/types/suivi.ts`

- [ ] **Étape 1 : Créer src/types/suivi.ts**

```typescript
export interface GroupeSummary {
  id: string;
  nom: string;
  filiere: string;
  filiereNom: string;
  annee: string;
  createdAt: string;
  _count: { stagiaires: number };
}

export interface ProgressionItem {
  competenceId: string;
  pourcentage: number;
  source: string;
}

export interface StagiaireItem {
  id: string;
  nom: string;
  prenom: string;
  cne: string | null;
  createdAt: string;
  progressions: ProgressionItem[];
}

export interface CompetenceItem {
  id: string;
  titre: string;
  moduleNom: string;
}

export interface GroupeDetail {
  id: string;
  nom: string;
  filiere: string;
  filiereNom: string;
  annee: string;
  stagiaires: StagiaireItem[];
  competences: CompetenceItem[];
}

export interface FiliereOption {
  id: string;
  nom: string;
  secteurNom: string;
}
```

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

---

## Task 3 — Export client-side (export.ts)

**Files:**
- Modify: `src/lib/export.ts`

- [ ] **Étape 1 : Ajouter exportProgressionExcel à src/lib/export.ts**

Ajouter à la fin du fichier :

```typescript
export function exportProgressionExcel(
  groupeNom: string,
  competences: { id: string; titre: string }[],
  stagiaires: { nom: string; prenom: string; progressions: { competenceId: string; pourcentage: number }[] }[]
): void {
  import("xlsx").then((XLSX) => {
    const headers = ["Stagiaire", ...competences.map((c) => c.titre)];
    const rows = stagiaires.map((s) => {
      const row: (string | number)[] = [`${s.prenom} ${s.nom}`];
      for (const c of competences) {
        const p = s.progressions.find((p) => p.competenceId === c.id);
        row.push(p ? p.pourcentage : "");
      }
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 20 }, ...competences.map(() => ({ wch: 15 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Progression");

    // Feuille moyennes
    const moyenneHeaders = ["Compétence", "Moyenne (%)"];
    const moyenneRows = competences.map((c) => {
      const vals = stagiaires
        .map((s) => s.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? null)
        .filter((v): v is number => v !== null);
      const moy = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "";
      return [c.titre, moy];
    });
    const wsMoy = XLSX.utils.aoa_to_sheet([moyenneHeaders, ...moyenneRows]);
    XLSX.utils.book_append_sheet(wb, wsMoy, "Moyennes");

    XLSX.writeFile(wb, `${groupeNom.replace(/\s+/g, "-")}-progression.xlsx`);
  });
}

export function exportProgressionPDF(
  groupeNom: string,
  filiere: string,
  annee: string,
  competences: { id: string; titre: string }[],
  stagiaires: { nom: string; prenom: string; progressions: { competenceId: string; pourcentage: number }[] }[]
): void {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const GREEN: [number, number, number] = [132, 204, 22];
    const DARK: [number, number, number] = [11, 11, 20];

    // En-tête
    doc.setFillColor(...DARK);
    doc.rect(0, 0, 297, 210, "F");
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 297, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...GREEN);
    doc.text("OFPPT — Suivi des Compétences", 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Groupe : ${groupeNom}  |  Filière : ${filiere}  |  Année : ${annee}`, 14, 22);
    doc.text(`Généré le : ${new Date().toLocaleDateString("fr-MA")}`, 14, 28);

    // Tableau
    const colWidth = Math.min(30, Math.floor((270 - 40) / competences.length));
    const startX = 14;
    let y = 36;

    // En-tête tableau
    doc.setFillColor(18, 18, 30);
    doc.rect(startX, y, 40, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GREEN);
    doc.text("Stagiaire", startX + 1, y + 5);
    competences.forEach((c, i) => {
      const x = startX + 40 + i * colWidth;
      doc.rect(x, y, colWidth, 7, "F");
      const label = c.titre.length > 12 ? c.titre.slice(0, 12) + "…" : c.titre;
      doc.text(label, x + 1, y + 5);
    });
    y += 7;

    // Lignes stagiaires
    doc.setFont("helvetica", "normal");
    stagiaires.forEach((s, idx) => {
      if (y > 190) { doc.addPage(); y = 20; }
      const bg: [number, number, number] = idx % 2 === 0 ? [12, 12, 20] : [18, 18, 30];
      doc.setFillColor(...bg);
      doc.rect(startX, y, 40 + competences.length * colWidth, 6, "F");
      doc.setTextColor(220, 220, 220);
      doc.text(`${s.prenom} ${s.nom}`, startX + 1, y + 4.5);
      competences.forEach((c, i) => {
        const val = s.progressions.find((p) => p.competenceId === c.id)?.pourcentage;
        const x = startX + 40 + i * colWidth;
        if (val !== undefined) {
          const color: [number, number, number] =
            val >= 75 ? [132, 204, 22] : val >= 50 ? [245, 158, 11] : [239, 68, 68];
          doc.setTextColor(...color);
          doc.text(`${val}%`, x + 1, y + 4.5);
        } else {
          doc.setTextColor(75, 85, 99);
          doc.text("—", x + 1, y + 4.5);
        }
      });
      y += 6;
    });

    doc.save(`${groupeNom.replace(/\s+/g, "-")}-progression.pdf`);
  });
}
```

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

---

## Task 4 — API : Groupes CRUD

**Files:**
- Create: `src/app/api/groupes/route.ts`
- Create: `src/app/api/groupes/[id]/route.ts`

- [ ] **Étape 1 : Créer src/app/api/groupes/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const groupes = await prisma.groupe.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { stagiaires: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filiereIds = [...new Set(groupes.map((g) => g.filiere))];
  const filieres = await prisma.filiere.findMany({
    where: { id: { in: filiereIds } },
    select: { id: true, nom: true },
  });
  const filiereMap = Object.fromEntries(filieres.map((f) => [f.id, f.nom]));

  return NextResponse.json(
    groupes.map((g) => ({ ...g, filiereNom: filiereMap[g.filiere] ?? g.filiere }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { nom, filiereId, annee } = await req.json();
  if (!nom || !filiereId || !annee)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const groupe = await prisma.groupe.create({
    data: { nom, filiere: filiereId, annee, userId: session.user.id },
  });

  return NextResponse.json(groupe, { status: 201 });
}
```

- [ ] **Étape 2 : Créer src/app/api/groupes/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const groupe = await prisma.groupe.findFirst({
    where: { id, userId: session.user.id },
    include: {
      stagiaires: {
        orderBy: { nom: "asc" },
        include: {
          progressions: {
            select: { competenceId: true, pourcentage: true, source: true },
          },
        },
      },
    },
  });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const filiere = await prisma.filiere.findUnique({
    where: { id: groupe.filiere },
    select: { nom: true },
  });

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    include: { module: { select: { nom: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ...groupe,
    filiereNom: filiere?.nom ?? groupe.filiere,
    competences: competences.map((c) => ({
      id: c.id,
      titre: c.titre,
      moduleNom: c.module.nom,
    })),
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.groupe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Étape 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Étape 4 : Commit**

```bash
git add src/app/api/groupes/
git commit -m "feat(suivi): API groupes CRUD"
```

---

## Task 5 — API : Stagiaires + Template Excel

**Files:**
- Create: `src/app/api/groupes/[id]/stagiaires/route.ts`
- Create: `src/app/api/groupes/[id]/stagiaires/import/route.ts`
- Create: `src/app/api/groupes/template/route.ts`
- Create: `src/app/api/stagiaires/[id]/route.ts`

- [ ] **Étape 1 : Créer src/app/api/groupes/[id]/stagiaires/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id: groupeId, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const { nom, prenom, cne } = await req.json();
  if (!nom || !prenom)
    return NextResponse.json({ error: "Nom et prénom requis" }, { status: 400 });

  const stagiaire = await prisma.stagiaire.create({
    data: { nom, prenom, cne: cne || null, groupeId },
  });

  return NextResponse.json(stagiaire, { status: 201 });
}
```

- [ ] **Étape 2 : Créer src/app/api/groupes/[id]/stagiaires/import/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { read, utils } from "xlsx";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id: groupeId, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const toCreate = rows
    .map((row) => ({
      nom: String(row["Nom"] ?? row["NOM"] ?? "").trim(),
      prenom: String(row["Prénom"] ?? row["Prenom"] ?? row["PRÉNOM"] ?? "").trim(),
      cne: String(row["CNE"] ?? row["Cne"] ?? "").trim() || null,
    }))
    .filter((r) => r.nom && r.prenom);

  if (toCreate.length === 0)
    return NextResponse.json({ error: "Aucun stagiaire valide trouvé. Vérifiez les colonnes : Nom, Prénom, CNE" }, { status: 400 });

  const result = await prisma.stagiaire.createMany({
    data: toCreate.map((r) => ({ ...r, groupeId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ created: result.count, total: toCreate.length });
}
```

- [ ] **Étape 3 : Créer src/app/api/groupes/template/route.ts**

```typescript
import { NextResponse } from "next/server";
import { utils, write } from "xlsx";

export async function GET() {
  const ws = utils.aoa_to_sheet([
    ["Nom", "Prénom", "CNE"],
    ["Exemple", "Prénom Exemple", "ABC123456"],
  ]);
  ws["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Stagiaires");
  const buffer = write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-stagiaires.xlsx"',
    },
  });
}
```

- [ ] **Étape 4 : Créer src/app/api/stagiaires/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const stagiaire = await prisma.stagiaire.findFirst({
    where: { id },
    include: { groupe: { select: { userId: true } } },
  });
  if (!stagiaire || stagiaire.groupe.userId !== session.user.id)
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.stagiaire.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Étape 5 : Commit**

```bash
git add src/app/api/groupes/ src/app/api/stagiaires/
git commit -m "feat(suivi): API stagiaires ajout manuel + import Excel + template"
```

---

## Task 6 — API : Progressions + Import Notes

**Files:**
- Create: `src/app/api/progressions/route.ts`
- Create: `src/app/api/progressions/import-notes/[groupeId]/route.ts`
- Create: `src/app/api/progressions/template/[groupeId]/route.ts`

- [ ] **Étape 1 : Créer src/app/api/progressions/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { stagiaireId, competenceId, pourcentage } = await req.json();
  if (!stagiaireId || !competenceId || typeof pourcentage !== "number")
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  if (pourcentage < 0 || pourcentage > 100)
    return NextResponse.json({ error: "Pourcentage doit être entre 0 et 100" }, { status: 400 });

  const stagiaire = await prisma.stagiaire.findFirst({
    where: { id: stagiaireId },
    include: { groupe: { select: { userId: true } } },
  });
  if (!stagiaire || stagiaire.groupe.userId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const progression = await prisma.progressionCompetence.upsert({
    where: { stagiaireId_competenceId: { stagiaireId, competenceId } },
    update: { pourcentage, source: "manuel" },
    create: { stagiaireId, competenceId, pourcentage, source: "manuel" },
  });

  return NextResponse.json(progression);
}
```

- [ ] **Étape 2 : Créer src/app/api/progressions/import-notes/[groupeId]/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { read, utils } from "xlsx";

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
    include: { stagiaires: true },
  });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    select: { id: true, titre: true },
  });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const fullName = String(row["Stagiaire"] ?? "").trim();
    const competenceTitre = String(row["Compétence"] ?? row["Competence"] ?? "").trim();
    const note = Number(row["Note (/20)"] ?? row["Note"] ?? -1);

    if (!fullName || !competenceTitre || note < 0 || note > 20) continue;

    const stagiaire = groupe.stagiaires.find(
      (s) => `${s.prenom} ${s.nom}`.toLowerCase() === fullName.toLowerCase()
    );
    const competence = competences.find(
      (c) => c.titre.toLowerCase() === competenceTitre.toLowerCase()
    );

    if (!stagiaire) { errors.push(`Stagiaire introuvable : ${fullName}`); continue; }
    if (!competence) { errors.push(`Compétence introuvable : ${competenceTitre}`); continue; }

    const pourcentage = Math.round((note / 20) * 100);
    await prisma.progressionCompetence.upsert({
      where: { stagiaireId_competenceId: { stagiaireId: stagiaire.id, competenceId: competence.id } },
      update: { pourcentage, source: "import" },
      create: { stagiaireId: stagiaire.id, competenceId: competence.id, pourcentage, source: "import" },
    });
    imported++;
  }

  return NextResponse.json({ imported, errors: errors.slice(0, 10) });
}
```

- [ ] **Étape 3 : Créer src/app/api/progressions/template/[groupeId]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { utils, write } from "xlsx";

export async function GET(_: Request, { params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
    include: { stagiaires: { orderBy: { nom: "asc" } } },
  });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    select: { titre: true },
    orderBy: { createdAt: "asc" },
  });

  const headers = ["Stagiaire", "Compétence", "Note (/20)"];
  const rows: string[][] = [];
  for (const s of groupe.stagiaires) {
    for (const c of competences) {
      rows.push([`${s.prenom} ${s.nom}`, c.titre, ""]);
    }
  }

  const ws = utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 12 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Notes");
  const buffer = write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-notes-${groupeId}.xlsx"`,
    },
  });
}
```

- [ ] **Étape 4 : Commit**

```bash
git add src/app/api/progressions/
git commit -m "feat(suivi): API progressions upsert + import notes + templates"
```

---

## Task 7 — Page /suivi : Liste des groupes

**Files:**
- Create: `src/app/suivi/page.tsx`
- Create: `src/components/suivi/GroupeCard.tsx`

- [ ] **Étape 1 : Créer src/components/suivi/GroupeCard.tsx**

```tsx
"use client";

import Link from "next/link";
import { GroupeSummary } from "@/types/suivi";

export default function GroupeCard({ groupe, onDelete }: { groupe: GroupeSummary; onDelete: (id: string) => void }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "#111116", border: "1px solid #1E1E2C" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{groupe.nom}</h3>
          <p className="text-xs mt-1" style={{ color: "#84CC16" }}>{groupe.filiereNom}</p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: "#84CC1614", color: "#84CC16", border: "1px solid #84CC1630" }}
        >
          {groupe.annee}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        {groupe._count.stagiaires} stagiaire{groupe._count.stagiaires > 1 ? "s" : ""}
      </div>

      <div className="flex gap-2 pt-1">
        <Link
          href={`/suivi/${groupe.id}`}
          className="flex-1 text-center text-xs py-2 rounded-xl font-medium transition-colors"
          style={{ background: "#84CC1618", color: "#84CC16", border: "1px solid #84CC1630" }}
        >
          Voir progression
        </Link>
        <Link
          href={`/suivi/${groupe.id}/stagiaires`}
          className="text-xs py-2 px-3 rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
        >
          Stagiaires
        </Link>
        <button
          onClick={() => onDelete(groupe.id)}
          className="text-xs py-2 px-3 rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#6B7280" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7F1D1D"; (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1E1E2C"; (e.currentTarget as HTMLButtonElement).style.color = "#6B7280"; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer src/app/suivi/page.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import GroupeCard from "@/components/suivi/GroupeCard";
import { GroupeSummary } from "@/types/suivi";

export default function SuiviPage() {
  const [groupes, setGroupes] = useState<GroupeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroupes = useCallback(async () => {
    const res = await fetch("/api/groupes");
    if (res.ok) setGroupes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroupes(); }, [fetchGroupes]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce groupe et tous ses stagiaires ?")) return;
    await fetch(`/api/groupes/${id}`, { method: "DELETE" });
    setGroupes((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Suivi des Compétences</h1>
          <p className="mt-1 text-sm" style={{ color: "#9CA3AF" }}>Gérez vos groupes et suivez la progression par compétence</p>
        </div>
        <Link
          href="/suivi/nouveau"
          className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
          style={{ background: "#84CC16", color: "#0B0B14" }}
        >
          + Nouveau groupe
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#84CC16] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groupes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "1px dashed #1E1E2C" }}
        >
          <div className="text-4xl mb-3">👥</div>
          <p className="text-white font-medium mb-1">Aucun groupe créé</p>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>Créez votre premier groupe pour commencer le suivi</p>
          <Link
            href="/suivi/nouveau"
            className="px-4 py-2 text-sm font-semibold rounded-xl"
            style={{ background: "#84CC16", color: "#0B0B14" }}
          >
            Créer un groupe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groupes.map((g) => (
            <GroupeCard key={g.id} groupe={g} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/app/suivi/page.tsx src/components/suivi/GroupeCard.tsx
git commit -m "feat(suivi): page liste groupes"
```

---

## Task 8 — Page /suivi/nouveau : Formulaire création groupe

**Files:**
- Create: `src/components/suivi/GroupeForm.tsx`
- Create: `src/app/suivi/nouveau/page.tsx`

- [ ] **Étape 1 : Créer src/components/suivi/GroupeForm.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiliereOption } from "@/types/suivi";

const ANNEES = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];

export default function GroupeForm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [annee, setAnnee] = useState(ANNEES[1]);
  const [filieres, setFilieres] = useState<FiliereOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/referentiel")
      .then((r) => r.json())
      .then((secteurs: { nom: string; filieres: { id: string; nom: string }[] }[]) => {
        const opts: FiliereOption[] = [];
        for (const s of secteurs) {
          for (const f of s.filieres) {
            opts.push({ id: f.id, nom: f.nom, secteurNom: s.nom });
          }
        }
        setFilieres(opts);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !filiereId || !annee) { setError("Tous les champs sont requis"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/groupes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, filiereId, annee }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Erreur lors de la création");
      setLoading(false);
      return;
    }

    const groupe = await res.json();
    router.push(`/suivi/${groupe.id}/stagiaires`);
  };

  const inputStyle = {
    background: "#12121E",
    border: "1px solid #1E1E2C",
    color: "#E5E7EB",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>Nom du groupe</label>
        <input
          type="text"
          placeholder="ex: G1 TS Dev Digital"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>Filière</label>
        {filieres.length === 0 ? (
          <p className="text-xs" style={{ color: "#EF4444" }}>
            Aucune filière dans le référentiel. Importez d&apos;abord un référentiel via Modules &amp; Paramètres.
          </p>
        ) : (
          <select
            value={filiereId}
            onChange={(e) => setFiliereId(e.target.value)}
            style={{ ...inputStyle, appearance: "none" }}
          >
            <option value="">Choisir une filière</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>{f.nom} — {f.secteurNom}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>Année scolaire</label>
        <select
          value={annee}
          onChange={(e) => setAnnee(e.target.value)}
          style={{ ...inputStyle, appearance: "none" }}
        >
          {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 text-sm rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors"
          style={{ background: loading ? "#4B5563" : "#84CC16", color: "#0B0B14" }}
        >
          {loading ? "Création…" : "Créer le groupe"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Étape 2 : Créer src/app/suivi/nouveau/page.tsx**

```tsx
import GroupeForm from "@/components/suivi/GroupeForm";

export default function NouveauGroupePage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nouveau groupe</h1>
        <p className="mt-1 text-sm" style={{ color: "#9CA3AF" }}>
          Créez un groupe de stagiaires pour commencer le suivi des compétences
        </p>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
        <GroupeForm />
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/app/suivi/nouveau/ src/components/suivi/GroupeForm.tsx
git commit -m "feat(suivi): page création groupe"
```

---

## Task 9 — Page /suivi/[groupeId]/stagiaires

**Files:**
- Create: `src/components/suivi/StagiairesManager.tsx`
- Create: `src/app/suivi/[groupeId]/stagiaires/page.tsx`

- [ ] **Étape 1 : Créer src/components/suivi/StagiairesManager.tsx**

```tsx
"use client";

import { useState, useCallback } from "react";
import { StagiaireItem } from "@/types/suivi";

interface Props {
  groupeId: string;
  initialStagiaires: StagiaireItem[];
}

export default function StagiairesManager({ groupeId, initialStagiaires }: Props) {
  const [stagiaires, setStagiaires] = useState(initialStagiaires);
  const [showModal, setShowModal] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [cne, setCne] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/groupes/${groupeId}`);
    if (res.ok) {
      const data = await res.json();
      setStagiaires(data.stagiaires);
    }
  }, [groupeId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/groupes/${groupeId}/stagiaires`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, prenom, cne }),
    });
    if (res.ok) {
      await refresh();
      setNom(""); setPrenom(""); setCne("");
      setShowModal(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce stagiaire ?")) return;
    await fetch(`/api/stagiaires/${id}`, { method: "DELETE" });
    setStagiaires((prev) => prev.filter((s) => s.id !== id));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/groupes/${groupeId}/stagiaires/import`, { method: "POST", body: form });
    const json = await res.json();
    if (res.ok) {
      await refresh();
      setImportMsg(`✓ ${json.created} stagiaire(s) importé(s)`);
    } else {
      setImportMsg(`Erreur : ${json.error}`);
    }
    setImporting(false);
    e.target.value = "";
  };

  const inputStyle = {
    background: "#12121E", border: "1px solid #1E1E2C", color: "#E5E7EB",
    borderRadius: "10px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none",
  };

  return (
    <div>
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-semibold rounded-xl"
          style={{ background: "#84CC16", color: "#0B0B14" }}
        >
          + Ajouter un stagiaire
        </button>

        <label
          className="px-4 py-2 text-sm font-medium rounded-xl cursor-pointer transition-colors"
          style={{ border: "1px solid #84CC1640", color: "#84CC16", background: "#84CC1610" }}
        >
          {importing ? "Import en cours…" : "Importer Excel"}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
        </label>

        <a
          href="/api/groupes/template"
          download
          className="px-4 py-2 text-sm rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
        >
          ↓ Template Excel
        </a>

        {importMsg && (
          <span
            className="text-xs px-3 py-2 rounded-xl"
            style={{
              background: importMsg.startsWith("✓") ? "#84CC1614" : "#7F1D1D20",
              color: importMsg.startsWith("✓") ? "#84CC16" : "#EF4444",
              border: `1px solid ${importMsg.startsWith("✓") ? "#84CC1630" : "#7F1D1D40"}`,
            }}
          >
            {importMsg}
          </span>
        )}
      </div>

      {/* Table */}
      {stagiaires.length === 0 ? (
        <div
          className="flex flex-col items-center py-16 rounded-2xl"
          style={{ border: "1px dashed #1E1E2C" }}
        >
          <div className="text-3xl mb-2">👤</div>
          <p className="text-sm" style={{ color: "#6B7280" }}>Aucun stagiaire. Ajoutez-en ou importez un fichier Excel.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1E1E2C" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#12121E", borderBottom: "1px solid #1E1E2C" }}>
                {["Nom", "Prénom", "CNE", "Ajouté le", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6B7280" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stagiaires.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    background: i % 2 === 0 ? "#0D0D12" : "#111116",
                    borderBottom: "1px solid #1E1E2C",
                  }}
                >
                  <td className="px-4 py-3 font-medium text-white">{s.nom}</td>
                  <td className="px-4 py-3" style={{ color: "#E5E7EB" }}>{s.prenom}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>{s.cne ?? "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>
                    {new Date(s.createdAt).toLocaleDateString("fr-MA")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs px-2 py-1 rounded-lg transition-colors"
                      style={{ color: "#6B7280", border: "1px solid #1E1E2C" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6B7280"; }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ajout */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6" style={{ background: "#12121E", border: "1px solid #1E1E2C" }}>
            <h3 className="font-bold text-white mb-5">Ajouter un stagiaire</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9CA3AF" }}>Nom *</label>
                <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" required />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9CA3AF" }}>Prénom *</label>
                <input style={inputStyle} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ahmed" required />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9CA3AF" }}>CNE (optionnel)</label>
                <input style={inputStyle} value={cne} onChange={(e) => setCne(e.target.value)} placeholder="ABC123456" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm rounded-xl" style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}>Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-xl" style={{ background: "#84CC16", color: "#0B0B14" }}>
                  {saving ? "Ajout…" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Étape 2 : Créer src/app/suivi/[groupeId]/stagiaires/page.tsx**

```tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import StagiairesManager from "@/components/suivi/StagiairesManager";

export default async function StagiairesPage({ params }: { params: { groupeId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const groupe = await prisma.groupe.findFirst({
    where: { id: params.groupeId, userId: session.user.id },
    include: {
      stagiaires: {
        orderBy: { nom: "asc" },
        include: { progressions: { select: { competenceId: true, pourcentage: true, source: true } } },
      },
    },
  });
  if (!groupe) notFound();

  const filiere = await prisma.filiere.findUnique({ where: { id: groupe.filiere }, select: { nom: true } });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "#6B7280" }}>
        <Link href="/suivi" className="hover:text-white transition-colors">Suivi</Link>
        <span>/</span>
        <Link href={`/suivi/${groupe.id}`} className="hover:text-white transition-colors">{groupe.nom}</Link>
        <span>/</span>
        <span className="text-white">Stagiaires</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{groupe.nom}</h1>
          <p className="mt-1 text-sm" style={{ color: "#84CC16" }}>
            {filiere?.nom ?? groupe.filiere} · {groupe.annee}
          </p>
        </div>
      </div>

      <StagiairesManager
        groupeId={groupe.id}
        initialStagiaires={groupe.stagiaires.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          progressions: s.progressions,
        }))}
      />
    </div>
  );
}
```

- [ ] **Étape 3 : Commit**

```bash
git add src/app/suivi/*/stagiaires/ src/components/suivi/StagiairesManager.tsx
git commit -m "feat(suivi): page gestion stagiaires + import Excel"
```

---

## Task 10 — Composant ProgressionCharts

**Files:**
- Create: `src/components/suivi/ProgressionCharts.tsx`

- [ ] **Étape 1 : Créer src/components/suivi/ProgressionCharts.tsx**

```tsx
"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { CompetenceItem, StagiaireItem } from "@/types/suivi";

interface Props {
  competences: CompetenceItem[];
  stagiaires: StagiaireItem[];
  selectedStagiaireId: string | null;
}

const tooltipStyle = {
  contentStyle: { background: "#12121E", border: "1px solid #1E1E2C", color: "#E5E7EB", fontSize: 12, borderRadius: 8 },
  cursor: { fill: "#84CC1610" },
};

function pctColor(v: number): string {
  return v >= 75 ? "#84CC16" : v >= 50 ? "#F59E0B" : "#EF4444";
}

function shortLabel(titre: string, max = 14): string {
  return titre.length > max ? titre.slice(0, max) + "…" : titre;
}

export default function ProgressionCharts({ competences, stagiaires, selectedStagiaireId }: Props) {
  const [tab, setTab] = useState<"groupe" | "profil">("groupe");

  // BarChart data: moyenne par compétence
  const barData = competences.map((c) => {
    const vals = stagiaires
      .map((s) => s.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? null)
      .filter((v): v is number => v !== null);
    return {
      name: shortLabel(c.titre),
      moyenne: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });

  // RadarChart data: profil stagiaire sélectionné
  const selectedStagiaire = stagiaires.find((s) => s.id === selectedStagiaireId);
  const radarData = competences.map((c) => ({
    competence: shortLabel(c.titre, 12),
    score: selectedStagiaire?.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? 0,
  }));

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#111116", border: "1px solid #1E1E2C" }}
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(["groupe", "profil"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
            style={
              tab === t
                ? { background: "#84CC1618", color: "#84CC16", border: "1px solid #84CC1630" }
                : { border: "1px solid #1E1E2C", color: "#6B7280" }
            }
          >
            {t === "groupe" ? "Moyenne groupe" : "Profil stagiaire"}
          </button>
        ))}
      </div>

      {tab === "groupe" && (
        <>
          <p className="text-xs mb-3" style={{ color: "#6B7280" }}>Moyenne de progression par compétence</p>
          {barData.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "#4B5563" }}>
              Aucune compétence référentiel pour cette filière
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 10 }} unit="%" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Moyenne"]} />
                <Bar dataKey="moyenne" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={pctColor(entry.moyenne)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}

      {tab === "profil" && (
        <>
          {!selectedStagiaire ? (
            <p className="text-xs text-center py-8" style={{ color: "#4B5563" }}>
              Cliquez sur un stagiaire dans le tableau pour voir son profil
            </p>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                Profil de <span className="text-white font-medium">{selectedStagiaire.prenom} {selectedStagiaire.nom}</span>
              </p>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1E1E2C" />
                  <PolarAngleAxis dataKey="competence" tick={{ fill: "#6B7280", fontSize: 9 }} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Score"]} />
                  <Radar dataKey="score" stroke="#84CC16" fill="#84CC16" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/components/suivi/ProgressionCharts.tsx
git commit -m "feat(suivi): ProgressionCharts (BarChart + RadarChart)"
```

---

## Task 11 — Page /suivi/[groupeId] : Tableau + Charts

**Files:**
- Create: `src/components/suivi/ProgressionTable.tsx`
- Create: `src/app/suivi/[groupeId]/page.tsx`

- [ ] **Étape 1 : Créer src/components/suivi/ProgressionTable.tsx**

```tsx
"use client";

import { useState, useCallback } from "react";
import { CompetenceItem, StagiaireItem } from "@/types/suivi";
import ProgressionCharts from "./ProgressionCharts";
import { exportProgressionExcel, exportProgressionPDF } from "@/lib/export";

interface Props {
  groupeId: string;
  groupeNom: string;
  filiereNom: string;
  annee: string;
  initialStagiaires: StagiaireItem[];
  competences: CompetenceItem[];
}

function pctBadgeStyle(v: number | undefined) {
  if (v === undefined) return { color: "#4B5563", background: "transparent" };
  if (v >= 75) return { color: "#84CC16", background: "#84CC1614" };
  if (v >= 50) return { color: "#F59E0B", background: "#F59E0B14" };
  return { color: "#EF4444", background: "#EF444414" };
}

export default function ProgressionTable({
  groupeId, groupeNom, filiereNom, annee,
  initialStagiaires, competences,
}: Props) {
  const [stagiaires, setStagiaires] = useState(initialStagiaires);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const handleCellBlur = useCallback(
    async (stagiaireId: string, competenceId: string, value: string) => {
      const pourcentage = parseInt(value, 10);
      if (isNaN(pourcentage) || pourcentage < 0 || pourcentage > 100) return;

      setStagiaires((prev) =>
        prev.map((s) =>
          s.id !== stagiaireId
            ? s
            : {
                ...s,
                progressions: [
                  ...s.progressions.filter((p) => p.competenceId !== competenceId),
                  { competenceId, pourcentage, source: "manuel" },
                ],
              }
        )
      );

      await fetch("/api/progressions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagiaireId, competenceId, pourcentage }),
      });
    },
    []
  );

  const handleImportNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/progressions/import-notes/${groupeId}`, { method: "POST", body: form });
    const json = await res.json();
    if (res.ok) {
      // Refresh stagiaires data
      const refreshRes = await fetch(`/api/groupes/${groupeId}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setStagiaires(data.stagiaires);
      }
      setImportMsg(`✓ ${json.imported} progression(s) importée(s)`);
    } else {
      setImportMsg(`Erreur : ${json.error}`);
    }
    setImporting(false);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => exportProgressionExcel(groupeNom, competences, stagiaires)}
          className="px-3 py-2 text-xs font-medium rounded-xl transition-colors"
          style={{ border: "1px solid #84CC1640", color: "#84CC16", background: "#84CC1610" }}
        >
          Export Excel
        </button>
        <button
          onClick={() => exportProgressionPDF(groupeNom, filiereNom, annee, competences, stagiaires)}
          className="px-3 py-2 text-xs font-medium rounded-xl transition-colors"
          style={{ border: "1px solid #84CC1640", color: "#84CC16", background: "#84CC1610" }}
        >
          Export PDF
        </button>
        <label
          className="px-3 py-2 text-xs font-medium rounded-xl cursor-pointer transition-colors"
          style={{ border: "1px solid #F59E0B40", color: "#F59E0B", background: "#F59E0B10" }}
        >
          {importing ? "Import…" : "Importer notes"}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportNotes} disabled={importing} />
        </label>
        <a
          href={`/api/progressions/template/${groupeId}`}
          download
          className="px-3 py-2 text-xs rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
        >
          ↓ Template notes
        </a>
        {importMsg && (
          <span
            className="text-xs px-3 py-2 rounded-xl"
            style={{
              background: importMsg.startsWith("✓") ? "#84CC1614" : "#7F1D1D20",
              color: importMsg.startsWith("✓") ? "#84CC16" : "#EF4444",
              border: `1px solid ${importMsg.startsWith("✓") ? "#84CC1630" : "#7F1D1D40"}`,
            }}
          >
            {importMsg}
          </span>
        )}
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Tableau — 3/5 */}
        <div className="xl:col-span-3">
          {competences.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 rounded-2xl"
              style={{ border: "1px dashed #1E1E2C" }}
            >
              <p className="text-sm mb-1 text-white">Aucune compétence référentiel</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Importez le référentiel de cette filière via Modules &amp; Paramètres
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid #1E1E2C" }}>
              <table className="text-xs min-w-full">
                <thead>
                  <tr style={{ background: "#12121E", borderBottom: "1px solid #1E1E2C" }}>
                    <th className="px-4 py-3 text-left font-semibold sticky left-0 z-10" style={{ color: "#6B7280", background: "#12121E", minWidth: 140 }}>
                      Stagiaire
                    </th>
                    {competences.map((c) => (
                      <th
                        key={c.id}
                        className="px-2 py-3 text-center font-semibold"
                        style={{ color: "#6B7280", minWidth: 80, maxWidth: 120 }}
                        title={`${c.titre} — ${c.moduleNom}`}
                      >
                        <span className="block truncate max-w-[100px]">{c.titre}</span>
                        <span className="block text-[9px] truncate max-w-[100px]" style={{ color: "#4B5563" }}>{c.moduleNom}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stagiaires.length === 0 ? (
                    <tr>
                      <td colSpan={competences.length + 1} className="text-center py-10" style={{ color: "#4B5563" }}>
                        Aucun stagiaire. <a href={`/suivi/${groupeId}/stagiaires`} className="underline" style={{ color: "#84CC16" }}>Ajouter des stagiaires →</a>
                      </td>
                    </tr>
                  ) : (
                    stagiaires.map((s, i) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          background: s.id === selectedId ? "#84CC1610" : i % 2 === 0 ? "#0D0D12" : "#111116",
                          borderBottom: "1px solid #1E1E2C",
                          outline: s.id === selectedId ? "1px solid #84CC1630" : "none",
                        }}
                      >
                        <td className="px-4 py-2.5 font-medium sticky left-0 z-10" style={{ background: "inherit", color: s.id === selectedId ? "#84CC16" : "#E5E7EB" }}>
                          {s.prenom} {s.nom}
                        </td>
                        {competences.map((c) => {
                          const prog = s.progressions.find((p) => p.competenceId === c.id);
                          return (
                            <td key={c.id} className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={prog?.pourcentage ?? ""}
                                placeholder="—"
                                onBlur={(e) => handleCellBlur(s.id, c.id, e.target.value)}
                                className="w-14 text-center rounded-lg py-1 text-xs font-semibold transition-colors"
                                style={{
                                  background: "#12121E",
                                  border: "1px solid #1E1E2C",
                                  ...pctBadgeStyle(prog?.pourcentage),
                                  outline: "none",
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts — 2/5 */}
        <div className="xl:col-span-2">
          <ProgressionCharts
            competences={competences}
            stagiaires={stagiaires}
            selectedStagiaireId={selectedId}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Créer src/app/suivi/[groupeId]/page.tsx**

```tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProgressionTable from "@/components/suivi/ProgressionTable";

export default async function GroupeDetailPage({ params }: { params: { groupeId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const groupe = await prisma.groupe.findFirst({
    where: { id: params.groupeId, userId: session.user.id },
    include: {
      stagiaires: {
        orderBy: { nom: "asc" },
        include: {
          progressions: { select: { competenceId: true, pourcentage: true, source: true } },
        },
      },
    },
  });
  if (!groupe) notFound();

  const filiere = await prisma.filiere.findUnique({ where: { id: groupe.filiere }, select: { nom: true } });

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    include: { module: { select: { nom: true } } },
    orderBy: { createdAt: "asc" },
  });

  const filiereNom = filiere?.nom ?? groupe.filiere;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "#6B7280" }}>
        <Link href="/suivi" className="hover:text-white transition-colors">Suivi</Link>
        <span>/</span>
        <span className="text-white">{groupe.nom}</span>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{groupe.nom}</h1>
          <p className="mt-1 text-sm" style={{ color: "#84CC16" }}>
            {filiereNom} · {groupe.annee}
          </p>
        </div>
        <Link
          href={`/suivi/${groupe.id}/stagiaires`}
          className="px-4 py-2 text-sm rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
        >
          Gérer les stagiaires
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Stagiaires", value: groupe.stagiaires.length },
          { label: "Compétences", value: competences.length },
          {
            label: "Progression moyenne",
            value: (() => {
              const all = groupe.stagiaires.flatMap((s) => s.progressions.map((p) => p.pourcentage));
              return all.length ? `${Math.round(all.reduce((a, b) => a + b, 0) / all.length)}%` : "—";
            })(),
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <ProgressionTable
        groupeId={groupe.id}
        groupeNom={groupe.nom}
        filiereNom={filiereNom}
        annee={groupe.annee}
        competences={competences.map((c) => ({ id: c.id, titre: c.titre, moduleNom: c.module.nom }))}
        initialStagiaires={groupe.stagiaires.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          progressions: s.progressions,
        }))}
      />
    </div>
  );
}
```

- [ ] **Étape 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Étape 4 : Commit**

```bash
git add src/app/suivi/ src/components/suivi/ProgressionTable.tsx
git commit -m "feat(suivi): page principale tableau progression + charts"
```

---

## Task 12 — Dashboard Widget + NavSidebar

**Files:**
- Create: `src/components/suivi/DashboardSuiviWidget.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/ui/NavSidebar.tsx`

- [ ] **Étape 1 : Créer src/components/suivi/DashboardSuiviWidget.tsx**

```tsx
"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { CompetenceItem, StagiaireItem } from "@/types/suivi";

interface Props {
  competences: CompetenceItem[];
  stagiaires: StagiaireItem[];
  groupesCount: number;
}

const tooltipStyle = {
  contentStyle: { background: "#12121E", border: "1px solid #1E1E2C", color: "#E5E7EB", fontSize: 11, borderRadius: 8 },
};

export default function DashboardSuiviWidget({ competences, stagiaires, groupesCount }: Props) {
  const barData = competences.slice(0, 6).map((c) => {
    const vals = stagiaires
      .map((s) => s.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? null)
      .filter((v): v is number => v !== null);
    return {
      name: c.titre.length > 12 ? c.titre.slice(0, 12) + "…" : c.titre,
      val: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });

  if (groupesCount === 0) {
    return (
      <div className="rounded-2xl p-5 flex flex-col items-center justify-center py-10" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
        <p className="text-sm font-medium text-white mb-1">Suivi des Compétences</p>
        <p className="text-xs mb-3" style={{ color: "#6B7280" }}>Aucun groupe créé</p>
        <Link href="/suivi/nouveau" className="text-xs font-medium" style={{ color: "#84CC16" }}>
          Créer un groupe →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white text-sm">Suivi des Compétences</h2>
        <Link href="/suivi" className="text-xs font-medium" style={{ color: "#84CC16" }}>Voir tout →</Link>
      </div>
      <div className="flex gap-4 mb-4 text-xs" style={{ color: "#6B7280" }}>
        <span><span className="text-white font-semibold">{groupesCount}</span> groupe{groupesCount > 1 ? "s" : ""}</span>
        <span><span className="text-white font-semibold">{stagiaires.length}</span> stagiaires</span>
      </div>
      {barData.length > 0 ? (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={barData} margin={{ top: 0, right: 5, bottom: 25, left: -20 }}>
            <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 9 }} unit="%" />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Moy."]} />
            <Bar dataKey="val" radius={[3, 3, 0, 0]} maxBarSize={30}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.val >= 75 ? "#84CC16" : entry.val >= 50 ? "#F59E0B" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-center py-6" style={{ color: "#4B5563" }}>Aucune donnée de progression saisie</p>
      )}
    </div>
  );
}
```

- [ ] **Étape 2 : Modifier src/app/page.tsx**

Ajouter l'import en haut :
```typescript
import DashboardSuiviWidget from "@/components/suivi/DashboardSuiviWidget";
```

Ajouter après `let recentFiches` et avant le bloc `try` :
```typescript
let groupesCount = 0;
let allStagiaires: { id: string; nom: string; prenom: string; cne: string | null; createdAt: string; progressions: { competenceId: string; pourcentage: number; source: string }[] }[] = [];
let topCompetences: { id: string; titre: string; moduleNom: string }[] = [];
```

Dans le bloc `try`, ajouter dans le `Promise.all` :
```typescript
prisma.groupe.count({ where: { userId: session.user.id } }),
```
Et récupérer le count : `[seancesCount, fichesCount, modulesCount, groupesCount] = await Promise.all([...])`.

Puis après le `Promise.all`, ajouter :
```typescript
if (groupesCount > 0) {
  const groupes = await prisma.groupe.findMany({
    where: { userId: session.user.id },
    include: {
      stagiaires: {
        include: { progressions: { select: { competenceId: true, pourcentage: true, source: true } } },
      },
    },
    take: 3,
  });
  allStagiaires = groupes.flatMap((g) =>
    g.stagiaires.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
    }))
  );
  if (groupes[0]) {
    const comps = await prisma.competence.findMany({
      where: { module: { filiereId: groupes[0].filiere } },
      include: { module: { select: { nom: true } } },
      take: 6,
      orderBy: { createdAt: "asc" },
    });
    topCompetences = comps.map((c) => ({ id: c.id, titre: c.titre, moduleNom: c.module.nom }));
  }
}
```

Dans le JSX, dans la grille `grid grid-cols-1 lg:grid-cols-2`, remplacer le bloc "Statistiques + Accès rapide" pour ajouter le widget après les quick actions :
```tsx
<DashboardSuiviWidget
  competences={topCompetences}
  stagiaires={allStagiaires}
  groupesCount={groupesCount}
/>
```

- [ ] **Étape 3 : Modifier src/components/ui/NavSidebar.tsx**

Ajouter dans le tableau `navSections` (après la section "ASSISTANT") :
```typescript
{
  label: "SUIVI DES COMPÉTENCES",
  items: [
    { href: "/suivi", label: "Mes groupes", icon: <BarChartIcon />, exact: false },
  ],
},
```

Ajouter le composant `BarChartIcon` en haut du fichier avec les autres icônes :
```tsx
const BarChartIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
```

- [ ] **Étape 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Étape 5 : Test rapide dans le navigateur**

```bash
npm run dev
```

Vérifier :
1. Sidebar affiche "SUIVI DES COMPÉTENCES → Mes groupes"
2. `/suivi` → page liste (vide ou avec groupes)
3. `/suivi/nouveau` → formulaire avec dropdown filières
4. Créer un groupe → redirige vers `/suivi/[id]/stagiaires`
5. Ajouter un stagiaire manuellement → apparaît dans le tableau
6. `/suivi/[id]` → tableau éditable + graphiques
7. Modifier un % dans une cellule → sauvegardé onBlur
8. Export Excel + PDF fonctionnels
9. Dashboard → widget "Suivi des Compétences" visible

- [ ] **Étape 6 : Commit final**

```bash
git add src/components/suivi/DashboardSuiviWidget.tsx src/app/page.tsx src/components/ui/NavSidebar.tsx
git commit -m "feat(suivi): dashboard widget + sidebar navigation"
```

- [ ] **Étape 7 : Push + déploiement**

```bash
git push origin master
```

Vercel déploie automatiquement depuis le push. Suivre le build sur le dashboard Vercel.
