# Générateur de Séances Pédagogiques OFPPT

## Projet
Application web pour générer automatiquement des séances pédagogiques destinées aux formateurs OFPPT.

## Stack
- **Frontend** : Next.js 14 (App Router) + Tailwind CSS
- **Backend** : Next.js API Routes
- **IA** : Claude API (Anthropic) + OpenAI GPT
- **Base de données** : PostgreSQL via Prisma ORM
- **Auth** : NextAuth.js
- **Export** : jsPDF + docx

## Commandes essentielles
```bash
npm run dev       # Lancer le serveur de développement
npm run build     # Build production
npx prisma studio # Interface base de données
npx prisma migrate dev --name [nom] # Nouvelle migration
```

## Démarrer chaque session
1. Lire `live/state.md`
2. Vérifier `live/tasks.md`
3. Vérifier `.env` (clés API configurées ?)

## Architecture clé
- `src/app/api/generate/` — Route de génération IA
- `src/app/dashboard/` — Interface principale formateur
- `src/lib/claude.ts` — Client Claude API
- `src/lib/openai.ts` — Client OpenAI
- `src/lib/db.ts` — Client Prisma
- `src/components/forms/` — Formulaire de génération

## Variables d'environnement requises
Voir `.env.example` — ne jamais commiter `.env`

## Règles
- Toujours sauvegarder les décisions dans `decisions/ledger.md`
- Ne jamais stocker les clés API dans le code
- Tous les exports dans `src/lib/export.ts`
