# Tasks — Générateur Séances OFPPT

## Phase 1 — Setup & MVP
- [ ] Initialiser Next.js avec TypeScript + Tailwind + App Router
- [ ] Installer dépendances : `@anthropic-ai/sdk openai prisma @prisma/client next-auth`
- [ ] Configurer les variables d'environnement
- [ ] Créer schéma Prisma (User, Seance)
- [ ] Première migration base de données

## Phase 2 — Génération IA
- [ ] Créer `src/lib/claude.ts` — client Claude API
- [ ] Créer `src/lib/openai.ts` — client OpenAI
- [ ] Créer `src/app/api/generate/route.ts` — endpoint génération
- [ ] Construire le formulaire de génération (filière, module, durée, objectifs)
- [ ] Afficher la séance générée

## Phase 3 — Auth & Sauvegarde
- [ ] Configurer NextAuth.js
- [ ] Page de login formateur
- [ ] Sauvegarder les séances en base de données
- [ ] Page historique des séances

## Phase 4 — Export
- [ ] Export PDF avec jsPDF
- [ ] Export Word avec docx
- [ ] Boutons d'export dans l'interface

## Phase 5 — Polish
- [ ] Interface d'édition de la séance avant export
- [ ] Design final (shadcn/ui)
- [ ] Tests utilisateurs avec formateurs
- [ ] Déploiement

## Complétées
_Aucune pour l'instant_
