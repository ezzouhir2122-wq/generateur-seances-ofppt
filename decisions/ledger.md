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
