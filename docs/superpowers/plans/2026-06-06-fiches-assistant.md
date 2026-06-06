# Fiches Pédagogiques + Assistant IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une sidebar gauche permanente, une section Fiches pédagogiques (génération IA + CRUD) et un Assistant IA chat avec streaming et historique.

**Architecture:** La sidebar gauche remplace la nav du header dans `layout.tsx`. AppShell est revu pour un layout flex (sidebar + contenu). Fiches et Chat sont des features indépendantes ajoutées par-dessus la navigation commune.

**Tech Stack:** Next.js 16 App Router, Prisma ORM, Claude API (streaming), Tailwind CSS, TypeScript, NextAuth v5

---

## File Map

**Créer :**
- `src/components/ui/NavSidebar.tsx`
- `src/lib/prompts.ts`
- `src/components/forms/FicheForm.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/SessionList.tsx`
- `src/app/fiches/page.tsx`
- `src/app/fiches/historique/page.tsx`
- `src/app/fiches/[id]/page.tsx`
- `src/app/assistant/page.tsx`
- `src/app/api/fiches/generate/route.ts`
- `src/app/api/fiches/route.ts`
- `src/app/api/fiches/[id]/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/chat/sessions/route.ts`
- `src/app/api/chat/sessions/[id]/route.ts`

**Modifier :**
- `prisma/schema.prisma` — ajouter Fiche, ChatSession, ChatMessage + relations User
- `src/components/ui/AppShell.tsx` — intégrer NavSidebar, layout flex
- `src/app/layout.tsx` — supprimer l'ancien header nav
- `src/lib/export.ts` — ajouter exportFichePDF / exportFicheWord
- `src/app/historique/[id]/page.tsx` — ajouter bouton "→ Créer une fiche"
- `src/types/seance.ts` — ajouter FicheFormData

---

## Task 1 : DB Schema — Fiche + ChatSession + ChatMessage

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **1.1 — Mettre à jour schema.prisma**

Remplacer le contenu complet de `prisma/schema.prisma` par :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String
  password     String
  createdAt    DateTime      @default(now())
  seances      Seance[]
  modules      UserModule[]
  fiches       Fiche[]
  chatSessions ChatSession[]
}

model UserModule {
  id        String   @id @default(cuid())
  groupe    String
  module    String
  mhg       Int
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@unique([groupe, module, userId])
}

model Seance {
  id        String   @id @default(cuid())
  title     String
  filiere   String
  module    String
  duree     String
  niveau    String
  type      String
  objectifs String
  contenu   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}

model Fiche {
  id                   String   @id @default(cuid())
  titre                String
  filiere              String
  module               String
  formateur            String
  duree                String
  niveau               String
  type                 String
  objectifsSavoir      String
  objectifsSavoirFaire String
  objectifsSavoirEtre  String
  prerequis            String
  contenu              String   @db.Text
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  userId               String
  user                 User     @relation(fields: [userId], references: [id])
  seanceId             String?
}

model ChatSession {
  id        String        @id @default(cuid())
  domaine   String
  createdAt DateTime      @default(now())
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  messages  ChatMessage[]
}

model ChatMessage {
  id        String      @id @default(cuid())
  role      String
  content   String      @db.Text
  createdAt DateTime    @default(now())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

- [ ] **1.2 — Lancer la migration**

```bash
cd "c:\A__MON PC\ELMUSTAPHA\Mémoire 22\FORMATEUR OPPT\generateur-seances-ofppt"
npx prisma migrate dev --name "add-fiche-chat-models"
```

Résultat attendu : `Your database is now in sync with your schema.`

- [ ] **1.3 — Vérifier dans Prisma Studio**

```bash
npx prisma studio
```

Ouvrir http://localhost:5555, vérifier que les tables `Fiche`, `ChatSession`, `ChatMessage` sont présentes.

- [ ] **1.4 — Commit**

```bash
git add prisma/
git commit -m "feat(db): add Fiche, ChatSession, ChatMessage models"
```

---

## Task 2 : Types + Prompts centralisés

**Files:**
- Modify: `src/types/seance.ts`
- Create: `src/lib/prompts.ts`

- [ ] **2.1 — Ajouter FicheFormData dans src/types/seance.ts**

Ajouter à la fin du fichier existant :

```typescript
export interface FicheFormData {
  filiere: string;
  module: string;
  intitule: string;
  formateur: string;
  duree: string;
  type: string;
  niveau: string;
  objectifsSavoir: string;
  objectifsSavoirFaire: string;
  objectifsSavoirEtre: string;
  prerequis: string;
}
```

- [ ] **2.2 — Créer src/lib/prompts.ts**

```typescript
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

export function buildFichePrompt(data: FicheFormData): string {
  return `Tu es un expert en pédagogie OFPPT. Génère une fiche pédagogique complète au format officiel OFPPT.

Filière : ${data.filiere}
Module : ${data.module}
Intitulé de la séance : ${data.intitule}
Formateur : ${data.formateur}
Durée : ${data.duree}
Type : ${data.type}
Niveau : ${data.niveau}

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
```

- [ ] **2.3 — Commit**

```bash
git add src/types/seance.ts src/lib/prompts.ts
git commit -m "feat: add FicheFormData type + centralize AI prompts"
```

---

## Task 3 : NavSidebar — Composant de navigation gauche

**Files:**
- Create: `src/components/ui/NavSidebar.tsx`

- [ ] **3.1 — Créer src/components/ui/NavSidebar.tsx**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavSidebarProps {
  user: { name?: string | null; email?: string | null };
}

const navItems = [
  { section: "OUTILS", items: [
    { href: "/", label: "Séances", icon: "📝", exact: true },
    { href: "/fiches", label: "Fiches pédag.", icon: "📋", exact: false },
    { href: "/assistant", label: "Assistant IA", icon: "🤖", exact: false },
  ]},
  { section: "HISTORIQUE", items: [
    { href: "/historique", label: "Mes séances", icon: "🕒", exact: false },
    { href: "/fiches/historique", label: "Mes fiches", icon: "📁", exact: false },
  ]},
];

export default function NavSidebar({ user }: NavSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = (user.name ?? user.email ?? "F").charAt(0).toUpperCase();

  return (
    <aside className="w-[190px] flex-shrink-0 bg-[#006633] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
        <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0">
          <Image src="/logo-ofppt.jpg" alt="OFPPT" width={32} height={32} className="object-cover w-full h-full" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">Competencia IA</div>
          <div className="text-green-300 text-[10px]">OFPPT</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-5 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.section}>
            <div className="text-[10px] text-green-300 font-semibold tracking-widest px-2 mb-1.5">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href, item.exact)
                      ? "bg-white/20 text-white font-semibold"
                      : "text-green-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4 pt-3 border-t border-white/15">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#C8A84B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user.name ?? "Formateur"}</div>
            <div className="text-green-300 text-[10px] truncate">{user.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-xs text-green-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg py-1.5 transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **3.2 — Commit**

```bash
git add src/components/ui/NavSidebar.tsx
git commit -m "feat: add NavSidebar left navigation component"
```

---

## Task 4 : AppShell + Layout — Intégrer la sidebar

**Files:**
- Modify: `src/components/ui/AppShell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **4.1 — Réécrire src/components/ui/AppShell.tsx**

```tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import NavSidebar from "@/components/ui/NavSidebar";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null } | null;
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
        <NavSidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <button
            onClick={() => setDashOpen(true)}
            aria-label="Ouvrir le tableau de bord"
            className="absolute top-3 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-lg bg-[#006633] hover:bg-[#005528] text-white transition-colors text-lg shadow-sm"
          >
            ⚙
          </button>
          <main className="flex-1 overflow-y-auto bg-gray-50">
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

- [ ] **4.2 — Simplifier src/app/layout.tsx** (supprimer l'ancien header)

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@/auth";
import Providers from "@/components/ui/Providers";
import AppShell from "@/components/ui/AppShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Competencia IA",
  description: "Générez des séances pédagogiques OFPPT en quelques secondes avec l'IA",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const claudeKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes("remplacer");
  const openaiKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("remplacer");

  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <AppShell user={session?.user ?? null} claudeKey={claudeKey} openaiKey={openaiKey}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **4.3 — Tester visuellement**

Ouvrir http://localhost:3000 (avec `npm run dev`).
- La sidebar verte doit être visible à gauche
- Le bouton ⚙ doit être en haut à droite du contenu
- Naviguer entre les pages et vérifier l'élément actif en surbrillance

- [ ] **4.4 — Commit**

```bash
git add src/components/ui/AppShell.tsx src/app/layout.tsx
git commit -m "feat: replace header nav with permanent left NavSidebar"
```

---

## Task 5 : API Fiches — Generate

**Files:**
- Create: `src/app/api/fiches/generate/route.ts`

- [ ] **5.1 — Créer src/app/api/fiches/generate/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { buildFichePrompt } from "@/lib/prompts";
import type { FicheFormData } from "@/types/seance";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const data: FicheFormData = await req.json();

  if (!data.filiere || !data.module || !data.intitule || !data.objectifsSavoir) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const prompt = buildFichePrompt(data);
  let contenu = "";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    contenu = (msg.content[0] as { type: string; text: string }).text;
  } catch {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      });
      contenu = completion.choices[0].message.content ?? "";
    } catch {
      return NextResponse.json({ error: "Les deux services IA sont indisponibles" }, { status: 503 });
    }
  }

  const fiche = await prisma.fiche.create({
    data: {
      titre: `${data.module} — ${data.intitule}`,
      filiere: data.filiere,
      module: data.module,
      formateur: data.formateur,
      duree: data.duree,
      niveau: data.niveau,
      type: data.type,
      objectifsSavoir: data.objectifsSavoir,
      objectifsSavoirFaire: data.objectifsSavoirFaire,
      objectifsSavoirEtre: data.objectifsSavoirEtre,
      prerequis: data.prerequis,
      contenu,
      userId: session.user.id,
      seanceId: (data as FicheFormData & { seanceId?: string }).seanceId ?? null,
    },
  });

  return NextResponse.json({ id: fiche.id, contenu });
}
```

- [ ] **5.2 — Commit**

```bash
git add src/app/api/fiches/
git commit -m "feat(api): add fiches generate endpoint"
```

---

## Task 6 : API Fiches — CRUD (liste + détail + suppression)

**Files:**
- Create: `src/app/api/fiches/route.ts`
- Create: `src/app/api/fiches/[id]/route.ts`

- [ ] **6.1 — Créer src/app/api/fiches/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const fiches = await prisma.fiche.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, titre: true, filiere: true, module: true, duree: true, type: true, niveau: true, createdAt: true },
  });

  return NextResponse.json(fiches);
}
```

- [ ] **6.2 — Créer src/app/api/fiches/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });

  return NextResponse.json(fiche);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });

  await prisma.fiche.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **6.3 — Commit**

```bash
git add src/app/api/fiches/
git commit -m "feat(api): add fiches CRUD routes"
```

---

## Task 7 : Composant FicheForm

**Files:**
- Create: `src/components/forms/FicheForm.tsx`

- [ ] **7.1 — Créer src/components/forms/FicheForm.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { FicheFormData } from "@/types/seance";
import { FILIERES_OFPPT } from "@/types/seance";

interface Props {
  onGenerate: (data: FicheFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<FicheFormData>;
}

export default function FicheForm({ onGenerate, isLoading, defaultValues }: Props) {
  const [form, setForm] = useState<FicheFormData>({
    filiere: "",
    module: "",
    intitule: "",
    formateur: "",
    duree: "2h",
    type: "theorique",
    niveau: "1ere-annee",
    objectifsSavoir: "",
    objectifsSavoirFaire: "",
    objectifsSavoirEtre: "",
    prerequis: "",
    ...defaultValues,
  });

  useEffect(() => {
    if (defaultValues) setForm((prev) => ({ ...prev, ...defaultValues }));
  }, [defaultValues]);

  const set = (field: keyof FicheFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-xl font-bold text-ofppt-green border-b border-gray-100 pb-4">
        Paramètres de la fiche
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Filière *</label>
          <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
            <option value="">— Choisir —</option>
            {FILIERES_OFPPT.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Module *</label>
          <input className="input-field" placeholder="Ex: M201 — Comptabilité générale" value={form.module} onChange={set("module")} required />
        </div>
      </div>

      <div>
        <label className="label">Intitulé de la séance *</label>
        <input className="input-field" placeholder="Ex: Les opérations de trésorerie" value={form.intitule} onChange={set("intitule")} required />
      </div>

      <div>
        <label className="label">Nom du formateur *</label>
        <input className="input-field" placeholder="Prénom NOM" value={form.formateur} onChange={set("formateur")} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Durée</label>
          <select className="input-field" value={form.duree} onChange={set("duree")}>
            {["1h","2h","3h","4h","6h"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Niveau</label>
          <select className="input-field" value={form.niveau} onChange={set("niveau")}>
            <option value="1ere-annee">1ère année</option>
            <option value="2eme-annee">2ème année</option>
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-field" value={form.type} onChange={set("type")}>
            <option value="theorique">Théorique</option>
            <option value="tp">TP</option>
            <option value="ta">TA</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Objectif — Savoir *</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Connaissances théoriques à acquérir" value={form.objectifsSavoir} onChange={set("objectifsSavoir")} required />
      </div>
      <div>
        <label className="label">Objectif — Savoir-faire *</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Compétences pratiques à développer" value={form.objectifsSavoirFaire} onChange={set("objectifsSavoirFaire")} required />
      </div>
      <div>
        <label className="label">Objectif — Savoir-être</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Attitudes et comportements professionnels (optionnel)" value={form.objectifsSavoirEtre} onChange={set("objectifsSavoirEtre")} />
      </div>
      <div>
        <label className="label">Prérequis des stagiaires</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Connaissances préalables requises (optionnel)" value={form.prerequis} onChange={set("prerequis")} />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer la fiche pédagogique"}
      </button>
    </form>
  );
}
```

- [ ] **7.2 — Commit**

```bash
git add src/components/forms/FicheForm.tsx
git commit -m "feat: add FicheForm component"
```

---

## Task 8 : Pages Fiches

**Files:**
- Create: `src/app/fiches/page.tsx`
- Create: `src/app/fiches/historique/page.tsx`
- Create: `src/app/fiches/[id]/page.tsx`

- [ ] **8.1 — Créer src/app/fiches/page.tsx**

```tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FicheForm from "@/components/forms/FicheForm";
import ReactMarkdown from "react-markdown";
import type { FicheFormData } from "@/types/seance";
import { toast } from "sonner";

function FichesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState("");
  const [ficheId, setFicheId] = useState("");
  const [defaultValues, setDefaultValues] = useState<Partial<FicheFormData>>({});

  useEffect(() => {
    const from = searchParams.get("from");
    if (!from) return;
    fetch(`/api/historique/${from}`)
      .then(r => r.json())
      .then(seance => {
        if (seance) {
          setDefaultValues({
            filiere: seance.filiere,
            module: seance.module,
            duree: seance.duree,
            niveau: seance.niveau,
            type: seance.type,
          });
        }
      })
      .catch(() => {});
  }, [searchParams]);

  async function handleGenerate(data: FicheFormData) {
    setIsLoading(true);
    setContenu("");
    try {
      const from = searchParams.get("from");
      const res = await fetch("/api/fiches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, seanceId: from ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setContenu(json.contenu);
      setFicheId(json.id);
      toast.success("Fiche générée et sauvegardée !");
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur lors de la génération");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fiches pédagogiques</h1>
        <p className="text-gray-500 text-sm mt-1">Générez une fiche pédagogique complète au format OFPPT</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FicheForm onGenerate={handleGenerate} isLoading={isLoading} defaultValues={defaultValues} />
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-xl font-bold text-ofppt-green">Fiche générée</h2>
            {ficheId && (
              <button
                onClick={() => router.push(`/fiches/${ficheId}`)}
                className="text-sm text-[#006633] hover:underline"
              >
                Voir le détail →
              </button>
            )}
          </div>
          {contenu ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{contenu}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              {isLoading ? "Génération en cours…" : "La fiche apparaîtra ici"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FichesPage() {
  return (
    <Suspense>
      <FichesContent />
    </Suspense>
  );
}
```

- [ ] **8.2 — Créer src/app/fiches/historique/page.tsx**

```tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function FichesHistoriquePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const fiches = await prisma.fiche.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, titre: true, filiere: true, module: true, duree: true, type: true, niveau: true, createdAt: true },
  });

  const typeLabel: Record<string, string> = { theorique: "Théorique", tp: "TP", ta: "TA" };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes fiches pédagogiques</h1>
          <p className="text-gray-500 text-sm mt-1">{fiches.length} fiche{fiches.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/fiches" className="btn-primary text-sm">+ Nouvelle fiche</Link>
      </div>

      {fiches.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucune fiche générée pour l'instant.</p>
          <Link href="/fiches" className="mt-4 inline-block text-[#006633] hover:underline text-sm">Créer ma première fiche →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {fiches.map((fiche) => (
            <Link key={fiche.id} href={`/fiches/${fiche.id}`} className="card block hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-[#006633] transition-colors">{fiche.titre}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{fiche.filiere}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{typeLabel[fiche.type] ?? fiche.type}</span>
                    <span className="text-xs text-gray-500">{fiche.duree} · {fiche.niveau === "1ere-annee" ? "1ère année" : "2ème année"}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(fiche.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **8.3 — Créer src/app/fiches/[id]/page.tsx**

```tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import FicheDetailClient from "@/components/ui/FicheDetailClient";

export default async function FicheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) notFound();

  return <FicheDetailClient fiche={fiche} />;
}
```

- [ ] **8.4 — Créer src/components/ui/FicheDetailClient.tsx**

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { exportFichePDF, exportFicheWord } from "@/lib/export";

interface Fiche {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  formateur: string;
  duree: string;
  niveau: string;
  type: string;
  contenu: string;
  createdAt: Date;
}

export default function FicheDetailClient({ fiche }: { fiche: Fiche }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Supprimer cette fiche ?")) return;
    await fetch(`/api/fiches/${fiche.id}`, { method: "DELETE" });
    toast.success("Fiche supprimée");
    router.push("/fiches/historique");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/fiches/historique" className="text-sm text-gray-500 hover:text-gray-700">← Mes fiches</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{fiche.titre}</h1>
          <p className="text-sm text-gray-500">{fiche.filiere} · {fiche.duree} · {new Date(fiche.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportFichePDF(fiche.contenu, fiche.titre)} className="text-sm border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">PDF</button>
          <button onClick={() => exportFicheWord(fiche.contenu, fiche.titre)} className="text-sm border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">Word</button>
          <button onClick={handleDelete} className="text-sm border border-red-200 text-red-500 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">Supprimer</button>
        </div>
      </div>
      <div className="card prose prose-sm max-w-none">
        <ReactMarkdown>{fiche.contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
```

- [ ] **8.5 — Commit**

```bash
git add src/app/fiches/ src/components/ui/FicheDetailClient.tsx
git commit -m "feat: add fiches pages (generate, historique, detail)"
```

---

## Task 9 : Export pour les Fiches

**Files:**
- Modify: `src/lib/export.ts`

- [ ] **9.1 — Lire src/lib/export.ts et ajouter les deux fonctions d'export**

Ajouter à la fin de `src/lib/export.ts` :

```typescript
export function exportFichePDF(contenu: string, titre: string): void {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const lines = contenu.replace(/#{1,6} /g, "").split("\n").filter(Boolean);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Competencia IA — OFPPT", 20, 20);
    doc.setFontSize(12);
    doc.text(titre, 20, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let y = 42;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, 170);
      if (y + wrapped.length * 5 > 280) { doc.addPage(); y = 20; }
      doc.text(wrapped, 20, y);
      y += wrapped.length * 5 + 2;
    }
    doc.save(`${titre.replace(/\s+/g, "-")}.pdf`);
  });
}

export async function exportFicheWord(contenu: string, titre: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const lines = contenu.split("\n").filter(Boolean);
  const children = lines.map((line) => {
    if (line.startsWith("## ")) return new Paragraph({ text: line.replace("## ", ""), heading: HeadingLevel.HEADING_2 });
    if (line.startsWith("### ")) return new Paragraph({ text: line.replace("### ", ""), heading: HeadingLevel.HEADING_3 });
    if (line.startsWith("# ")) return new Paragraph({ text: line.replace("# ", ""), heading: HeadingLevel.HEADING_1 });
    return new Paragraph({ children: [new TextRun({ text: line.replace(/\*\*(.*?)\*\*/g, "$1"), size: 22 })] });
  });
  const doc = new Document({ sections: [{ children }] });
  const blob = new Blob([await Packer.toBuffer(doc)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titre.replace(/\s+/g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **9.2 — Commit**

```bash
git add src/lib/export.ts
git commit -m "feat: add exportFichePDF and exportFicheWord to export lib"
```

---

## Task 10 : Lien Séance → Fiche depuis l'historique

**Files:**
- Modify: `src/app/historique/[id]/page.tsx`

- [ ] **10.1 — Lire src/app/historique/[id]/page.tsx**

Trouver le composant client (`SeanceDetailClient`) et y ajouter un bouton "Créer une fiche depuis cette séance" qui redirige vers `/fiches?from=<id>`.

Chercher dans `src/components/ui/SeanceDetailClient.tsx` et ajouter après les boutons export :

```tsx
import { useRouter } from "next/navigation";
// Dans le composant, récupérer id depuis props puis :
<Link
  href={`/fiches?from=${seance.id}`}
  className="text-sm border border-[#006633] text-[#006633] hover:bg-[#006633] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
>
  📋 Créer une fiche
</Link>
```

- [ ] **10.2 — Ajouter la route API pour récupérer une séance par ID depuis le client**

Créer `src/app/api/historique/[id]/route.ts` :

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const seance = await prisma.seance.findFirst({ where: { id, userId: session.user.id } });
  if (!seance) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(seance);
}
```

- [ ] **10.3 — Commit**

```bash
git add src/components/ui/SeanceDetailClient.tsx src/app/api/historique/
git commit -m "feat: add 'create fiche from seance' link in historique detail"
```

---

## Task 11 : API Chat — Sessions

**Files:**
- Create: `src/app/api/chat/sessions/route.ts`
- Create: `src/app/api/chat/sessions/[id]/route.ts`

- [ ] **11.1 — Créer src/app/api/chat/sessions/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { domaine } = await req.json();
  const chatSession = await prisma.chatSession.create({
    data: { domaine: domaine ?? "Général", userId: session.user.id },
  });

  return NextResponse.json(chatSession);
}
```

- [ ] **11.2 — Créer src/app/api/chat/sessions/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const chatSession = await prisma.chatSession.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chatSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  return NextResponse.json(chatSession);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const chatSession = await prisma.chatSession.findFirst({ where: { id, userId: session.user.id } });
  if (!chatSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  await prisma.chatSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **11.3 — Commit**

```bash
git add src/app/api/chat/
git commit -m "feat(api): add chat sessions CRUD routes"
```

---

## Task 12 : API Chat — Message avec streaming

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **12.1 — Créer src/app/api/chat/route.ts**

```typescript
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { buildChatSystemPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 });

  const { message, sessionId, domaine } = await req.json();

  if (!message || !sessionId) return new Response("Paramètres manquants", { status: 400 });

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chatSession) return new Response("Session introuvable", { status: 404 });

  await prisma.chatMessage.create({
    data: { role: "user", content: message, sessionId },
  });

  const history = chatSession.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: "claude-opus-4-5",
          max_tokens: 2048,
          system: buildChatSystemPrompt(domaine ?? "Général"),
          messages: history,
        });

        for await (const chunk of response) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
      } catch {
        controller.enqueue(new TextEncoder().encode("Désolé, une erreur s'est produite. Réessayez."));
      } finally {
        await prisma.chatMessage.create({
          data: { role: "assistant", content: fullResponse || "Erreur de génération", sessionId },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
```

- [ ] **12.2 — Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(api): add streaming chat endpoint"
```

---

## Task 13 : Composants Chat

**Files:**
- Create: `src/components/chat/ChatWindow.tsx`
- Create: `src/components/chat/ChatInput.tsx`
- Create: `src/components/chat/SessionList.tsx`

- [ ] **13.1 — Créer src/components/chat/ChatWindow.tsx**

```tsx
"use client";

import ReactMarkdown from "react-markdown";

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatWindow({ messages, isLoading }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Posez votre première question pédagogique…
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div className="w-7 h-7 rounded-full bg-[#006633] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
              IA
            </div>
          )}
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-[#006633] text-white rounded-tr-sm"
                : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && <span className="inline-block w-1.5 h-4 bg-[#006633] animate-pulse ml-0.5 align-middle" />}
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="w-7 h-7 rounded-full bg-[#006633] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">IA</div>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **13.2 — Créer src/components/chat/ChatInput.tsx**

```tsx
"use client";

import { useState, useRef } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function handleInput() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white px-4 py-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled}
          placeholder="Posez votre question pédagogique… (Entrée pour envoyer)"
          className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006633]/30 focus:border-[#006633] transition-colors bg-gray-50 disabled:opacity-50"
          style={{ minHeight: "42px", maxHeight: "120px" }}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="w-10 h-10 bg-[#006633] hover:bg-[#005528] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
    </form>
  );
}
```

- [ ] **13.3 — Créer src/components/chat/SessionList.tsx**

```tsx
"use client";

interface ChatSession {
  id: string;
  domaine: string;
  createdAt: string;
  messages: { content: string }[];
}

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function SessionList({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={onNew}
          className="w-full bg-[#006633] hover:bg-[#005528] text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-400 p-3 text-center">Aucune conversation</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                activeId === s.id ? "bg-green-50 border-l-2 border-l-[#006633]" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#006633] truncate">{s.domaine}</div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {s.messages[0]?.content ?? "Nouvelle conversation"}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs mt-0.5"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **13.4 — Commit**

```bash
git add src/components/chat/
git commit -m "feat: add ChatWindow, ChatInput, SessionList components"
```

---

## Task 14 : Page Assistant IA

**Files:**
- Create: `src/app/assistant/page.tsx`

- [ ] **14.1 — Créer src/app/assistant/page.tsx**

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatWindow, { Message } from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import SessionList from "@/components/chat/SessionList";
import { toast } from "sonner";

const DOMAINES = ["Comptabilité", "Finance", "Gestion", "Fiscalité", "Pédagogie générale"];

interface ChatSession {
  id: string;
  domaine: string;
  createdAt: string;
  messages: { content: string }[];
}

export default function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [domaine, setDomaine] = useState("Comptabilité");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function selectSession(id: string) {
    setActiveSessionId(id);
    const res = await fetch(`/api/chat/sessions/${id}`);
    const data = await res.json();
    setMessages(data.messages?.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })) ?? []);
    const s = sessions.find(s => s.id === id);
    if (s) setDomaine(s.domaine);
  }

  async function newSession() {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domaine }),
    });
    const session = await res.json();
    setActiveSessionId(session.id);
    setMessages([]);
    await loadSessions();
  }

  async function deleteSession(id: string) {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    await loadSessions();
    toast.success("Conversation supprimée");
  }

  async function sendMessage(content: string) {
    let sessionId = activeSessionId;

    if (!sessionId) {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domaine }),
      });
      const session = await res.json();
      sessionId = session.id;
      setActiveSessionId(sessionId);
    }

    setMessages(prev => [...prev, { role: "user", content }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId, domaine }),
      });

      if (!res.ok || !res.body) throw new Error("Erreur serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamedText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: streamedText, streaming: true };
          return updated;
        });
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: streamedText, streaming: false };
        return updated;
      });

      await loadSessions();
    } catch {
      toast.error("Erreur lors de l'envoi du message");
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      <SessionList
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={selectSession}
        onNew={newSession}
        onDelete={deleteSession}
      />

      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Assistant pédagogique IA</h1>
            <p className="text-xs text-gray-500">Questions pédagogiques OFPPT — {domaine}</p>
          </div>
          <div className="flex gap-1.5">
            {DOMAINES.map(d => (
              <button
                key={d}
                onClick={() => setDomaine(d)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  domaine === d
                    ? "bg-[#006633] text-white border-[#006633]"
                    : "border-gray-200 text-gray-600 hover:border-[#006633] hover:text-[#006633]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <ChatWindow messages={messages} isLoading={isLoading} />
        <div ref={bottomRef} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
```

- [ ] **14.2 — Tester le chat**

Ouvrir http://localhost:3000/assistant.
- Sélectionner "Comptabilité"
- Envoyer "Comment expliquer le bilan comptable à des débutants ?"
- Vérifier que la réponse s'affiche en streaming (caractère par caractère)
- Vérifier que la conversation apparaît dans la liste à gauche

- [ ] **14.3 — Commit**

```bash
git add src/app/assistant/
git commit -m "feat: add Assistant IA page with streaming chat"
```

---

## Task 15 : Commit final + push

- [ ] **15.1 — Vérifier que tout fonctionne**

Tester le flux complet :
1. Login → sidebar visible avec 5 items
2. Séances → générer une séance → bouton "📋 Créer une fiche" visible
3. Fiches → formulaire → générer → fiche en markdown
4. Fiches / Historique → liste des fiches
5. Assistant → chat avec streaming dans différents domaines

- [ ] **15.2 — Push final**

```bash
git push origin master
```

---

## Self-Review

**Couverture spec :**
- ✅ Sidebar gauche permanente (Task 3, 4)
- ✅ Fiches pédagogiques — formulaire + génération IA (Task 5, 7, 8)
- ✅ Fiches — export PDF/Word (Task 9)
- ✅ Fiches — historique + détail (Task 8)
- ✅ Lien séance → fiche (Task 10)
- ✅ Assistant IA avec streaming (Task 12, 14)
- ✅ Sélecteur de domaine (Task 14)
- ✅ Historique des conversations (Task 11, 13)
- ✅ DB models Fiche + ChatSession + ChatMessage (Task 1)
- ✅ prompts.ts centralisé (Task 2)

**Types cohérents :** `FicheFormData` défini en Task 2.1, utilisé en Task 5, 7, 8. `Message` défini en Task 13.1, utilisé en Task 14. `ChatSession` interface alignée entre Task 11 et Task 13/14.
