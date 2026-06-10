# PDF Professionnel OFPPT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un en-tête OFPPT (logo + titre + date) et un pied de page formateur (nom, matricule, établissement, numéro de page) à tous les exports PDF, et permettre au formateur de renseigner son matricule et établissement dans les paramètres.

**Architecture:** Deux helpers partagés `pdfHeader`/`pdfFooter` dans `src/lib/pdf-helpers.ts` s'appliquent aux 3 fonctions PDF existantes. Les champs `matricule`/`etablissement` sont ajoutés au modèle `User`, enrichis dans le token NextAuth, et configurables dans `Sidebar.tsx`.

**Tech Stack:** jsPDF, Prisma/PostgreSQL, NextAuth v5, Next.js 14 App Router

---

## File Map

| Fichier | Action |
|---|---|
| `prisma/schema.prisma` | Modifier — ajouter 2 champs User |
| `src/types/next-auth.d.ts` | Créer — type augmentation NextAuth |
| `src/auth.ts` | Modifier — callbacks jwt + session |
| `src/app/api/user/profile/route.ts` | Créer — PATCH endpoint |
| `src/lib/pdf-helpers.ts` | Créer — helpers pdfHeader + pdfFooter |
| `src/lib/export.ts` | Modifier — 3 fonctions PDF refactorisées |
| `src/components/ui/AppShell.tsx` | Modifier — user type étendu |
| `src/components/ui/Sidebar.tsx` | Modifier — section profil formateur |
| `src/app/seances/page.tsx` | Modifier — passer formateur à exportToPDF |
| `src/components/ui/SeanceDetailClient.tsx` | Modifier — passer formateur à exportToPDF |
| `src/app/evaluations/page.tsx` | Modifier — passer formateur à exportToPDF |
| `src/components/ui/FicheDetailClient.tsx` | Modifier — await exportFichePDF + formateur |
| `src/components/suivi/ProgressionTable.tsx` | Modifier — passer formateur à exportProgressionPDF |

---

### Task 1: Migration Prisma — champs matricule + etablissement

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1 : Ajouter les 2 champs au modèle User**

Ouvrir `prisma/schema.prisma`. Repérer le modèle `User` (commence ligne ~13). Ajouter les 2 lignes après `createdAt` :

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String
  password     String
  createdAt    DateTime      @default(now())
  matricule    String?
  etablissement String?
  seances      Seance[]
  modules      UserModule[]
  fiches       Fiche[]
  chatSessions ChatSession[]
  groupes      Groupe[]
}
```

- [ ] **Step 2 : Appliquer la migration**

```bash
cd "c:/A__MON PC/ELMUSTAPHA/Mémoire 22/FORMATEUR OPPT/generateur-seances-ofppt"
npx prisma migrate dev --name add-user-profile
```

Expected output: `✔ Generated Prisma Client` et `The following migration was created: .../add-user-profile`

- [ ] **Step 3 : Vérifier le client Prisma régénéré**

```bash
npx tsc --noEmit
```

Expected: aucune erreur TypeScript.

- [ ] **Step 4 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add matricule and etablissement to User model"
```

---

### Task 2: Type augmentation NextAuth

**Files:**
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1 : Créer le fichier de types**

Créer `src/types/next-auth.d.ts` avec ce contenu exact :

```ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      matricule?: string | null;
      etablissement?: string | null;
    };
  }

  interface User {
    matricule?: string | null;
    etablissement?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    matricule?: string | null;
    etablissement?: string | null;
  }
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/types/next-auth.d.ts
git commit -m "feat: augment NextAuth types with matricule and etablissement"
```

---

### Task 3: Enrichir les callbacks NextAuth

**Files:**
- Modify: `src/auth.ts`

- [ ] **Step 1 : Mettre à jour src/auth.ts**

Remplacer le contenu complet de `src/auth.ts` par :

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          matricule: user.matricule ?? null,
          etablissement: user.etablissement ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.matricule = user.matricule ?? null;
        token.etablissement = user.etablissement ?? null;
      }
      // Refresh token when session is updated (after PATCH /api/user/profile)
      if (trigger === "update" && session) {
        token.matricule = session.user?.matricule ?? token.matricule;
        token.etablissement = session.user?.etablissement ?? token.etablissement;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.name = token.name as string;
      session.user.matricule = token.matricule ?? null;
      session.user.etablissement = token.etablissement ?? null;
      return session;
    },
  },
});
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/auth.ts
git commit -m "feat: pass matricule and etablissement through NextAuth JWT"
```

---

### Task 4: API PATCH /api/user/profile

**Files:**
- Create: `src/app/api/user/profile/route.ts`

- [ ] **Step 1 : Créer le répertoire et le fichier route**

Créer `src/app/api/user/profile/route.ts` avec ce contenu :

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const matricule = typeof body.matricule === "string" ? body.matricule.slice(0, 100) : null;
  const etablissement = typeof body.etablissement === "string" ? body.etablissement.slice(0, 100) : null;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { matricule, etablissement },
    select: { name: true, matricule: true, etablissement: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
```

- [ ] **Step 2 : Tester l'endpoint manuellement**

Démarrer le serveur dev : `npm run dev`

Depuis un onglet connecté, ouvrir la console du navigateur et exécuter :

```js
fetch("/api/user/profile", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ matricule: "9559", etablissement: "ISTA Test" }),
}).then(r => r.json()).then(console.log)
```

Expected: `{ success: true, user: { name: "...", matricule: "9559", etablissement: "ISTA Test" } }`

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/user/profile/route.ts
git commit -m "feat: add PATCH /api/user/profile endpoint"
```

---

### Task 5: Créer les helpers PDF partagés

**Files:**
- Create: `src/lib/pdf-helpers.ts`

- [ ] **Step 1 : Créer src/lib/pdf-helpers.ts**

```ts
import { jsPDF } from "jspdf";

export interface PdfHeaderOptions {
  titre: string;
  type: string;
  logoBase64?: string | null;
}

export interface PdfFormateur {
  name: string;
  matricule?: string | null;
  etablissement?: string | null;
}

let _logoBase64: string | null | undefined = undefined;

export async function getLogoBase64(): Promise<string | null> {
  if (_logoBase64 !== undefined) return _logoBase64;
  try {
    const res = await fetch("/logo-ofppt.jpg");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        _logoBase64 = reader.result as string;
        resolve(_logoBase64!);
      };
      reader.onerror = () => {
        _logoBase64 = null;
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    _logoBase64 = null;
    return null;
  }
}

export function pdfHeader(doc: jsPDF, opts: PdfHeaderOptions): void {
  const W = doc.internal.pageSize.getWidth();
  const GREEN: [number, number, number] = [132, 204, 22];

  // Bande verte supérieure
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 3, "F");

  // Logo OFPPT (14×14 mm, à gauche)
  if (opts.logoBase64) {
    try {
      doc.addImage(opts.logoBase64, "JPEG", 10, 5, 14, 14);
    } catch {
      // logo optionnel — ignorer si erreur
    }
  }

  // "OFPPT — <Type>" en vert, centré
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GREEN);
  doc.text(`OFPPT — ${opts.type}`, W / 2, 12, { align: "center" });

  // Titre du document, gris, centré
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const shortTitre = opts.titre.length > 80 ? opts.titre.slice(0, 80) + "…" : opts.titre;
  doc.text(shortTitre, W / 2, 17, { align: "center" });

  // Date à droite
  const dateStr = new Date().toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.setFontSize(7);
  doc.text(dateStr, W - 10, 12, { align: "right" });

  // Ligne séparatrice
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, 22, W - 10, 22);
}

export function pdfFooter(
  doc: jsPDF,
  formateur: PdfFormateur,
  pageNum: number,
  totalPages: number
): void {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const GREEN: [number, number, number] = [132, 204, 22];
  const footerY = H - 12;

  // Ligne séparatrice
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, footerY, W - 10, footerY);

  // Bande verte inférieure
  doc.setFillColor(...GREEN);
  doc.rect(0, H - 2, W, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);

  const mat = formateur.matricule ?? "—";
  const etab = formateur.etablissement ?? "—";

  doc.text(`Formateur : ${formateur.name}   |   Mat. : ${mat}`, 10, footerY + 5);
  doc.text(`Établissement : ${etab}`, 10, footerY + 9);
  doc.text(`Page ${pageNum} / ${totalPages}`, W - 10, footerY + 7, { align: "right" });
}

export function stampAllPages(
  doc: jsPDF,
  opts: PdfHeaderOptions,
  formateur: PdfFormateur
): void {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    pdfHeader(doc, opts);
    pdfFooter(doc, formateur, i, total);
  }
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/pdf-helpers.ts
git commit -m "feat: add pdfHeader, pdfFooter, stampAllPages helpers"
```

---

### Task 6: Refactoriser les 3 fonctions PDF dans export.ts

**Files:**
- Modify: `src/lib/export.ts`

- [ ] **Step 1 : Ajouter l'import des helpers en haut de export.ts**

Ajouter après la première ligne d'imports existants :

```ts
import { getLogoBase64, stampAllPages, PdfFormateur } from "@/lib/pdf-helpers";
```

- [ ] **Step 2 : Remplacer exportToPDF**

Repérer `export async function exportToPDF(contenu: string, titre: string)` (ligne ~96) et remplacer la fonction entière :

```ts
export async function exportToPDF(
  contenu: string,
  titre: string,
  formateur?: PdfFormateur,
  type = "Séance Pédagogique"
) {
  const logoBase64 = await getLogoBase64();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentTop = 26;
  const contentBottom = pageH - 16;
  const lineH = 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);

  const lines = doc.splitTextToSize(
    contenu.replace(/[#*`|]/g, "").replace(/\n{3,}/g, "\n\n"),
    pageW - 30
  );

  let y = contentTop;
  for (const line of lines) {
    if (y + lineH > contentBottom) {
      doc.addPage();
      y = contentTop;
    }
    doc.text(line, 15, y);
    y += lineH;
  }

  if (formateur) {
    stampAllPages(doc, { titre, type, logoBase64 }, formateur);
  }

  doc.save(`${titre.replace(/\s+/g, "-")}.pdf`);
}
```

- [ ] **Step 3 : Remplacer exportFichePDF (async)**

Repérer `export function exportFichePDF(contenu: string, titre: string): void` (ligne ~144) et remplacer :

```ts
export async function exportFichePDF(
  contenu: string,
  titre: string,
  formateur?: PdfFormateur
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const logoBase64 = await getLogoBase64();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentTop = 26;
  const contentBottom = pageH - 16;
  const lineH = 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);

  const lines = contenu
    .replace(/#{1,6} /g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .split("\n")
    .filter(Boolean);

  let y = contentTop;
  for (const rawLine of lines) {
    const wrapped = doc.splitTextToSize(rawLine, pageW - 30);
    if (y + wrapped.length * lineH > contentBottom) {
      doc.addPage();
      y = contentTop;
    }
    doc.text(wrapped, 15, y);
    y += wrapped.length * lineH + 2;
  }

  if (formateur) {
    stampAllPages(doc, { titre, type: "Fiche Pédagogique", logoBase64 }, formateur);
  }

  doc.save(`${titre.replace(/\s+/g, "-")}.pdf`);
}
```

- [ ] **Step 4 : Remplacer exportProgressionPDF**

Repérer `export function exportProgressionPDF(` (ligne ~223) et remplacer la fonction entière :

```ts
export function exportProgressionPDF(
  groupeNom: string,
  filiere: string,
  annee: string,
  competences: { id: string; titre: string }[],
  stagiaires: { nom: string; prenom: string; progressions: { competenceId: string; pourcentage: number }[] }[],
  formateur?: PdfFormateur
): void {
  import("jspdf").then(async ({ default: jsPDF }) => {
    const logoBase64 = await getLogoBase64();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const titre = `Suivi — ${groupeNom} | ${filiere} | ${annee}`;
    const colWidth = Math.min(30, Math.floor((W - 60) / Math.max(competences.length, 1)));
    const startX = 14;
    let y = 28; // start below header zone

    // En-tête tableau
    doc.setFillColor(18, 18, 30);
    doc.rect(startX, y, 40, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(132, 204, 22);
    doc.text("Stagiaire", startX + 1, y + 5);

    competences.forEach((c, i) => {
      const x = startX + 40 + i * colWidth;
      doc.setFillColor(18, 18, 30);
      doc.rect(x, y, colWidth, 7, "F");
      const label = c.titre.length > 12 ? c.titre.slice(0, 12) + "…" : c.titre;
      doc.text(label, x + 1, y + 5);
    });
    y += 7;

    // Lignes stagiaires
    doc.setFont("helvetica", "normal");
    stagiaires.forEach((s, idx) => {
      if (y > pageH - 20) {
        doc.addPage();
        y = 28;
      }
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

    if (formateur) {
      stampAllPages(doc, { titre, type: "Suivi des Compétences", logoBase64 }, formateur);
    }

    doc.save(`${groupeNom.replace(/\s+/g, "-")}-progression.pdf`);
  });
}
```

- [ ] **Step 5 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/export.ts
git commit -m "feat: refactor PDF exports with pro header/footer helpers"
```

---

### Task 7: Mettre à jour AppShell — user type étendu

**Files:**
- Modify: `src/components/ui/AppShell.tsx`

- [ ] **Step 1 : Étendre le type AppShellProps**

Remplacer le contenu complet de `src/components/ui/AppShell.tsx` :

```tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import NavSidebar from "@/components/ui/NavSidebar";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    matricule?: string | null;
    etablissement?: string | null;
  } | null;
  claudeKey: boolean;
  openaiKey: boolean;
}

export default function AppShell({ children, user, claudeKey, openaiKey }: AppShellProps) {
  const [dashOpen, setDashOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen overflow-hidden">
        <NavSidebar user={user} onSettingsClick={() => setDashOpen(true)} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <main className="flex-1 overflow-y-auto" style={{ background: "#0A0A0F" }}>
            {children}
          </main>
        </div>
      </div>
      <Sidebar
        open={dashOpen}
        onClose={() => setDashOpen(false)}
        user={user}
        claudeKey={claudeKey}
        openaiKey={openaiKey}
      />
    </>
  );
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 3 : Commit**

```bash
git add src/components/ui/AppShell.tsx
git commit -m "feat: extend AppShell user type with matricule and etablissement"
```

---

### Task 8: Ajouter la section profil dans Sidebar.tsx

**Files:**
- Modify: `src/components/ui/Sidebar.tsx`

- [ ] **Step 1 : Étendre le type SidebarProps**

Repérer (ligne ~29) :

```ts
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: { name?: string | null; email?: string | null };
  claudeKey: boolean;
  openaiKey: boolean;
}
```

Remplacer par :

```ts
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    matricule?: string | null;
    etablissement?: string | null;
  };
  claudeKey: boolean;
  openaiKey: boolean;
}
```

- [ ] **Step 2 : Ajouter les états pour le formulaire profil**

Dans la fonction `Sidebar`, après les états existants (ligne ~50, après `const sidebarRef = useRef...`), ajouter :

```ts
const [matricule, setMatricule] = useState(user.matricule ?? "");
const [etablissement, setEtablissement] = useState(user.etablissement ?? "");
const [savingProfile, setSavingProfile] = useState(false);

const saveProfile = async () => {
  setSavingProfile(true);
  try {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricule: matricule.trim(), etablissement: etablissement.trim() }),
    });
    if (!res.ok) throw new Error("Erreur");
    toast.success("Profil sauvegardé — reconnectez-vous pour actualiser les PDF");
  } catch {
    toast.error("Erreur lors de la sauvegarde");
  } finally {
    setSavingProfile(false);
  }
};
```

- [ ] **Step 3 : Ajouter la section UI dans le JSX**

Repérer la section `{/* Profil */}` (ligne ~206). Après le bloc du bouton "Déconnexion" (après `</button>` de déconnexion, avant `</section>`), insérer :

```tsx
{/* Infos PDF */}
<div className="mt-4 space-y-2">
  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4B5563" }}>Infos pour les PDF</p>
  <input
    type="text"
    placeholder="Matricule (ex: 9559)"
    value={matricule}
    onChange={e => setMatricule(e.target.value)}
    className="w-full text-xs px-3 py-2 rounded-lg outline-none"
    style={{ background: "#17171E", border: "1px solid #1E1E2C", color: "#E5E7EB" }}
  />
  <input
    type="text"
    placeholder="Établissement (ex: ISTA Hay Riad)"
    value={etablissement}
    onChange={e => setEtablissement(e.target.value)}
    className="w-full text-xs px-3 py-2 rounded-lg outline-none"
    style={{ background: "#17171E", border: "1px solid #1E1E2C", color: "#E5E7EB" }}
  />
  <button
    onClick={saveProfile}
    disabled={savingProfile}
    className="w-full text-xs py-2 rounded-lg font-medium text-black disabled:opacity-50 transition-colors"
    style={{ background: "#84CC16" }}
  >
    {savingProfile ? "Sauvegarde…" : "Sauvegarder le profil"}
  </button>
</div>
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 5 : Commit**

```bash
git add src/components/ui/Sidebar.tsx
git commit -m "feat: add matricule/etablissement profile form in settings sidebar"
```

---

### Task 9: Mettre à jour les call sites PDF

**Files:**
- Modify: `src/app/seances/page.tsx`
- Modify: `src/components/ui/SeanceDetailClient.tsx`
- Modify: `src/app/evaluations/page.tsx`
- Modify: `src/components/ui/FicheDetailClient.tsx`
- Modify: `src/components/suivi/ProgressionTable.tsx`

#### 9a — src/app/seances/page.tsx

- [ ] **Step 1 : Ajouter useSession et passer formateur**

Ajouter l'import en haut du fichier (après les imports existants) :

```ts
import { useSession } from "next-auth/react";
```

Dans le corps de `SeancesPage()`, après les états existants, ajouter :

```ts
const { data: session } = useSession();
const formateur = session?.user
  ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
  : undefined;
```

Repérer l'appel `onExportPDF={() => exportToPDF(contenu, titre)}` et le remplacer par :

```tsx
onExportPDF={() => exportToPDF(contenu, titre, formateur)}
```

#### 9b — src/components/ui/SeanceDetailClient.tsx

- [ ] **Step 2 : Ajouter useSession et passer formateur**

Ajouter l'import :

```ts
import { useSession } from "next-auth/react";
```

Dans `SeanceDetailClient`, ajouter :

```ts
const { data: session } = useSession();
const formateur = session?.user
  ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
  : undefined;
```

Repérer `onClick={() => exportToPDF(seance.contenu, seance.title)}` et remplacer :

```tsx
onClick={() => exportToPDF(seance.contenu, seance.title, formateur)}
```

#### 9c — src/app/evaluations/page.tsx

- [ ] **Step 3 : Ajouter useSession et passer formateur avec type**

Ajouter l'import :

```ts
import { useSession } from "next-auth/react";
```

Dans `EvaluationsPage()`, ajouter :

```ts
const { data: session } = useSession();
const formateur = session?.user
  ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
  : undefined;
```

Repérer `onExportPDF={() => exportToPDF(contenu, titre)}` et remplacer :

```tsx
onExportPDF={() => exportToPDF(contenu, titre, formateur, "Évaluation")}
```

#### 9d — src/components/ui/FicheDetailClient.tsx

- [ ] **Step 4 : Ajouter useSession, await exportFichePDF**

Ajouter l'import :

```ts
import { useSession } from "next-auth/react";
```

Dans `FicheDetailClient`, ajouter :

```ts
const { data: session } = useSession();
const formateur = session?.user
  ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
  : undefined;
```

Remplacer la fonction `handlePDF` :

```ts
async function handlePDF() {
  await exportFichePDF(fiche.contenu, fiche.titre, formateur);
}
```

#### 9e — src/components/suivi/ProgressionTable.tsx

- [ ] **Step 5 : Ajouter useSession et passer formateur**

Ajouter l'import :

```ts
import { useSession } from "next-auth/react";
```

Dans `ProgressionTable`, après les états existants, ajouter :

```ts
const { data: session } = useSession();
const formateur = session?.user
  ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
  : undefined;
```

Repérer `onClick={() => exportProgressionPDF(groupeNom, filiereNom, annee, competences, stagiaires)}` et remplacer :

```tsx
onClick={() => exportProgressionPDF(groupeNom, filiereNom, annee, competences, stagiaires, formateur)}
```

- [ ] **Step 6 : Vérifier la compilation globale**

```bash
npx tsc --noEmit
```

Expected: aucune erreur TypeScript.

- [ ] **Step 7 : Test complet en dev**

```bash
npm run dev
```

1. Ouvrir l'app → Paramètres → saisir Matricule `9559` et Établissement `ISTA Test` → Sauvegarder
2. Se déconnecter et se reconnecter (pour rafraîchir le token JWT)
3. Générer une séance → Exporter PDF → vérifier en-tête OFPPT et pied de page formateur
4. Ouvrir une fiche → Exporter PDF → même vérification
5. Générer une évaluation → Exporter PDF → type doit être "Évaluation"
6. Suivi des compétences → Exporter PDF → vérifier

- [ ] **Step 8 : Commit**

```bash
git add src/app/seances/page.tsx src/components/ui/SeanceDetailClient.tsx
git add src/app/evaluations/page.tsx src/components/ui/FicheDetailClient.tsx
git add src/components/suivi/ProgressionTable.tsx
git commit -m "feat: pass formateur profile to all PDF export call sites"
```

---

### Task 10: Build + Deploy

- [ ] **Step 1 : Build de production**

```bash
npm run build
```

Expected: `✓ Compiled successfully` — aucune erreur.

- [ ] **Step 2 : Déployer sur Vercel**

```bash
npx vercel --prod --yes
```

Expected: URL de déploiement production.

- [ ] **Step 3 : Vérification finale en production**

1. Se connecter sur l'URL de production
2. Paramètres → renseigner matricule + établissement → Sauvegarder
3. Se déconnecter / reconnecter
4. Exporter un PDF séance → vérifier logo OFPPT + en-tête + pied de page formateur
5. Exporter une fiche → vérifier
6. Exporter un PDF évaluation → le type doit afficher "Évaluation"

- [ ] **Step 4 : Commit final**

```bash
git add -A
git commit -m "feat: professional OFPPT PDF with header/footer — ready for production"
```
