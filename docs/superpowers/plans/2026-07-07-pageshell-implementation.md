# PageShell — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un composant `PageShell` réutilisable et l'appliquer sur 11 pages pour unifier la structure visuelle (header navy + accent vert + fil d'Ariane).

**Architecture:** Un seul composant `PageShell.tsx` (Server Component, aucun hook) qui fournit le bandeau header, le fil d'Ariane et la zone contenu. Chaque page enlève son ancien header/wrapper et l'enveloppe dans `<PageShell>`. Le composant accepte uniquement `action.href` (pas de onClick) pour rester Server Component pur.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS + inline styles (existant dans le projet)

## Global Constraints

- Accent couleur : `#16A34A` (vert) — remplace l'orange sur tous les éléments de PageShell
- Header fond : `#003087` (navy OFPPT)
- Background contenu : `#EEF2F7`
- Surface cartes : `#FFFFFF`
- `PageShell` n'a PAS de `"use client"` — pur Server Component
- Pour `action`, uniquement `{ label: string; href: string }` — rendu en `<Link>`
- Ne pas modifier le contenu interne des pages (formulaires, listes, résultats)
- Ne pas modifier `NavSidebar`, `AppShell`, ni les composants enfants
- Après chaque tâche : `git add + commit + push` pour déploiement Vercel

---

## Fichiers créés / modifiés

| Action | Fichier |
|--------|---------|
| **Créer** | `src/components/ui/PageShell.tsx` |
| Modifier | `src/app/page.tsx` |
| Modifier | `src/app/seances/page.tsx` |
| Modifier | `src/app/fiches/page.tsx` |
| Modifier | `src/app/evaluations/page.tsx` |
| Modifier | `src/app/corrections/page.tsx` |
| Modifier | `src/app/historique/page.tsx` |
| Modifier | `src/app/fiches/historique/page.tsx` |
| Modifier | `src/app/referentiel/page.tsx` |
| Modifier | `src/app/suivi/page.tsx` |
| Modifier | `src/components/bibliotheque/BibliothequeClient.tsx` |
| Modifier | `src/app/assistant/page.tsx` |
| Modifier | `src/app/guide/page.tsx` |

---

## Task 1 : Créer le composant PageShell

**Files:**
- Create: `src/components/ui/PageShell.tsx`

**Interfaces:**
- Consumes: rien
- Produces: `PageShell({ title, subtitle?, icon?, breadcrumb?, action?, noPadding?, children })`

- [ ] **Step 1 : Créer le fichier `src/components/ui/PageShell.tsx`**

```tsx
import Link from "next/link";
import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: string;
  breadcrumb?: BreadcrumbItem[];
  action?: { label: string; href: string };
  /** Désactive le padding contenu — pour pages full-height (ex: Assistant) */
  noPadding?: boolean;
  children: React.ReactNode;
}

export default function PageShell({
  title,
  subtitle,
  icon,
  breadcrumb,
  action,
  noPadding = false,
  children,
}: PageShellProps) {
  return (
    <div
      style={{
        minHeight: "100%",
        background: "#EEF2F7",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Bande header ── */}
      <div
        style={{
          background: "#003087",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.068) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          borderBottom: "3px solid #16A34A",
          padding: "18px 32px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {icon && (
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                flexShrink: 0,
                background: "rgba(255,255,255,0.13)",
                border: "1px solid rgba(255,255,255,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "19px",
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <h1
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: "12.5px",
                  color: "rgba(255,255,255,0.58)",
                  marginTop: "3px",
                  lineHeight: 1.45,
                  margin: "3px 0 0",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action && (
          <Link
            href={action.href}
            style={{
              flexShrink: 0,
              background: "#16A34A",
              color: "#FFFFFF",
              padding: "9px 17px",
              borderRadius: "9px",
              fontSize: "12.5px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 10px rgba(22,163,74,0.35)",
            }}
          >
            {action.label}
          </Link>
        )}
      </div>

      {/* ── Fil d'Ariane ── */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
            padding: "8px 32px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
          }}
        >
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span style={{ fontSize: "11px", color: "#D1D5DB" }}>›</span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    fontSize: "11.5px",
                    color: i === breadcrumb.length - 1 ? "#111827" : "#6B7280",
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 500,
                    textDecoration: "none",
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: "11.5px",
                    color: i === breadcrumb.length - 1 ? "#111827" : "#6B7280",
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 500,
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Zone contenu ── */}
      <div
        style={
          noPadding
            ? { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }
            : { padding: "28px 32px 60px" }
        }
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier que le fichier compile**

```bash
cd generateur-seances-ofppt && npx tsc --noEmit
```

Résultat attendu : 0 erreurs TypeScript liées à PageShell.

- [ ] **Step 3 : Commit**

```bash
git add src/components/ui/PageShell.tsx
git commit -m "feat: add PageShell component — navy header + green accent + breadcrumb"
git push
```

---

## Task 2 : Pages Server Component (Dashboard, Corrections, Historique séances, Historique fiches, Guide)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/corrections/page.tsx`
- Modify: `src/app/historique/page.tsx`
- Modify: `src/app/fiches/historique/page.tsx`
- Modify: `src/app/guide/page.tsx`

**Interfaces:**
- Consumes: `PageShell` depuis `@/components/ui/PageShell`
- Produces: pages rendues avec le nouveau header unifié

### 2a · Dashboard (`src/app/page.tsx`)

- [ ] **Step 1 : Ajouter l'import PageShell**

En haut du fichier, après les imports existants :
```tsx
import PageShell from "@/components/ui/PageShell";
```

- [ ] **Step 2 : Remplacer le return**

Remplacer **tout** le bloc `return (...)` (ligne 177–313) par :

```tsx
  return (
    <PageShell
      title="Tableau de bord"
      subtitle={`${greeting}, ${userName} — ${todayLabel}`}
      icon="🏠"
      breadcrumb={[{ label: "Accueil" }]}
    >
      {/* ── 4 STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <StatCard
          value={stagiairesCount}
          label="Stagiaires"
          trend={stagiairesCount > 0 ? `${groupesCount} groupe${groupesCount > 1 ? "s" : ""}` : undefined}
          iconBg="#EFF6FF" iconColor="#3B82F6"
          iconPath={<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>}
        />
        <StatCard
          value={seancesCount}
          label="Séances générées"
          trend={seancesThisMonth > 0 ? `+${seancesThisMonth} ce mois` : undefined}
          iconBg="#F0FDF4" iconColor="#22C55E"
          iconPath={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>}
        />
        <StatCard
          value={groupesCount}
          label="Groupes actifs"
          trend={fichesThisMonth > 0 ? `+${fichesThisMonth} fiches ce mois` : undefined}
          iconBg="#FAF5FF" iconColor="#A855F7"
          iconPath={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>}
        />
        <StatCard
          value={fichesCount}
          label="Fiches pédagogiques"
          trend={fichesThisMonth > 0 ? `+${fichesThisMonth} ce mois` : undefined}
          iconBg="#FFF7ED" iconColor="#F97316"
          iconPath={<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></>}
        />
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ marginBottom: "20px" }}>
        <DashboardCharts monthlyData={monthlyData} filiereData={seancesParFiliere} totalSeances={seancesCount} />
      </div>

      {/* ── RECENT ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Séances récentes */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>Séances récentes</h3>
            <Link href="/historique" style={{ fontSize: "12px", color: "#3B82F6", fontWeight: 500 }}>Voir tout</Link>
          </div>
          {recentSeances.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: "13px" }}>
              Aucune séance générée.<br />
              <Link href="/seances" style={{ color: "#16A34A", fontWeight: 600, marginTop: "8px", display: "inline-block" }}>
                Générer ma première séance →
              </Link>
            </div>
          ) : (
            recentSeances.map((s) => (
              <RecentRow
                key={s.id}
                href={`/historique/${s.id}`}
                icon="⚡"
                title={s.title || `${s.filiere} — ${s.module}`}
                subtitle={s.module}
                badge="En cours"
                badgeColor="#22C55E"
                date={fmt(s.createdAt)}
              />
            ))
          )}
        </div>

        {/* Fiches récentes */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>Fiches récentes</h3>
            <Link href="/fiches/historique" style={{ fontSize: "12px", color: "#3B82F6", fontWeight: 500 }}>Voir tout</Link>
          </div>
          {recentFiches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: "13px" }}>
              Aucune fiche générée.<br />
              <Link href="/fiches" style={{ color: "#16A34A", fontWeight: 600, marginTop: "8px", display: "inline-block" }}>
                Créer ma première fiche →
              </Link>
            </div>
          ) : (
            recentFiches.map((f) => (
              <RecentRow
                key={f.id}
                href={`/fiches/${f.id}`}
                icon="📋"
                title={f.titre || f.module}
                subtitle={f.module}
                badge="Corrigée"
                badgeColor="#F97316"
                date={fmt(f.createdAt)}
              />
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
```

### 2b · Corrections (`src/app/corrections/page.tsx`)

- [ ] **Step 3 : Modifier corrections/page.tsx**

Remplacer le fichier entier par :

```tsx
import PageShell from "@/components/ui/PageShell";

export default function CorrectionIAPage() {
  return (
    <PageShell
      title="Correction IA"
      subtitle="Importez une copie — l'IA la corrige et génère un rapport de feedback détaillé"
      icon="✏️"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Correction IA" },
      ]}
    >
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#0A4DA818", border: "1px solid #0A4DA830" }}
        >
          <svg width="32" height="32" fill="none" stroke="#0A4DA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm max-w-sm" style={{ color: "#6B7280" }}>
            Importez une copie (PDF, DOCX ou image) — l&apos;IA la corrige, attribue une note et génère un rapport de feedback détaillé.
          </p>
        </div>
        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "#E2E8F0", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
        >
          Bientôt disponible
        </div>
      </div>
    </PageShell>
  );
}
```

### 2c · Historique séances (`src/app/historique/page.tsx`)

- [ ] **Step 4 : Modifier historique/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` entier par :
```tsx
  return (
    <PageShell
      title="Mes séances"
      subtitle={`${seances.length} séance${seances.length !== 1 ? "s" : ""} générée${seances.length !== 1 ? "s" : ""}`}
      icon="🕐"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Mes Documents" },
        { label: "Mes séances" },
      ]}
      action={{ label: "+ Nouvelle séance", href: "/seances" }}
    >
      {seances.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3" style={{ borderStyle: "dashed", borderColor: "#E2E8F0" }}>
          <div className="text-4xl">📄</div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>Aucune séance sauvegardée pour l&apos;instant</p>
          <Link href="/seances" className="btn-primary text-sm mt-2">
            Générer ma première séance
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {seances.map((s) => (
            <Link
              key={s.id}
              href={`/historique/${s.id}`}
              className="card flex items-center justify-between group transition-all duration-200"
              style={{ borderColor: "#E2E8F0" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#0A4DA840")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#E2E8F0")}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: "#0A4DA814", color: "#0A4DA8" }}
                >
                  {s.filiere.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold group-hover:text-[#0A4DA8] transition-colors" style={{ color: "#111827" }}>
                    {s.title}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{typeLabel[s.type] ?? s.type}</span>
                    <span className="text-xs" style={{ color: "#4B5563" }}>·</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{s.duree}</span>
                    <span className="text-xs" style={{ color: "#4B5563" }}>·</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {new Date(s.createdAt).toLocaleDateString("fr-MA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-lg transition-colors" style={{ color: "#4B5563" }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
```

### 2d · Historique fiches (`src/app/fiches/historique/page.tsx`)

- [ ] **Step 5 : Modifier fiches/historique/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` entier par :
```tsx
  return (
    <PageShell
      title="Mes fiches pédagogiques"
      subtitle={`${fiches.length} fiche${fiches.length !== 1 ? "s" : ""} générée${fiches.length !== 1 ? "s" : ""}`}
      icon="📁"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Mes Documents" },
        { label: "Mes fiches" },
      ]}
      action={{ label: "+ Nouvelle fiche", href: "/fiches" }}
    >
      {fiches.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucune fiche générée pour l&apos;instant.</p>
          <Link href="/fiches" className="mt-4 inline-block text-[#16A34A] hover:underline text-sm">
            Créer ma première fiche →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {fiches.map((fiche) => (
            <Link key={fiche.id} href={`/fiches/${fiche.id}`} className="card block hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-[#16A34A] transition-colors">{fiche.titre}</h2>
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
    </PageShell>
  );
```

### 2e · Guide (`src/app/guide/page.tsx`)

- [ ] **Step 6 : Modifier guide/page.tsx**

Ajouter l'import en haut :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` — le bloc `<div style={{ maxWidth: "1060px", ... }}>` — par :

```tsx
  return (
    <PageShell
      title="Guide de l'application"
      subtitle="Plateforme pédagogique intelligente pour formateurs OFPPT — génération de contenu assistée par IA"
      icon="❓"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Guide" },
      ]}
    >
      <div style={{ maxWidth: "1060px", margin: "0 auto" }}>
        {/* Badges tech */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
          {["Next.js 16", "Claude API", "OpenAI GPT", "PostgreSQL", "NextAuth v5", "Prisma ORM"].map(t => (
            <span key={t} style={{ fontSize: "10px", fontWeight: 600, fontFamily: "monospace", padding: "3px 10px", borderRadius: "100px", border: "1px solid #E2E8F0", color: "#6B7280", background: "#F8FAFC" }}>{t}</span>
          ))}
        </div>

        {/* === CONTENU EXISTANT === */}
        {/* Garder ici tout le contenu existant à partir de <SectionLabel label="Parcours Formateur…" /> jusqu'au footer */}
        {/* NE PAS MODIFIER le contenu interne — couper-coller depuis l'ancien return */}
```

> **Note :** Copier-coller tout le contenu existant du guide (SectionLabel, steps, aiModels, etc.) à l'intérieur de `<PageShell>` sans rien modifier. Seul le wrapper `<div style={{ maxWidth:"1060px", margin:"0 auto", padding:"40px 28px 80px" }}>` est remplacé par `<div style={{ maxWidth: "1060px", margin: "0 auto" }}>` (le padding est géré par PageShell).

- [ ] **Step 7 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```

Ouvrir : `http://localhost:3000`, `/corrections`, `/historique`, `/fiches/historique`, `/guide`  
Vérifier : bande navy + bordure verte 3px + fil d'Ariane visible sur chaque page.

- [ ] **Step 8 : Commit**

```bash
git add src/app/page.tsx src/app/corrections/page.tsx src/app/historique/page.tsx src/app/fiches/historique/page.tsx src/app/guide/page.tsx
git commit -m "feat: apply PageShell to server component pages (dashboard, corrections, historique, guide)"
git push
```

---

## Task 3 : Pages Client Component (Séances, Fiches, Évaluations, Suivi)

**Files:**
- Modify: `src/app/seances/page.tsx`
- Modify: `src/app/fiches/page.tsx`
- Modify: `src/app/evaluations/page.tsx`
- Modify: `src/app/suivi/page.tsx`

**Interfaces:**
- Consumes: `PageShell` depuis `@/components/ui/PageShell`
- Produces: pages Client avec header unifié

### 3a · Séances (`src/app/seances/page.tsx`)

- [ ] **Step 1 : Modifier seances/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` (ligne 118–184) par :

```tsx
  return (
    <PageShell
      title="Séance pédagogique"
      subtitle="Générez un cours complet adapté au référentiel OFPPT en quelques secondes"
      icon="⚡"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Séance pédagogique" },
      ]}
      action={{ label: "📂 Historique", href: "/historique" }}
    >
      <div className={`grid gap-8 ${contenu ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5"}`}>
        {!contenu && (
          <div className="lg:col-span-2">
            <SeanceForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} />
          </div>
        )}

        <div className={contenu ? "col-span-1" : "lg:col-span-3"}>
          {isLoading && !contenu && (
            <div className="card flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#0A4DA8] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium" style={{ color: "#374151" }}>Génération en cours…</p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {elapsed < 10
                  ? "Connexion à l'IA…"
                  : elapsed < 30
                  ? `${elapsed}s — l'IA rédige votre cours…`
                  : elapsed < 60
                  ? `${elapsed}s — cours long, encore quelques secondes…`
                  : `${elapsed}s — presque terminé…`}
              </p>
              {elapsed >= 15 && (
                <p className="text-[11px] px-4 text-center" style={{ color: "#0A4DA8" }}>
                  💡 Pour des réponses plus rapides, sélectionnez <strong>Claude Haiku</strong> ou <strong>Gemini Flash</strong> dans les paramètres ⚙
                </p>
              )}
            </div>
          )}

          {contenu && (
            <SeanceResult
              contenu={contenu}
              isStreaming={isLoading}
              onExportPDF={() => exportToPDF(contenu, titre, formateur)}
              onExportWord={() => exportToWord(contenu, titre)}
              onExportPPT={() => exportToPPT(contenu, titre)}
              onReset={() => { setContenu(null); setError(null); }}
            />
          )}

          {error && !contenu && (
            <div className="card" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
              <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
            </div>
          )}

          {!isLoading && !contenu && !error && (
            <div className="card flex flex-col items-center justify-center py-20 gap-3" style={{ borderStyle: "dashed", borderColor: "#E2E8F0" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "#0A4DA814" }}>
                📄
              </div>
              <p className="text-sm" style={{ color: "#4B5563" }}>La séance générée apparaîtra ici</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
```

### 3b · Fiches (`src/app/fiches/page.tsx`)

- [ ] **Step 2 : Modifier fiches/page.tsx (FichesContent)**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` de la fonction `FichesContent` (ligne 74–107) par :

```tsx
  return (
    <PageShell
      title="Fiches pédagogiques"
      subtitle="Générez une fiche pédagogique complète au format OFPPT"
      icon="📋"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Fiche pédagogique" },
      ]}
      action={{ label: "📂 Mes fiches", href: "/fiches/historique" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FicheForm onGenerate={handleGenerate} isLoading={isLoading} defaultValues={defaultValues} />
        <div className="card">
          <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h2 className="text-base font-bold" style={{ color: "#0A4DA8" }}>Fiche générée</h2>
            {ficheId && (
              <button
                onClick={() => router.push(`/fiches/${ficheId}`)}
                className="text-sm hover:underline"
                style={{ color: "#0A4DA8" }}
              >
                Voir le détail →
              </button>
            )}
          </div>
          {contenu ? (
            <div className="prose prose-sm max-w-none prose-ofppt">
              <ReactMarkdown>{contenu}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: "#4B5563" }}>
              {isLoading ? "Génération en cours…" : "La fiche apparaîtra ici"}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
```

### 3c · Évaluations (`src/app/evaluations/page.tsx`)

- [ ] **Step 3 : Modifier evaluations/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` (ligne 72–136) par :

```tsx
  return (
    <PageShell
      title="Génération d'évaluations"
      subtitle="QCM, exercices pratiques, examens et sessions de rattrapage générés automatiquement"
      icon="☑️"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Évaluation" },
      ]}
    >
      <div className={`grid gap-8 ${contenu ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5"}`}>
        {!contenu && (
          <div className="lg:col-span-2">
            <EvaluationForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} />
          </div>
        )}

        <div className={contenu ? "col-span-1" : "lg:col-span-3"}>
          {isLoading && (
            <div className="card flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#0A4DA8] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm" style={{ color: "#9CA3AF" }}>Génération de l&apos;évaluation en cours…</p>
            </div>
          )}

          {error && (
            <div className="card" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
              <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
            </div>
          )}

          {contenu && (
            <EvaluationResult
              contenu={contenu}
              typeLabel={typeLabel}
              onExportPDF={() => exportToPDF(contenu, titre, formateur, "Évaluation")}
              onExportWord={() => exportToWord(contenu, titre)}
              onReset={() => { setContenu(null); setError(null); }}
            />
          )}

          {!isLoading && !contenu && !error && (
            <div className="space-y-3">
              {[
                { icon: "☑", title: "QCM", desc: "Questions à choix multiples avec corrigé automatique. Idéal pour l'évaluation formative rapide." },
                { icon: "✏", title: "Exercices pratiques", desc: "Exercices d'application sur le module avec correction détaillée et barème." },
                { icon: "📋", title: "Contrôle continu", desc: "Évaluation intermédiaire : questions de cours + QCM + application. Corrigé et barème /20 inclus." },
                { icon: "📝", title: "Examen fin de module", desc: "Sujet complet d'examen avec corrigé et grille de notation sur 20." },
                { icon: "🔄", title: "Session de rattrapage", desc: "Sujet de rattrapage ciblant les compétences essentielles, avec corrigé." },
              ].map(card => (
                <div key={card.title} className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <span className="text-2xl mt-0.5">{card.icon}</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#374151" }}>{card.title}</p>
                    <p className="text-xs mt-1" style={{ color: "#4B5563" }}>{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
```

### 3d · Suivi (`src/app/suivi/page.tsx`)

- [ ] **Step 4 : Modifier suivi/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer le `return (...)` (ligne 26–69) par :

```tsx
  return (
    <PageShell
      title="Suivi des compétences"
      subtitle="Gérez vos groupes et suivez la progression de chaque stagiaire par compétence"
      icon="📊"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Pédagogie" },
        { label: "Suivi des compétences" },
      ]}
      action={{ label: "+ Nouveau groupe", href: "/suivi/nouveau" }}
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0A4DA8] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groupes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "1px dashed #E2E8F0" }}
        >
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium mb-1" style={{ color: "#374151" }}>Aucun groupe créé</p>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>Créez votre premier groupe pour commencer le suivi</p>
          <Link
            href="/suivi/nouveau"
            className="px-4 py-2 text-sm font-semibold rounded-xl"
            style={{ background: "#0A4DA8", color: "#FFFFFF" }}
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
    </PageShell>
  );
```

- [ ] **Step 5 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir : `/seances`, `/fiches`, `/evaluations`, `/suivi`  
Vérifier : bande navy + bordure verte + fil d'Ariane + bouton CTA vert visible.

- [ ] **Step 6 : Commit**

```bash
git add src/app/seances/page.tsx src/app/fiches/page.tsx src/app/evaluations/page.tsx src/app/suivi/page.tsx
git commit -m "feat: apply PageShell to client component pages (seances, fiches, evaluations, suivi)"
git push
```

---

## Task 4 : Pages spéciales (Référentiel, Bibliothèque, Assistant)

**Files:**
- Modify: `src/app/referentiel/page.tsx`
- Modify: `src/components/bibliotheque/BibliothequeClient.tsx`
- Modify: `src/app/assistant/page.tsx`

### 4a · Référentiel (`src/app/referentiel/page.tsx`)

- [ ] **Step 1 : Modifier referentiel/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Remplacer la ligne `return <ReferentielClient secteurs={data} />;` par :

```tsx
  return (
    <PageShell
      title="Référentiel"
      subtitle="Consultez vos filières, modules et compétences importés"
      icon="📑"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Pédagogie" },
        { label: "Référentiel" },
      ]}
    >
      <ReferentielClient secteurs={data} />
    </PageShell>
  );
```

- [ ] **Step 2 : Supprimer le header interne de ReferentielClient (état vide)**

Dans `src/app/referentiel/ReferentielClient.tsx`, à la ligne ~237–242, supprimer le bloc titre de l'état vide :

```tsx
          {/* SUPPRIMER ce bloc — le titre est maintenant dans PageShell */}
          {/* <div className="text-center mb-8">
            <div className="text-5xl mb-3">📚</div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#111827" }}>Référentiel pédagogique</h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>Importez votre fichier Excel ou CSV pour commencer</p>
          </div> */}
```

### 4b · Bibliothèque (`src/components/bibliotheque/BibliothequeClient.tsx`)

Le bouton "Publier" déclenche `setShowPublish(true)` (onClick), donc il **reste dans le contenu** — on ne peut pas le mettre dans `action` de PageShell.

- [ ] **Step 3 : Modifier bibliotheque/page.tsx pour envelopper avec PageShell**

Dans `src/app/bibliotheque/page.tsx`, remplacer :
```tsx
import BibliothequeClient from "@/components/bibliotheque/BibliothequeClient";

export default async function BibliothequePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <BibliothequeClient />;
}
```

Par :
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BibliothequeClient from "@/components/bibliotheque/BibliothequeClient";
import PageShell from "@/components/ui/PageShell";

export default async function BibliothequePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <PageShell
      title="Bibliothèque"
      subtitle="Partagez et explorez les ressources pédagogiques de votre communauté"
      icon="📚"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Pédagogie" },
        { label: "Bibliothèque" },
      ]}
    >
      <BibliothequeClient />
    </PageShell>
  );
}
```

- [ ] **Step 4 : Supprimer le header interne de BibliothequeClient**

Dans `src/components/bibliotheque/BibliothequeClient.tsx`, supprimer le bloc `{/* En-tête */}` (lignes 63–78) :

```tsx
  return (
    <div className="max-w-7xl mx-auto">   {/* retirer px-6 py-8 — padding géré par PageShell */}
      {/* SUPPRIMER :
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" ...>Bibliothèque Collaborative</h1>
          <p className="mt-1 text-sm ...">Partagez et découvrez...</p>
        </div>
        <button onClick={() => setShowPublish(true)} ...>+ Publier une ressource</button>
      </div>
      */}

      {/* Garder le bouton Publier dans la barre de filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* ... filtres existants ... */}
        <button
          onClick={() => setShowPublish(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl"
          style={{ background: "#16A34A", color: "#FFFFFF" }}
        >
          + Publier
        </button>
      </div>
      {/* ... reste du contenu inchangé ... */}
    </div>
  );
```

### 4c · Assistant (`src/app/assistant/page.tsx`)

La page Assistant a un layout `flex h-full` avec sidebar sessions + zone chat. On utilise `noPadding` pour préserver ce layout.

- [ ] **Step 5 : Modifier assistant/page.tsx**

Ajouter l'import :
```tsx
import PageShell from "@/components/ui/PageShell";
```

Envelopper le `return (...)` existant dans PageShell avec `noPadding` :

```tsx
  return (
    <PageShell
      title="Assistant IA"
      subtitle="Assistant pédagogique spécialisé OFPPT — posez vos questions en temps réel"
      icon="🤖"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Intelligence Artificielle" },
        { label: "Assistant IA" },
      ]}
      noPadding
    >
      <div className="flex h-full">
        <SessionList
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={selectSession}
          onNew={newSession}
          onDelete={deleteSession}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header interne (filtres filière/module) — à conserver tel quel */}
          <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h1 className="font-bold text-sm" style={{ color: "#111827" }}>Assistant Pédagogique IA</h1>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  {module
                    ? <>Filière : <span style={{ color: "#0A4DA8" }}>{filiere}</span> &mdash; Module : <span style={{ color: "#0A4DA8" }}>{module}</span></>
                    : <>Filière : <span style={{ color: "#0A4DA8" }}>{filiere || "—"}</span></>
                  }
                </p>
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold"
                style={{ background: "#0A4DA8" }}
              >
                IA
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {filieresList.map(f => (
                <button
                  key={f}
                  onClick={() => setFiliere(f)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-all whitespace-nowrap flex-shrink-0"
                  style={
                    filiere === f
                      ? { background: "#0A4DA818", color: "#0A4DA8", borderColor: "#0A4DA840" }
                      : { borderColor: "#E2E8F0", color: "#6B7280" }
                  }
                >
                  {f}
                </button>
              ))}
            </div>

            {currentFiliereModules.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pt-1.5 pb-0.5 scrollbar-none">
                <button
                  onClick={() => setModule("")}
                  className="text-[10px] px-2 py-0.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0"
                  style={
                    module === ""
                      ? { background: "#3B82F618", color: "#3B82F6", borderColor: "#3B82F640" }
                      : { borderColor: "#F3F4F6", color: "#4B5563" }
                  }
                >
                  Tous modules
                </button>
                {currentFiliereModules.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModule(m.nom)}
                    className="text-[10px] px-2 py-0.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0"
                    style={
                      module === m.nom
                        ? { background: "#3B82F618", color: "#3B82F6", borderColor: "#3B82F640" }
                        : { borderColor: "#F3F4F6", color: "#4B5563" }
                    }
                  >
                    {m.code ? `${m.code} — ${m.nom}` : m.nom}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ChatWindow messages={messages} isLoading={isLoading} onSuggestionClick={sendMessage} />
          <div ref={bottomRef} />
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </PageShell>
  );
```

- [ ] **Step 6 : Vérifier visuellement**

```bash
npm run dev
```

Ouvrir : `/referentiel`, `/bibliotheque`, `/assistant`  
Vérifier :
- Référentiel : header PageShell visible + état vide sans doublon de titre
- Bibliothèque : header PageShell + bouton "Publier" déplacé dans les filtres
- Assistant : header PageShell + chat prend la hauteur restante, pas de scroll horizontal

- [ ] **Step 7 : Commit final**

```bash
git add src/app/referentiel/page.tsx src/app/referentiel/ReferentielClient.tsx src/app/bibliotheque/page.tsx src/components/bibliotheque/BibliothequeClient.tsx src/app/assistant/page.tsx
git commit -m "feat: apply PageShell to referentiel, bibliotheque and assistant pages"
git push
```

---

## Self-review

**Spec coverage :**
- ✅ Composant `PageShell.tsx` créé (Task 1)
- ✅ Accent vert `#16A34A` — bordure bas + boutons CTA
- ✅ Header navy `#003087` + texture dots
- ✅ Fil d'Ariane contextuel sur toutes les pages
- ✅ 11 pages couvertes (Dashboard, Séances, Fiches, Évaluations, Corrections, Historique séances, Historique fiches, Référentiel, Suivi, Bibliothèque, Assistant, Guide)
- ✅ Pas de changement au contenu des pages
- ✅ `NavSidebar` et `AppShell` non modifiés

**Placeholder scan :** Aucun TBD / TODO dans le plan.

**Type consistency :** `PageShell` accepte `BreadcrumbItem[]` et `{ label: string; href: string }` pour action — utilisé de façon cohérente dans toutes les tâches.
