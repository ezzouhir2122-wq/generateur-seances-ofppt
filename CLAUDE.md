# Competencia IA

## Projet
Application web pour générer automatiquement des séances pédagogiques destinées aux formateurs OFPPT.

## Stack
- **Frontend** : Next.js 16 (App Router) + Tailwind CSS
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
- `src/app/api/generate/` — Route de génération IA (Claude → OpenAI fallback)
- `src/app/api/modules/` — CRUD modules importés (Excel)
- `src/app/api/stats/` — Statistiques formateur
- `src/app/historique/` — Historique des séances
- `src/lib/claude.ts` — Client Claude API
- `src/lib/openai.ts` — Client OpenAI
- `src/lib/db.ts` — Client Prisma (singleton)
- `src/lib/export.ts` — Export PDF + Word
- `src/components/ui/Sidebar.tsx` — Dashboard slide-over (⚙)
- `src/components/ui/AppShell.tsx` — Wrapper client (sidebar + toasts)
- `src/components/forms/SeanceForm.tsx` — Formulaire avec dropdowns intelligents
- `src/auth.ts` — NextAuth v5 config (Node.js)
- `src/auth.config.ts` — NextAuth config Edge (middleware)

## Compte formateur (dev)
- Email : `ezzouhir2122@gmail.com`
- Mot de passe : `ofppt2024`
- ⚠️ Pour créer un nouveau compte : utiliser l'endpoint PUT `/api/debug-auth` ou `equipment/create-formateur.ts` + recréer le hash via Next.js

## Points critiques
- `bcryptjs` doit être dans `serverExternalPackages` (next.config.ts) — sinon l'auth échoue avec Turbopack
- Le hash du mot de passe DOIT être créé dans le contexte Next.js (pas via `tsx` seul)
- `src/auth.ts` utilise Prisma → NE PAS importer dans middleware (Edge Runtime)

## Variables d'environnement requises
Voir `.env.example` — ne jamais commiter `.env`

## Règles
- **RÈGLE D'OR DÉPLOIEMENT** : Après CHAQUE modification de code, obligatoirement exécuter dans l'ordre :
  1. `git add <fichiers modifiés>`
  2. `git commit -m "type(scope): description"`
  3. `git push` → déclenche automatiquement le build Vercel
  4. Attendre 3-5 min puis vérifier sur **www.competencia.one** que la modification est visible
  5. Si la page n'est pas à jour : vérifier le dashboard Vercel → onglet Deployments → corriger l'erreur de build
- **VÉRIFICATION OBLIGATOIRE** : Après chaque push, utiliser Playwright pour naviguer sur `www.competencia.one` et confirmer visuellement que le changement est en production.
- **NE JAMAIS** ajouter des options expérimentales invalides dans `next.config.ts` — elles font échouer le build Vercel silencieusement.
- Toujours sauvegarder les décisions dans `decisions/ledger.md`
- Ne jamais stocker les clés API dans le code
- Tous les exports dans `src/lib/export.ts`
