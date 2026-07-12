# PageShell — Restructuration visuelle des sections

**Date :** 2026-07-07  
**Statut :** Approuvé

---

## Objectif

Créer un composant `PageShell` réutilisable qui unifie la structure visuelle de toutes les pages de l'application Compétencia IA. Chaque section hérite du même squelette : bande header navale, fil d'Ariane, zone de contenu.

---

## Décisions de design

### Palette de tokens
| Token | Valeur | Usage |
|-------|--------|-------|
| Navy | `#003087` | Fond du header |
| Blue | `#0A4DA8` | Liens, éléments interactifs |
| Green | `#16A34A` | Accent : bordure bas header, boutons CTA |
| BG | `#EEF2F7` | Fond de la zone contenu |
| Surface | `#FFFFFF` | Cartes, panneaux |
| Text | `#111827` | Texte principal |

### Anatomie du PageShell

```
┌──────────────────────────────────────────────────────────┐  ← #003087 + dot pattern
│  [ICON]  Titre de la section                  [CTA btn]  │  88px min-height
│          Sous-titre contextuel                            │
└──────────────────────────────────────────────────────────┘  ← 3px #16A34A
┌──────────────────────────────────────────────────────────┐  ← #FFFFFF
│  Accueil › Groupe › Page active                          │  34px
└──────────────────────────────────────────────────────────┘  ← 1px border
────────────────────────────────────────────────────────────
  Zone contenu — background #EEF2F7, padding 28px / 32px
```

### Détails visuels du header
- Fond : `#003087` + texture dots CSS : `radial-gradient(circle, rgba(255,255,255,0.068) 1px, transparent 1px)` à 20px
- Icône : carré 44×44px, `border-radius: 12px`, fond `rgba(255,255,255,0.13)`, border `rgba(255,255,255,0.20)`
- Titre : 19px, weight 800, blanc, `letter-spacing: -0.025em`
- Sous-titre : 12.5px, `rgba(255,255,255,0.58)`
- Bouton CTA : `#16A34A`, padding 9×17px, `border-radius: 9px`, shadow `rgba(22,163,74,0.35)`
- Bordure bas : `3px solid #16A34A`

### Fil d'Ariane
- Fond blanc `#FFFFFF`, hauteur 34px, padding 8px 28px
- Séparateur `›`, couleur `#D1D5DB`
- Item actif : `#111827` weight 600 ; items parents : `#6B7280` weight 500, cliquables

---

## Interface TypeScript

```typescript
interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: string;                                    // emoji
  breadcrumb?: { label: string; href?: string }[];
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  children: React.ReactNode;
}
```

---

## Pages à mettre à jour (10 pages)

| Page | Route | Icon | CTA |
|------|-------|------|-----|
| Dashboard | `/` | `🏠` | — |
| Séance pédagogique | `/seances` | `⚡` | `📂 Historique` → `/historique` |
| Fiche pédagogique | `/fiches` | `📋` | `📂 Mes fiches` → `/fiches/historique` |
| Évaluation | `/evaluations` | `☑️` | — |
| Correction IA | `/corrections` | `✏️` | — |
| Mes séances | `/historique` | `🕐` | `+ Nouvelle séance` → `/seances` |
| Mes fiches | `/fiches/historique` | `📁` | `+ Nouvelle fiche` → `/fiches` |
| Référentiel | `/referentiel` | `📑` | `+ Importer Excel` |
| Suivi des compétences | `/suivi` | `📊` | `+ Nouveau groupe` → `/suivi/nouveau` |
| Bibliothèque | `/bibliotheque` | `📚` | `+ Publier` |
| Assistant IA | `/assistant` | `🤖` | — |
| Guide | `/guide` | `❓` | — |

---

## Fichiers à créer / modifier

### Nouveau fichier
- `src/components/ui/PageShell.tsx` — composant réutilisable

### Fichiers modifiés
- `src/app/page.tsx`
- `src/app/seances/page.tsx`
- `src/app/fiches/page.tsx`
- `src/app/evaluations/page.tsx`
- `src/app/corrections/page.tsx`
- `src/app/historique/page.tsx`
- `src/app/fiches/historique/page.tsx`
- `src/app/referentiel/ReferentielClient.tsx`
- `src/app/suivi/page.tsx`
- `src/components/bibliotheque/BibliothequeClient.tsx`
- `src/app/assistant/page.tsx`
- `src/app/guide/page.tsx`

---

## Contraintes techniques

- Le composant doit fonctionner dans des pages **Server Components** ET **Client Components**
- Pour les pages Client (`"use client"`), `PageShell` doit accepter un `action.onClick` (pas seulement `href`)
- Pour les pages Server, `action.href` suffit (rendu en `<Link>`)
- Le `PageShell` lui-même est un **Server Component** (pas de `"use client"`) — il reçoit tout par props
- Le bouton CTA avec `onClick` nécessite un wrapper client minimal si besoin
- Supprimer les anciens `<div style={{ background: "#EEF2F7", minHeight: "100%", padding: "28px" }}>` remplacés par `PageShell`

---

## Hors périmètre

- Aucun changement au contenu des pages (formulaires, listes, résultats)
- Aucun changement à la NavSidebar
- Aucun changement aux composants enfants (SeanceForm, GroupeCard, etc.)
- Pas de dark mode pour l'application (les pages utilisent déjà des styles inline fixes)
