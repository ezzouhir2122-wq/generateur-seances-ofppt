# Générateur de Séances Pédagogiques OFPPT

Application web permettant aux formateurs OFPPT de générer automatiquement des séances pédagogiques complètes via l'IA (Claude + GPT).

## Fonctionnalités
- Formulaire de génération (filière, module, durée, objectifs)
- Génération automatique via Claude / OpenAI GPT
- Export PDF et Word
- Historique des séances par formateur
- Authentification sécurisée

## Installation

```bash
npm install
cp .env.example .env
# Remplir les clés dans .env
npx prisma migrate dev
npm run dev
```

## Stack
Next.js 14 · Tailwind CSS · Prisma · PostgreSQL · Claude API · OpenAI API
