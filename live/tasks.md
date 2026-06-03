# Tasks — Competencia IA

## ✅ Complétées

### Phase 1 — Setup & MVP
- [x] Initialiser Next.js avec TypeScript + Tailwind + App Router
- [x] Installer dépendances : `@anthropic-ai/sdk openai prisma @prisma/client next-auth bcryptjs`
- [x] Configurer les variables d'environnement (`.env`)
- [x] Créer schéma Prisma (User, Seance)
- [x] Première migration base de données

### Phase 2 — Génération IA
- [x] Créer `src/lib/claude.ts` — client Claude API
- [x] Créer `src/lib/openai.ts` — client OpenAI
- [x] Créer `src/app/api/generate/route.ts` — endpoint génération (Claude → GPT fallback)
- [x] Construire le formulaire de génération
- [x] Afficher la séance générée (react-markdown)

### Phase 3 — Auth & Sauvegarde
- [x] Configurer NextAuth.js v5 (credentials + JWT)
- [x] Page de login avec logo OFPPT
- [x] Middleware de protection des routes (Edge/Node split)
- [x] Fix bcryptjs (serverExternalPackages dans next.config.ts)
- [x] Sauvegarder les séances en base de données
- [x] Page historique des séances
- [x] Page détail séance

### Phase 4 — Export
- [x] Export PDF avec jsPDF
- [x] Export Word avec docx

### Phase 5 — UI & Branding
- [x] Logo OFPPT dans header et login
- [x] Renommer app en "Competencia IA"
- [x] Push sur GitHub (privé)

### Phase 6 — Sidebar Dashboard (v2)
- [x] Installer xlsx (SheetJS) + sonner (toasts)
- [x] Modèle Prisma UserModule + migration
- [x] API `/api/modules` (GET/POST/DELETE)
- [x] API `/api/stats` (GET)
- [x] Composant Sidebar.tsx (slide-over droite)
- [x] Composant AppShell.tsx (toggle + Toaster)
- [x] Intégration layout.tsx
- [x] SeanceForm.tsx — dropdowns intelligents si Excel importé

---

## 🔄 En cours / À faire

### Phase 7 — Test & Production
- [ ] Configurer clés API Claude/OpenAI réelles dans `.env`
- [ ] Tester génération complète avec l'IA
- [ ] Tester import Excel (EtatXLS.xlsx depuis Desktop)
- [ ] Tester flux complet : login → import → générer → exporter

### Phase 8 — Améliorations (optionnel)
- [ ] Améliorer prompt IA avec MH.G pour calibrer la durée
- [ ] Ajouter édition de séance avant export
- [ ] Déploiement Vercel + Supabase
- [ ] Gestion multi-formateurs (admin)
- [ ] Génération de séquences pédagogiques complètes
- [ ] Templates personnalisés par filière
