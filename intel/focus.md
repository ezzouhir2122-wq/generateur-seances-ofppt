# Priorités & Focus

**Mise à jour :** 2026-05-30

## Top 3 priorités actuelles
1. **MVP** — Formulaire de génération + appel Claude API + affichage résultat
2. **Auth** — Login formateur (NextAuth.js) + protection des routes
3. **Export** — Génération PDF de la séance produite

## Phase actuelle
Initialisation — structure créée, code à écrire

## Prochaine étape immédiate
Initialiser le projet Next.js et configurer les dépendances de base
```bash
npx create-next-app@latest . --typescript --tailwind --app
npm install @anthropic-ai/sdk openai prisma @prisma/client next-auth
```
