# Journal de Décisions

_Append-only — ne jamais modifier les entrées existantes_

---

## 2026-06-03 — Version 2 — Sidebar Dashboard + Import Excel

**Décision :** Sidebar slide-over à droite (380px, overlay, touche Échap)
**Raison :** Non-intrusif, accessible depuis toutes les pages sans changer la layout principale.

**Décision :** Import Excel côté client avec SheetJS (xlsx)
**Raison :** Évite d'envoyer le fichier complet au serveur. Parse en mémoire, envoie uniquement le JSON résultant.

**Décision :** `serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma"]` dans next.config.ts
**Raison :** Turbopack bundlait mal bcryptjs, causant des comparaisons hash incorrectes. Fix critique pour l'auth.

**Décision :** AppShell.tsx comme wrapper client pour le sidebar + Toaster
**Raison :** layout.tsx est Server Component (nécessaire pour auth). Le state du sidebar (ouvert/fermé) doit être côté client.

**Décision :** Mot de passe stocké : hash créé via endpoint Next.js (pas via tsx/node directement)
**Raison :** bcryptjs dans le contexte Turbopack peut produire des hash incompatibles avec ceux créés hors Next.js.

---

## 2026-05-30 — Initialisation du projet

**Décision :** Stack Next.js 14 + Claude API + OpenAI + Prisma + PostgreSQL

**Raison :** Simple à déployer, professionnel, full-stack en TypeScript. Next.js permet d'avoir frontend et API dans le même projet sans backend séparé.

**Décision :** Authentification avec NextAuth.js

**Raison :** Solution standard, sécurisée, facile à intégrer avec Next.js. Pas besoin de gérer les sessions manuellement.

**Décision :** Double IA (Claude principal + GPT fallback)

**Raison :** Redondance en cas d'indisponibilité d'un service. Claude pour la qualité, GPT pour le fallback.

---

## 2026-06-13 — Référentiel : génération guidée

**Décision (A1) :** Niveau `Séquence` ajouté de façon additive — `Competence.moduleId` reste requis, nouvelle colonne nullable `Competence.sequenceId` + table `Sequence`. Hiérarchie `RefModule → Sequence → Competence`.

**Raison :** Rétro-compatibilité totale. Les compétences existantes restent rattachées au module (`sequenceId = null`), et le Suivi des compétences (`GroupeCompetence`, `ProgressionCompetence` qui référencent `Competence`) n'est pas impacté.

**Décision :** Migration appliquée par **SQL additif** (`prisma/migrations/add_sequences.sql`, `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`) via `prisma db execute` sur la connexion directe Supabase — **pas** `prisma migrate dev`.

**Raison :** La base est en production sur Supabase et le référentiel a été créé hors historique Prisma (`referentiel_pedagogique.sql`). `migrate dev` détecterait un drift et proposerait un reset (perte de données). Le SQL additif idempotent est non destructif.

**Décision (B1) :** Handoff du contexte de génération via `sessionStorage` (clé `referentielContext`), consommée une seule fois (`consumeReferentielContext`) par chaque générateur.

**Raison :** Réutilise les pages `/seances`, `/fiches`, `/evaluations` existantes sans query params à rallonge ; gère les objectifs/critères multi-lignes. La consommation unique évite de polluer une génération manuelle ultérieure.

**Livrable :** Page `/referentiel/generer` — cascade Filière→Module→Séquence→Compétence → boutons Séance / Fiche / Évaluation pré-remplis. Import IA et endpoint `?mode=cascade` étendus aux séquences.
