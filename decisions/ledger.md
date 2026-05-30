# Journal de Décisions

_Append-only — ne jamais modifier les entrées existantes_

---

## 2026-05-30 — Initialisation du projet

**Décision :** Stack Next.js 14 + Claude API + OpenAI + Prisma + PostgreSQL

**Raison :** Simple à déployer, professionnel, full-stack en TypeScript. Next.js permet d'avoir frontend et API dans le même projet sans backend séparé.

**Décision :** Authentification avec NextAuth.js

**Raison :** Solution standard, sécurisée, facile à intégrer avec Next.js. Pas besoin de gérer les sessions manuellement.

**Décision :** Double IA (Claude principal + GPT fallback)

**Raison :** Redondance en cas d'indisponibilité d'un service. Claude pour la qualité, GPT pour le fallback.
