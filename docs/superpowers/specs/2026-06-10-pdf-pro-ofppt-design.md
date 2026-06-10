# PDF Professionnel OFPPT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un en-tête OFPPT (logo + titre + date) et un pied de page formateur (nom, matricule, établissement, numéro de page) à tous les exports PDF de l'application.

**Architecture:** Deux helpers partagés `pdfHeader` / `pdfFooter` dans `src/lib/pdf-helpers.ts` consomment les infos formateur et s'appliquent aux 4 fonctions PDF existantes. Les champs `matricule` et `etablissement` sont ajoutés au modèle `User` via une migration Prisma, rendus accessibles côté client via le token NextAuth, et configurables dans la modale Paramètres existante.

**Tech Stack:** jsPDF (déjà installé), Prisma/PostgreSQL, NextAuth v5, Next.js 14 App Router

---

## Section 1 — Mise en page PDF cible

Chaque page de chaque document PDF produit par l'app doit respecter ce layout :

```
┌─────────────────────────────────────────────────────┐  bande verte 3mm (#84CC16)
│ [Logo OFPPT 14×14mm]  OFPPT — <Type>   <Date>       │  zone en-tête 20mm
│─────────────────────────────────────────────────────│  ligne #E5E7EB 0.3mm
│                                                     │
│              CONTENU DU DOCUMENT                    │
│                                                     │
│─────────────────────────────────────────────────────│  ligne #E5E7EB 0.3mm
│ Formateur : <Nom Prénom>  |  Mat. : <matricule>      │  zone pied 12mm
│ Établissement : <etab>    |  Page X / Y             │
└─────────────────────────────────────────────────────┘
```

- Fond blanc, texte principal `#1F2937`, texte secondaire `#6B7280`
- Logo chargé depuis `/logo-ofppt.jpg` converti en base64 (mis en cache module-level)
- Si matricule ou établissement non renseignés → afficher `—`
- Numérotation : `Page X / Y` calculée après `doc.internal.getNumberOfPages()`

## Section 2 — Schéma et profil formateur

### 2.1 Migration Prisma

Ajouter dans `prisma/schema.prisma`, modèle `User` :
```prisma
matricule     String?
etablissement String?
```

### 2.2 API PATCH `/api/user/profile`

Nouveau fichier `src/app/api/user/profile/route.ts` :
- Auth requise
- Body : `{ matricule?: string; etablissement?: string }`
- Valide que les champs sont des strings (max 100 chars)
- `prisma.user.update({ where: { id }, data: { matricule, etablissement } })`
- Retourne `{ success: true, user: { name, matricule, etablissement } }`

### 2.3 Enrichissement NextAuth

Dans `src/auth.ts`, callbacks `jwt` et `session` :
- Ajouter `matricule` et `etablissement` dans le token JWT et dans `session.user`
- Charger depuis DB au login et lors du refresh

### 2.4 Modale Paramètres

Dans `src/components/ui/Sidebar.tsx` (ouvert via `onSettingsClick` → `setDashOpen(true)` dans AppShell) :
- Ajouter une section "Profil Formateur" avec :
  - Input texte : Matricule (placeholder `ex: 9559`)
  - Input texte : Établissement (placeholder `ex: ISTA Hay Riad`)
  - Bouton "Sauvegarder" → PATCH `/api/user/profile`
  - Toast succès/erreur via sonner

## Section 3 — Helpers PDF partagés

### 3.1 Nouveau fichier `src/lib/pdf-helpers.ts`

```ts
import { jsPDF } from "jspdf";

export interface PdfHeaderOptions {
  titre: string;
  type: string;       // ex: "Séance Pédagogique", "Fiche Pédagogique", "Évaluation", "Suivi des Compétences"
  logoBase64?: string | null;
}

export interface PdfFormateur {
  name: string;
  matricule?: string | null;
  etablissement?: string | null;
}

// Module-level logo cache
let _logoBase64: string | null | undefined = undefined;

export async function getLogoBase64(): Promise<string | null> {
  if (_logoBase64 !== undefined) return _logoBase64;
  try {
    const res = await fetch("/logo-ofppt.jpg");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => { _logoBase64 = reader.result as string; resolve(_logoBase64!); };
      reader.onerror = () => { _logoBase64 = null; resolve(null); };
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

  // Bande verte
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 3, "F");

  // Logo OFPPT
  if (opts.logoBase64) {
    doc.addImage(opts.logoBase64, "JPEG", 10, 5, 14, 14);
  }

  // Titre centre
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GREEN);
  doc.text(`OFPPT — ${opts.type}`, W / 2, 12, { align: "center" });

  // Sous-titre (titre du document)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(opts.titre.length > 80 ? opts.titre.slice(0, 80) + "…" : opts.titre, W / 2, 17, { align: "center" });

  // Date à droite
  const dateStr = new Date().toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  const y = H - 12;

  // Ligne séparatrice
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, y, W - 10, y);

  // Bande verte en bas
  doc.setFillColor(...GREEN);
  doc.rect(0, H - 2, W, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);

  const mat = formateur.matricule ?? "—";
  const etab = formateur.etablissement ?? "—";
  doc.text(`Formateur : ${formateur.name}   |   Mat. : ${mat}`, 10, y + 5);
  doc.text(`Établissement : ${etab}`, 10, y + 9);
  doc.text(`Page ${pageNum} / ${totalPages}`, W - 10, y + 7, { align: "right" });
}
```

### 3.2 Refactoring `src/lib/export.ts`

Les 4 fonctions PDF sont modifiées pour accepter `formateur?: PdfFormateur` et utiliser les helpers :

**`exportToPDF(contenu, titre, formateur?)`**
- Charger logo via `await getLogoBase64()`
- Page 1 : `pdfHeader(doc, { titre, type: "Séance Pédagogique", logoBase64 })`
- Chaque nouvelle page : `pdfHeader` + ajuster `y` de départ à 26mm
- Fin : boucle sur toutes les pages pour appeler `pdfFooter`
- Zone contenu : y de 26mm à `pageHeight - 16mm`

**`exportFichePDF(contenu, titre, formateur?)`**
- Même traitement que `exportToPDF`, type : `"Fiche Pédagogique"`

**`exportProgressionPDF(groupeNom, filiere, annee, competences, stagiaires, formateur?)`**
- Remplacer l'en-tête maison actuel par `pdfHeader`
- Ajouter `pdfFooter` sur chaque page
- Type : `"Suivi des Compétences"`

**`exportToPPT`** — inchangée.

### 3.3 Mise à jour des call sites

Les pages/composants qui appellent les fonctions PDF passent le profil formateur :

| Fichier | Changement |
|---|---|
| `src/app/seances/page.tsx` | Lire `session.user` → passer `formateur` |
| `src/components/ui/SeanceDetailClient.tsx` | idem |
| `src/app/evaluations/page.tsx` | idem |
| `src/components/ui/FicheDetailClient.tsx` | idem |
| `src/components/suivi/ProgressionTable.tsx` | idem |

Pattern commun dans les client components :
```ts
const { data: session } = useSession();
const formateur = session?.user
  ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
  : undefined;
```

## Section 4 — Types TypeScript

Dans `src/types/next-auth.d.ts` (créer si absent) :
```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      matricule?: string | null;
      etablissement?: string | null;
    }
  }
  interface JWT {
    matricule?: string | null;
    etablissement?: string | null;
  }
}
```

## Contraintes

- Ne jamais modifier `.env` directement
- La migration Prisma doit être appliquée avec `npx prisma migrate dev --name add-user-profile`
- `getLogoBase64()` ne fonctionne que côté client (utilise `fetch` + `FileReader`) — toutes les fonctions `export*PDF` sont déjà côté client, pas de problème
- `exportFichePDF` est actuellement synchrone (void) — la rendre `async` pour awaiter le logo
