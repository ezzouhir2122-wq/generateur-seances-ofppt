# Page Paramètres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le slide-over "Modules & Paramètres" par une page dédiée `/parametres` en plein écran avec 4 onglets (Profil, Clés API, Référentiel, Compte & Sécurité).

**Architecture:** Server Component `page.tsx` charge les données initiales via Prisma, passe au Client Component `ParametresClient.tsx` qui gère les onglets. Chaque onglet est un composant isolé qui consomme les APIs REST existantes. Le slide-over (`Sidebar.tsx`) est supprimé ; le shell (`src/components/shell/index.tsx`) reçoit un `Link` à la place du bouton.

**Tech Stack:** Next.js 16 App Router · Tailwind CSS · PostgreSQL/Prisma · NextAuth v5 · bcryptjs · sonner (toasts) · xlsx (export Excel)

## Global Constraints

- Couleurs primaires : `#003087` (OFPPT bleu), `#16A34A` (vert actif)
- Background page : `#F8FAFC`
- Cards : `bg-white border border-[#E2E8F0] rounded-xl`
- Inputs : `bg-[#F3F4F6] border border-[#E2E8F0] rounded-lg`
- Auth : toujours vérifier `session?.user?.id` dans les API routes, retourner 401 sinon
- Pas de framework de test configuré — vérification manuelle dans le navigateur après chaque tâche
- Après chaque tâche : `git add` des fichiers concernés + `git commit`
- Ne jamais commiter `.env`

---

## Cartographie des fichiers

| Action | Fichier |
|--------|---------|
| Créer | `src/app/parametres/page.tsx` |
| Créer | `src/app/parametres/ParametresClient.tsx` |
| Créer | `src/components/parametres/ProfilTab.tsx` |
| Créer | `src/components/parametres/ApiTab.tsx` |
| Créer | `src/components/parametres/ReferentielTab.tsx` |
| Créer | `src/components/parametres/CompteTab.tsx` |
| Créer | `src/app/api/user/password/route.ts` |
| Créer | `src/app/api/user/account/route.ts` |
| Modifier | `src/components/shell/index.tsx` |
| Supprimer | `src/components/ui/Sidebar.tsx` |

---

## Task 1 : API — Changer le mot de passe

**Files:**
- Create: `src/app/api/user/password/route.ts`

**Interfaces:**
- Consumes: `PATCH /api/user/password` body `{ currentPassword: string, newPassword: string }`
- Produces: `200 { ok: true }` | `400 { error: string }` | `401 { error: string }`

- [ ] **Step 1 : Créer le fichier route**

```typescript
// src/app/api/user/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 8 caractères" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hash },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2 : Vérifier que le serveur compile**

```bash
npm run dev
```
Ouvre `http://localhost:3000`. Aucune erreur de compilation dans le terminal.

- [ ] **Step 3 : Tester manuellement avec curl**

```bash
# Depuis un shell avec session active (copier le cookie depuis le navigateur)
# Test mot de passe incorrect → doit retourner 400
curl -X PATCH http://localhost:3000/api/user/password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"mauvais","newPassword":"nouveaumdp123"}' \
  -b "next-auth.session-token=VOTRE_TOKEN"
# Attendu: {"error":"Mot de passe actuel incorrect"}
```

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/user/password/route.ts
git commit -m "feat: add PATCH /api/user/password endpoint"
```

---

## Task 2 : API — Supprimer le compte

**Files:**
- Create: `src/app/api/user/account/route.ts`

**Interfaces:**
- Consumes: `DELETE /api/user/account` (pas de body)
- Produces: `200 { ok: true }` | `401 { error: string }`
- Note: supprime manuellement Seance et UserModule avant User (pas de `onDelete: Cascade` sur ces relations dans le schéma Prisma actuel)

- [ ] **Step 1 : Créer le fichier route**

```typescript
// src/app/api/user/account/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  // Supprimer les relations sans cascade dans le schéma
  await prisma.seance.deleteMany({ where: { userId } });
  await prisma.userModule.deleteMany({ where: { userId } });

  // Supprimer le user (les autres relations ont onDelete: Cascade)
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2 : Vérifier compilation sans erreur**

```bash
npm run dev
```
Pas d'erreur TypeScript dans le terminal.

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/user/account/route.ts
git commit -m "feat: add DELETE /api/user/account endpoint"
```

---

## Task 3 : Page scaffold — `/parametres`

**Files:**
- Create: `src/app/parametres/page.tsx`
- Create: `src/app/parametres/ParametresClient.tsx`

**Interfaces:**
- `page.tsx` passe `initialUser: { name: string; email: string; matricule: string | null; etablissement: string | null }` à `ParametresClient`
- `ParametresClient` accepte `initialUser` en props et expose les 4 onglets

- [ ] **Step 1 : Créer `page.tsx`**

```typescript
// src/app/parametres/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import ParametresClient from "./ParametresClient";

export const metadata = { title: "Paramètres — Competencia IA" };

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, matricule: true, etablissement: true },
  });

  return (
    <ParametresClient
      initialUser={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        matricule: user?.matricule ?? null,
        etablissement: user?.etablissement ?? null,
      }}
    />
  );
}
```

- [ ] **Step 2 : Créer `ParametresClient.tsx`**

```typescript
// src/app/parametres/ParametresClient.tsx
"use client";

import { useState } from "react";
import ProfilTab from "@/components/parametres/ProfilTab";
import ApiTab from "@/components/parametres/ApiTab";
import ReferentielTab from "@/components/parametres/ReferentielTab";
import CompteTab from "@/components/parametres/CompteTab";

type Tab = "profil" | "api" | "referentiel" | "compte";

interface Props {
  initialUser: {
    name: string;
    email: string;
    matricule: string | null;
    etablissement: string | null;
  };
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profil",      label: "Profil",              icon: "👤" },
  { id: "api",         label: "Clés API & Modèle IA", icon: "🔑" },
  { id: "referentiel", label: "Référentiel",          icon: "📚" },
  { id: "compte",      label: "Compte & Sécurité",    icon: "🔒" },
];

export default function ParametresClient({ initialUser }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>
            Paramètres
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Gérez votre profil, vos clés API, votre référentiel et votre compte.
          </p>
        </div>

        {/* Onglets */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl"
          style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
              style={
                activeTab === tab.id
                  ? { background: "#FFFFFF", color: "#003087", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                  : { color: "#6B7280" }
              }
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenu */}
        {activeTab === "profil"      && <ProfilTab initialUser={initialUser} />}
        {activeTab === "api"         && <ApiTab />}
        {activeTab === "referentiel" && <ReferentielTab />}
        {activeTab === "compte"      && <CompteTab email={initialUser.email} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Créer le dossier `src/components/parametres/` avec des stubs**

Créer 4 fichiers stubs pour éviter les erreurs d'import avant implémentation :

```typescript
// src/components/parametres/ProfilTab.tsx
"use client";
export default function ProfilTab({ initialUser }: { initialUser: { name: string; email: string; matricule: string | null; etablissement: string | null } }) {
  return <div className="text-sm text-gray-500">Profil — en cours de développement</div>;
}
```

```typescript
// src/components/parametres/ApiTab.tsx
"use client";
export default function ApiTab() {
  return <div className="text-sm text-gray-500">API — en cours de développement</div>;
}
```

```typescript
// src/components/parametres/ReferentielTab.tsx
"use client";
export default function ReferentielTab() {
  return <div className="text-sm text-gray-500">Référentiel — en cours de développement</div>;
}
```

```typescript
// src/components/parametres/CompteTab.tsx
"use client";
export default function CompteTab({ email }: { email: string }) {
  return <div className="text-sm text-gray-500">Compte — en cours de développement. Email: {email}</div>;
}
```

- [ ] **Step 4 : Vérifier dans le navigateur**

Ouvre `http://localhost:3000/parametres`. La page doit s'afficher avec les 4 onglets visibles et le contenu stub de chaque onglet au clic.

- [ ] **Step 5 : Commit**

```bash
git add src/app/parametres/ src/components/parametres/
git commit -m "feat: scaffold /parametres page with tab shell and stubs"
```

---

## Task 4 : Onglet Profil

**Files:**
- Modify: `src/components/parametres/ProfilTab.tsx` (remplace le stub)

**Interfaces:**
- Props : `initialUser: { name: string; email: string; matricule: string | null; etablissement: string | null }`
- Consumes: `PATCH /api/user/profile` body `{ matricule: string, etablissement: string }`
- Produces: toast "Profil mis à jour" ou "Erreur lors de la sauvegarde"

- [ ] **Step 1 : Implémenter `ProfilTab.tsx`**

```typescript
// src/components/parametres/ProfilTab.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  initialUser: {
    name: string;
    email: string;
    matricule: string | null;
    etablissement: string | null;
  };
}

export default function ProfilTab({ initialUser }: Props) {
  const [matricule, setMatricule] = useState(initialUser.matricule ?? "");
  const [etablissement, setEtablissement] = useState(initialUser.etablissement ?? "");
  const [saving, setSaving] = useState(false);

  const initials = (initialUser.name || initialUser.email || "F").charAt(0).toUpperCase();

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: matricule.trim(),
          etablissement: etablissement.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil mis à jour");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: "#111827" }}>
          Informations du profil
        </h2>

        {/* Avatar + identité */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E2E8F0]">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: "#003087" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: "#111827" }}>
              {initialUser.name || "Formateur"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
              {initialUser.email}
            </p>
            <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: "#003087", color: "#FFFFFF" }}>
              Formateur OFPPT
            </p>
          </div>
        </div>

        {/* Champs lecture seule */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Nom complet
            </label>
            <div
              className="w-full text-sm px-3 py-2.5 rounded-lg"
              style={{ background: "#F9FAFB", border: "1px solid #E2E8F0", color: "#6B7280" }}
            >
              {initialUser.name || "—"}
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>
              Modifiable via l&apos;administrateur système
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Email
            </label>
            <div
              className="w-full text-sm px-3 py-2.5 rounded-lg"
              style={{ background: "#F9FAFB", border: "1px solid #E2E8F0", color: "#6B7280" }}
            >
              {initialUser.email}
            </div>
          </div>
        </div>

        {/* Infos pour les PDF */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#374151" }}>
            Informations pour les exports PDF
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Matricule
              </label>
              <input
                type="text"
                placeholder="Ex: 9559"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                maxLength={20}
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#003087")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Établissement
              </label>
              <input
                type="text"
                placeholder="Ex: ISTA Hay Riad"
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                maxLength={100}
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#003087")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              />
            </div>
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "#003087" }}
        >
          {saving ? "Sauvegarde…" : "Sauvegarder le profil"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier dans le navigateur**

- Aller sur `/parametres` → onglet Profil
- Vérifier que le nom et l'email sont affichés en lecture seule
- Modifier matricule/établissement → clic "Sauvegarder" → toast "Profil mis à jour"
- Rafraîchir la page → les valeurs sont persistées

- [ ] **Step 3 : Commit**

```bash
git add src/components/parametres/ProfilTab.tsx
git commit -m "feat: implement ProfilTab with read-only identity and editable matricule/etablissement"
```

---

## Task 5 : Onglet Clés API & Modèle IA

**Files:**
- Modify: `src/components/parametres/ApiTab.tsx` (remplace le stub)

**Interfaces:**
- Props : aucune
- Consumes: `GET /api/user/api-settings`, `PATCH /api/user/api-settings`, `POST /api/user/test-api`
- Types locaux copiés depuis le Sidebar existant : `ProviderId`, `PROVIDERS`, `MODELS_BY_PROVIDER`, `PROVIDER_COLORS`, `KEY_PLACEHOLDERS`

- [ ] **Step 1 : Implémenter `ApiTab.tsx`**

```typescript
// src/components/parametres/ApiTab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const PROVIDERS = [
  { id: "anthropic",  label: "Anthropic (Claude)" },
  { id: "openai",     label: "OpenAI (GPT)"       },
  { id: "google",     label: "Google (Gemini)"    },
  { id: "openrouter", label: "OpenRouter"          },
  { id: "xai",        label: "xAI (Grok)"         },
  { id: "zhipu",      label: "Zhipu AI (GLM)"     },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

const MODELS_BY_PROVIDER: Record<ProviderId, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-8",           label: "Claude Opus 4.8 — Meilleur"    },
    { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6 — Équilibré" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — Rapide"    },
  ],
  openai: [
    { id: "gpt-4o",      label: "GPT-4o — Meilleur"        },
    { id: "gpt-4o-mini", label: "GPT-4o Mini — Rapide"     },
    { id: "o4-mini",     label: "o4-mini — Raisonnement"   },
    { id: "o3",          label: "o3 — Raisonnement avancé" },
  ],
  google: [
    { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro — Meilleur" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Rapide" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash — Léger"  },
  ],
  openrouter: [
    { id: "openrouter/meta-llama/llama-4-maverick",  label: "Llama 4 Maverick — Meta"    },
    { id: "openrouter/meta-llama/llama-4-scout",     label: "Llama 4 Scout — Rapide"     },
    { id: "openrouter/mistralai/mistral-large-2411", label: "Mistral Large — Mistral AI" },
    { id: "openrouter/deepseek/deepseek-r1",         label: "DeepSeek R1 — Raisonnement" },
  ],
  xai: [
    { id: "grok-3",      label: "Grok 3 — Meilleur"    },
    { id: "grok-3-fast", label: "Grok 3 Fast — Rapide" },
    { id: "grok-3-mini", label: "Grok 3 Mini — Léger"  },
  ],
  zhipu: [
    { id: "glm-4",       label: "GLM-4 — Meilleur"              },
    { id: "glm-4-air",   label: "GLM-4 Air — Équilibré"         },
    { id: "glm-4-flash", label: "GLM-4 Flash — Rapide/Gratuit"  },
    { id: "glm-z1",      label: "GLM-Z1 — Raisonnement"         },
  ],
};

const PROVIDER_COLORS: Record<ProviderId, string> = {
  anthropic:  "#E8651A",
  openai:     "#10A37F",
  google:     "#4285F4",
  openrouter: "#6366F1",
  xai:        "#111827",
  zhipu:      "#7B2FBE",
};

const KEY_PLACEHOLDERS: Record<ProviderId, string> = {
  anthropic:  "sk-ant-api03-...",
  openai:     "sk-proj-...",
  google:     "AIzaSy...",
  openrouter: "sk-or-v1-...",
  xai:        "xai-...",
  zhipu:      "xxxxxxxx.xxxxxxxxx",
};

type HasKeys = Record<ProviderId, boolean>;
type Keys    = Record<ProviderId, string>;

const DEFAULT_HAS: HasKeys = { anthropic: false, openai: false, google: false, openrouter: false, xai: false, zhipu: false };
const DEFAULT_KEYS: Keys   = { anthropic: "", openai: "", google: "", openrouter: "", xai: "", zhipu: "" };

export default function ApiTab() {
  const [loading, setLoading]             = useState(true);
  const [activeProvider, setActiveProvider] = useState<ProviderId>("anthropic");
  const [hasKeys, setHasKeys]             = useState<HasKeys>(DEFAULT_HAS);
  const [keys, setKeys]                   = useState<Keys>(DEFAULT_KEYS);
  const [preferredModel, setPreferredModel] = useState("claude-sonnet-4-6");
  const [showKey, setShowKey]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [testing, setTesting]             = useState(false);
  const [testResult, setTestResult]       = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/user/api-settings");
      const data = await res.json();
      setPreferredModel(data.preferredModel ?? "claude-sonnet-4-6");
      setHasKeys({
        anthropic:  !!data.hasClaudeKey,
        openai:     !!data.hasOpenaiKey,
        google:     !!data.hasGoogleKey,
        openrouter: !!data.hasOpenrouterKey,
        xai:        !!data.hasGrokKey,
        zhipu:      !!data.hasGlmKey,
      });
      setKeys({
        anthropic:  data.claudeApiKey    ?? "",
        openai:     data.openaiApiKey    ?? "",
        google:     data.googleApiKey    ?? "",
        openrouter: data.openrouterApiKey ?? "",
        xai:        data.grokApiKey      ?? "",
        zhipu:      data.glmApiKey       ?? "",
      });
      // Auto-select provider from preferredModel
      const m = data.preferredModel ?? "";
      if      (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) setActiveProvider("openai");
      else if (m.startsWith("gemini"))    setActiveProvider("google");
      else if (m.startsWith("grok-"))     setActiveProvider("xai");
      else if (m.startsWith("glm") || m.startsWith("glm-")) setActiveProvider("zhipu");
      else if (m.startsWith("openrouter/") || m.includes("/")) setActiveProvider("openrouter");
      else    setActiveProvider("anthropic");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProviderChange = (p: ProviderId) => {
    setActiveProvider(p);
    setTestResult(null);
    const first = MODELS_BY_PROVIDER[p][0]?.id;
    if (first) setPreferredModel(first);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/api-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claudeApiKey:     keys.anthropic,
          openaiApiKey:     keys.openai,
          googleApiKey:     keys.google,
          openrouterApiKey: keys.openrouter,
          grokApiKey:       keys.xai,
          glmApiKey:        keys.zhipu,
          preferredModel,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Paramètres API sauvegardés");
      await load();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const currentKey = keys[activeProvider];
      const keyToSend  = currentKey.includes("•") ? "" : currentKey.trim();
      const res = await fetch("/api/user/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider, apiKey: keyToSend, model: preferredModel }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, message: data.message ?? (res.ok ? "Connexion réussie" : "Erreur inconnue") });
    } catch {
      setTestResult({ ok: false, message: "Erreur réseau" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const providerColor = PROVIDER_COLORS[activeProvider];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="lg:grid lg:grid-cols-[220px_1fr]">
        {/* Colonne gauche — liste des providers */}
        <div className="border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#6B7280" }}>
            Fournisseur IA
          </p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {PROVIDERS.map((p) => {
              const isActive  = activeProvider === p.id;
              const hasKey    = hasKeys[p.id as ProviderId];
              const color     = PROVIDER_COLORS[p.id as ProviderId];
              return (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id as ProviderId)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left shrink-0 lg:shrink"
                  style={
                    isActive
                      ? { background: `${color}15`, border: `1px solid ${color}40`, color: "#111827" }
                      : { border: "1px solid transparent", color: "#6B7280" }
                  }
                >
                  <span className="font-medium whitespace-nowrap">{p.label}</span>
                  {hasKey && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: `${color}15`, color }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Colonne droite — configuration */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold" style={{ color: "#111827" }}>
              {PROVIDERS.find((p) => p.id === activeProvider)?.label}
            </h2>
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={
                hasKeys[activeProvider]
                  ? { background: `${providerColor}15`, color: providerColor }
                  : { background: "#F3F4F6", color: "#9CA3AF" }
              }
            >
              {hasKeys[activeProvider] ? "✓ Clé active" : "Non configuré"}
            </span>
          </div>

          <div className="space-y-4">
            {/* Modèle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Modèle IA
              </label>
              <div className="relative">
                <select
                  value={preferredModel}
                  onChange={(e) => setPreferredModel(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none appearance-none cursor-pointer"
                  style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                >
                  {MODELS_BY_PROVIDER[activeProvider].map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px]" style={{ color: "#9CA3AF" }}>▼</span>
              </div>
            </div>

            {/* Clé API */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Clé API
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={hasKeys[activeProvider] ? "••••••••••••••••••••" : KEY_PLACEHOLDERS[activeProvider]}
                  value={keys[activeProvider]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [activeProvider]: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 pr-16 rounded-lg outline-none font-mono"
                  style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: "#9CA3AF" }}
                >
                  {showKey ? "Cacher" : "Voir"}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={testConnection}
                disabled={testing}
                className="flex-1 text-sm py-2.5 rounded-lg font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#374151" }}
              >
                {testing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Test…
                  </>
                ) : "🔌 Tester la connexion"}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 text-sm py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: providerColor }}
              >
                {saving ? "Sauvegarde…" : "💾 Sauvegarder"}
              </button>
            </div>

            {/* Résultat du test */}
            {testResult && (
              <div
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  background: testResult.ok ? "#E8F5E9" : "#FEF2F2",
                  border:     `1px solid ${testResult.ok ? "#A5D6A7" : "#FECACA"}`,
                  color:      testResult.ok ? "#2E7D32" : "#DC2626",
                }}
              >
                {testResult.message}
              </div>
            )}

            <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>
              Vos clés sont chiffrées et stockées en sécurité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier dans le navigateur**

- Aller sur `/parametres` → onglet "Clés API & Modèle IA"
- Les 6 providers s'affichent à gauche
- Sélectionner un provider → le formulaire de droite se met à jour
- Saisir une clé → clic "Tester la connexion" → résultat inline
- Clic "Sauvegarder" → toast success

- [ ] **Step 3 : Commit**

```bash
git add src/components/parametres/ApiTab.tsx
git commit -m "feat: implement ApiTab with provider selector, model dropdown, and API key management"
```

---

## Task 6 : Onglet Référentiel

**Files:**
- Modify: `src/components/parametres/ReferentielTab.tsx` (remplace le stub)

**Interfaces:**
- Props : aucune
- Consumes: `GET /api/referentiel?mode=list`, `POST /api/referentiel` (FormData), `DELETE /api/referentiel?secteurId=`, `GET /api/referentiel?mode=template`
- Uses: `xlsx` pour export Excel (déjà installé)

- [ ] **Step 1 : Implémenter `ReferentielTab.tsx`**

```typescript
// src/components/parametres/ReferentielTab.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { utils, writeFile } from "xlsx";

interface ReferentielFiliere {
  id: string;
  nom: string;
  code: string | null;
  modules: { id: string; nom: string; code: string | null; mhg?: number | null }[];
}

interface ReferentielSecteur {
  id: string;
  nom: string;
  filieres: ReferentielFiliere[];
}

interface ImportStats {
  modulesCreated: number;
  competencesCreated: number;
  objectifsCreated: number;
  criteresCreated: number;
}

export default function ReferentielTab() {
  const [secteurs, setSecteurs]           = useState<ReferentielSecteur[]>([]);
  const [loadingList, setLoadingList]     = useState(true);
  const [listError, setListError]         = useState(false);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [importResult, setImportResult]   = useState<{ filiere: string; secteur: string; stats: ImportStats } | null>(null);
  const [importError, setImportError]     = useState<string | null>(null);
  const fileRef         = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(false);
    try {
      const res = await fetch("/api/referentiel?mode=list");
      if (!res.ok) throw new Error();
      setSecteurs(await res.json());
    } catch {
      setListError(true);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleAiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportResult(null);
    setImportError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/referentiel", { method: "POST", body: fd });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let json: any = {};
      try { json = await res.json(); } catch { /* empty */ }
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setImportResult(json);
      toast.success("Référentiel importé avec succès");
      loadList();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setUploading(false);
    }
  };

  const handleTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setTemplateUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/referentiel", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `Erreur ${res.status}`);
      toast.success(`✅ Importé — ${(json as { stats?: { modulesCreated?: number } }).stats?.modulesCreated ?? 0} modules`);
      loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur import");
    } finally {
      setTemplateUploading(false);
    }
  };

  const deleteSecteur = async (id: string, nom: string) => {
    if (!confirm(`Supprimer « ${nom} » et toutes ses filières / modules ?`)) return;
    await fetch(`/api/referentiel?secteurId=${encodeURIComponent(id)}`, { method: "DELETE" });
    setSecteurs((prev) => prev.filter((s) => s.id !== id));
    toast.success(`« ${nom} » supprimé`);
  };

  const exportExcel = (secteur: ReferentielSecteur) => {
    const rows = secteur.filieres.flatMap((f) =>
      f.modules.map((m) => ({
        "Secteur":        secteur.nom,
        "Filière":        f.nom,
        "N° Module":      m.code ?? "",
        "Intitulé Module": m.nom,
        "MHG (h)":        m.mhg ?? "",
      }))
    );
    if (rows.length === 0) { toast.error("Aucun module à exporter"); return; }
    const ws = utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 50 }, { wch: 10 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Référentiel");
    const safe = secteur.nom.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
    writeFile(wb, `referentiel-${safe}.xlsx`);
  };

  return (
    <div className="lg:grid lg:grid-cols-2 gap-6">
      {/* Colonne import */}
      <div className="space-y-4 mb-6 lg:mb-0">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <h2 className="text-base font-semibold mb-1" style={{ color: "#111827" }}>Import IA</h2>
          <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
            L&apos;IA extrait automatiquement filières, modules, compétences et objectifs.
          </p>

          {importResult && (
            <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
              <p className="text-sm font-semibold" style={{ color: "#2E7D32" }}>✅ Importé avec succès</p>
              <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>
                <strong>{importResult.filiere}</strong> · {importResult.secteur}
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                {importResult.stats.modulesCreated} modules · {importResult.stats.competencesCreated} compétences
              </p>
            </div>
          )}

          {importError && (
            <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="text-xs" style={{ color: "#DC2626" }}>{importError}</p>
            </div>
          )}

          <label className="flex items-center justify-center gap-2 cursor-pointer w-full text-white text-sm py-2.5 rounded-lg font-medium transition-opacity" style={{ background: "#003087", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Extraction IA… (15-30 sec)
              </>
            ) : (
              <>📥 Importer un référentiel</>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.md,.markdown"
              className="hidden"
              onChange={handleAiImport}
              disabled={uploading}
            />
          </label>

          <div className="flex gap-1 flex-wrap mt-3">
            {["PDF", "DOCX", "Excel", "CSV", "MD"].map((fmt) => (
              <span key={fmt} className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ background: "#F5F7FA", border: "1px solid #003087", color: "#003087" }}>
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5" style={{ borderColor: "#A5D6A7", background: "#F0FFF4" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "#2E7D32" }}>⚡ Import sans IA (instantané)</h2>
          <p className="text-xs mb-3" style={{ color: "#388E3C" }}>
            Remplissez le modèle Excel et importez-le — aucune clé API requise.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => templateFileRef.current?.click()}
              disabled={templateUploading}
              className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{ background: "#2E7D32", color: "#fff" }}
            >
              {templateUploading ? "Import…" : "📂 Importer mon fichier Excel"}
            </button>
            <a
              href="/api/referentiel?mode=template"
              download="modele-referentiel-ofppt.xlsx"
              className="inline-block rounded px-3 py-1.5 text-xs font-semibold"
              style={{ background: "#FFFFFF", color: "#2E7D32", border: "1px solid #A5D6A7" }}
            >
              📥 Télécharger le modèle
            </a>
          </div>
          <input ref={templateFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTemplateImport} />
        </div>
      </div>

      {/* Colonne liste */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#111827" }}>Référentiels importés</h2>
          <button onClick={loadList} className="text-xs" style={{ color: "#9CA3AF" }}>↺ Actualiser</button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-10">
            <span className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listError ? (
          <div className="rounded-lg p-3 text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-xs" style={{ color: "#DC2626" }}>Impossible de charger les référentiels</p>
            <button onClick={loadList} className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>↺ Réessayer</button>
          </div>
        ) : secteurs.length === 0 ? (
          <div className="rounded-lg p-6 text-center" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm font-medium" style={{ color: "#6B7280" }}>Aucun référentiel importé</p>
            <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Importez un référentiel via la section ci-contre</p>
          </div>
        ) : (
          <div className="space-y-2">
            {secteurs.map((s) => {
              const totalModules = s.filieres.reduce((acc, f) => acc + f.modules.length, 0);
              const isExpanded   = expandedId === s.id;
              return (
                <div key={s.id} className="rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                    style={{ background: "#F9FAFB" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", color: "#6B7280" }}>▶</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{s.nom}</p>
                        <p className="text-[10px]" style={{ color: "#6B7280" }}>
                          {s.filieres.length} filière{s.filieres.length > 1 ? "s" : ""} · {totalModules} module{totalModules > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); exportExcel(s); }}
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{ color: "#003087" }}
                      >
                        ↓ Excel
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSecteur(s.id, s.nom); }}
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{ color: "#EF4444" }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #E2E8F0" }}>
                      {s.filieres.map((f, idx) => (
                        <div
                          key={f.id}
                          className="px-3 py-2"
                          style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : undefined, background: "#FAFAFA" }}
                        >
                          <p className="text-xs font-medium" style={{ color: "#003087" }}>
                            {f.code ? <span className="font-mono text-[10px] mr-1" style={{ color: "#6B7280" }}>{f.code}</span> : null}
                            {f.nom}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {f.modules.map((m) => (
                              <span
                                key={m.id}
                                className="text-[9px] px-1.5 py-0.5 rounded"
                                style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E2E8F0" }}
                                title={m.nom}
                              >
                                {m.code ? `${m.code} · ` : ""}{m.nom.length > 28 ? m.nom.slice(0, 28) + "…" : m.nom}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

- [ ] **Step 2 : Vérifier dans le navigateur**

- Aller sur `/parametres` → onglet "Référentiel"
- La liste des référentiels importés s'affiche (ou le message vide)
- Clic sur un secteur → les filières et modules apparaissent
- Bouton "↓ Excel" → déclenche le téléchargement
- Import IA : choisir un fichier → spinner → résultat affiché

- [ ] **Step 3 : Commit**

```bash
git add src/components/parametres/ReferentielTab.tsx
git commit -m "feat: implement ReferentielTab with AI import, template import, and secteur list"
```

---

## Task 7 : Onglet Compte & Sécurité

**Files:**
- Modify: `src/components/parametres/CompteTab.tsx` (remplace le stub)

**Interfaces:**
- Props : `email: string`
- Consumes: `PATCH /api/user/password`, `DELETE /api/user/account`
- After account deletion: redirect to `/login`

- [ ] **Step 1 : Implémenter `CompteTab.tsx`**

```typescript
// src/components/parametres/CompteTab.tsx
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CompteTab({ email }: { email: string }) {
  const router = useRouter();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const changePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error("Les deux nouveaux mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success("Mot de passe mis à jour");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement");
    } finally {
      setSavingPwd(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = confirm(
      "⚠️ Cette action est irréversible.\n\nToutes vos données (séances, fiches, évaluations, référentiels, groupes…) seront définitivement supprimées.\n\nConfirmer la suppression de votre compte ?"
    );
    if (!confirmed) return;
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut({ redirect: false });
      router.push("/login");
    } catch {
      toast.error("Erreur lors de la suppression");
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Session active */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <h2 className="text-base font-semibold mb-3" style={{ color: "#111827" }}>Session active</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: "#374151" }}>{email}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Connecté en tant que formateur OFPPT</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm px-4 py-2 rounded-lg font-medium transition-all"
            style={{ border: "1px solid #E2E8F0", color: "#EF4444" }}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Changer le mot de passe */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: "#111827" }}>Changer le mot de passe</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
              placeholder="Minimum 8 caractères"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
              placeholder="••••••••"
            />
          </div>
          <button
            onClick={changePassword}
            disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#003087" }}
          >
            {savingPwd ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #FECACA" }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: "#DC2626" }}>⚠️ Zone dangereuse</h2>
        <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
          La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.
        </p>
        <button
          onClick={deleteAccount}
          disabled={deletingAccount}
          className="text-sm px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
        >
          {deletingAccount ? "Suppression…" : "Supprimer mon compte"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier dans le navigateur**

- Aller sur `/parametres` → onglet "Compte & Sécurité"
- Vérifier que les 3 cards s'affichent correctement
- Tester "Se déconnecter" → redirige vers `/login`
- Tester changement de mot de passe avec mauvais MDP actuel → toast erreur "Mot de passe actuel incorrect"
- Tester changement de mot de passe correct → toast success, champs vidés

- [ ] **Step 3 : Commit**

```bash
git add src/components/parametres/CompteTab.tsx
git commit -m "feat: implement CompteTab with session info, password change, and account deletion"
```

---

## Task 8 : Migration du Shell — supprimer le slide-over

**Files:**
- Modify: `src/components/shell/index.tsx`
- Delete: `src/components/ui/Sidebar.tsx`

**Objectif:** Remplacer le `<button onClick={onSettingsClick}>` par un `<Link href="/parametres">`, supprimer l'état `dashOpen`, l'import de `Sidebar`, et le rendu du panneau. Supprimer `Sidebar.tsx`.

- [ ] **Step 1 : Modifier `src/components/shell/index.tsx`**

Dans `AppShell` (export default), retirer:
- `const [dashOpen, setDashOpen] = useState(false);`
- `<Sidebar open={dashOpen} onClose={() => setDashOpen(false)} user={user} claudeKey={claudeKey} openaiKey={openaiKey} />`
- La prop `onSettingsClick={() => setDashOpen(true)}` passée à `<AppSidebar>`

Dans `AppSidebar`, retirer la prop `onSettingsClick` et remplacer le `<button>` par un `<Link>`.

Retirer l'import: `import Sidebar from "@/components/ui/Sidebar";`

Le résultat final de la portion `AppSidebar` et `AppShell` doit ressembler à :

```typescript
// Retirer la prop onSettingsClick de AppSidebar
function AppSidebar({ user }: { user: NonNullable<AppShellProps["user"]> }) {
  // ... (tout le code existant est inchangé sauf la signature et le bouton)

  // Remplacer le <button onClick={onSettingsClick}> par:
  // (dans la section du bas, après le lien /guide)
  return (
    // ... aside inchangé ...
    // Dans la div du bas, remplacer le button par:
    <Link
      href="/parametres"
      className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
      style={{
        color: isActive("/parametres", false) ? "#FFFFFF" : "rgba(255,255,255,0.60)",
        background: isActive("/parametres", false) ? "rgba(255,255,255,0.15)" : undefined,
      }}
      onMouseEnter={e => { if (!isActive("/parametres", false)) { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.90)"; } }}
      onMouseLeave={e => { if (!isActive("/parametres", false)) { (e.currentTarget as HTMLAnchorElement).style.background = ""; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.60)"; } }}
    >
      <span style={{ color: isActive("/parametres", false) ? "#16A34A" : "rgba(255,255,255,0.50)", flexShrink: 0 }}><GearIcon /></span>
      Paramètres
    </Link>
    // ... footer text inchangé ...
  );
}

export default function AppShell({ children, user }: Omit<AppShellProps, "claudeKey" | "openaiKey">) {
  if (!user) return <>{children}</>;
  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen overflow-hidden">
        <AppSidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <main className="flex-1 overflow-y-auto" style={{ background: "transparent" }}>
            {children}
          </main>
        </div>
      </div>
      <AssistantFAB />
    </>
  );
}
```

Note : `claudeKey` et `openaiKey` ne sont plus nécessaires dans `AppShellProps` puisque `Sidebar` est supprimé. Garder les props dans l'interface pour éviter une erreur TypeScript dans `layout.tsx` (qui les passe toujours) — simplement ne plus les utiliser, ou les retirer de l'interface ET du `layout.tsx`.

**Option la plus simple** : garder `claudeKey` et `openaiKey` dans l'interface mais ne pas les utiliser dans le JSX (TypeScript acceptera les props non utilisées).

- [ ] **Step 2 : Supprimer `src/components/ui/Sidebar.tsx`**

```bash
del "src\components\ui\Sidebar.tsx"
```
ou via PowerShell :
```powershell
Remove-Item "src\components\ui\Sidebar.tsx"
```

- [ ] **Step 3 : Vérifier compilation complète**

```bash
npm run build
```
Doit se terminer sans erreur. Si TypeScript signale un import manquant de `Sidebar`, vérifier que l'import a bien été retiré de `shell/index.tsx`.

- [ ] **Step 4 : Vérifier dans le navigateur**

- `npm run dev`
- Ouvrir l'app → vérifier que la sidebar s'affiche normalement
- Clic sur "Paramètres" en bas de la sidebar → navigue vers `/parametres`
- Le lien "Paramètres" est actif (surlignage) quand on est sur `/parametres`
- Plus aucun panneau slide-over ne s'ouvre

- [ ] **Step 5 : Commit final**

```bash
git add src/components/shell/index.tsx
git commit -m "feat: replace settings slide-over with /parametres page link, remove Sidebar.tsx"
```

---

## Self-Review (effectué)

**Couverture spec :**
- ✅ Route `/parametres` avec Server Component + auth redirect
- ✅ 4 onglets horizontaux (Profil, API, Référentiel, Compte)
- ✅ ProfilTab : avatar, champs read-only, matricule/établissement éditables
- ✅ ApiTab : 6 providers, sélecteur modèle, clé API, test + save
- ✅ ReferentielTab : import IA + template, liste expandable, export Excel
- ✅ CompteTab : session, changement MDP, suppression compte avec cascade
- ✅ Endpoints `/api/user/password` et `/api/user/account`
- ✅ Migration shell : button → Link, suppression Sidebar.tsx
- ✅ Suppression cascade Seance + UserModule avant User.delete

**Noms cohérents entre tâches :**
- `initialUser` : défini Task 3, consommé Tasks 4 et 7 ✓
- `email` prop de CompteTab : string, passé depuis ParametresClient ✓
- Tous les fetch paths correspondent aux routes API existantes ✓
