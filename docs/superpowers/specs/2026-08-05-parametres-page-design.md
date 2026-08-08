# Design Spec — Page Paramètres `/parametres`

**Date** : 2026-08-05  
**Projet** : Competencia IA (OFPPT)  
**Stack** : Next.js 16 App Router · Tailwind CSS · PostgreSQL/Prisma · NextAuth  
**Statut** : Approuvé

---

## Contexte

Le bouton "Modules & Paramètres" dans `NavSidebar.tsx` ouvre actuellement un panneau slide-over (`Sidebar.tsx`, 380px). Ce panneau contient 4 sections : Profil, Référentiel pédagogique, Référentiels importés, Paramètres API.

**Objectif** : Remplacer ce slide-over par une page dédiée `/parametres` plein écran, organisée en onglets horizontaux, avec un design moderne adapté à l'espace disponible.

---

## Décisions

| Sujet | Décision |
|---|---|
| Accès | Nouvelle route `/parametres`, lien dans `NavSidebar` |
| Layout | Onglets horizontaux (4 onglets) |
| Sections | Profil · Clés API · Référentiel · Compte & Sécurité |
| Migration | Slide-over (`Sidebar.tsx`) supprimé complètement |
| Approche | Refonte complète (code neuf, APIs existantes réutilisées) |

---

## Architecture des fichiers

### Nouveaux fichiers
```
src/app/parametres/
  page.tsx                        ← Server Component (auth + données initiales)
  ParametresClient.tsx            ← Client Component (onglets, état global)

src/components/parametres/
  ProfilTab.tsx                   ← Onglet Profil
  ApiTab.tsx                      ← Onglet Clés API & Modèle IA
  ReferentielTab.tsx              ← Onglet Référentiel pédagogique
  CompteTab.tsx                   ← Onglet Compte & Sécurité

src/app/api/user/password/
  route.ts                        ← Nouvel endpoint PATCH changer mot de passe
```

### Fichiers modifiés
```
src/components/ui/NavSidebar.tsx  ← button → Link href="/parametres", retrait prop onSettingsClick
src/components/ui/AppShellV2.tsx  ← retrait état sidebarOpen + import Sidebar
```

### Fichiers supprimés
```
src/components/ui/Sidebar.tsx
```

---

## Page `/parametres`

### `page.tsx` (Server Component)
- Vérifie la session NextAuth (`auth()`), redirige vers `/login` si non authentifié
- Charge les données profil depuis Prisma (`name`, `email`, `matricule`, `etablissement`)
- Passe les données initiales à `ParametresClient` en props (évite un premier fetch client)

### `ParametresClient.tsx` (Client Component)
- Gère l'onglet actif via `useState<"profil"|"api"|"referentiel"|"compte">`
- Barre d'onglets horizontale en haut (4 onglets avec icône + label)
- Rend le composant Tab actif sous la barre
- `max-w-5xl mx-auto px-6 py-8`

---

## Onglet 1 — Profil formateur

**Composant** : `ProfilTab.tsx`  
**Layout** : card unique `max-w-2xl`

### Contenu
- Avatar initiales (64px, fond `#003087`, lettre blanche)
- **Nom complet** : affiché en lecture seule (vient de NextAuth, non modifiable ici)
- **Email** : affiché en lecture seule
- **Matricule** : input texte, placeholder "9559"
- **Établissement** : input texte, placeholder "ISTA Hay Riad"
- Bouton "Sauvegarder le profil" → `PATCH /api/user/profile`
- Toast success "Profil mis à jour" / error "Erreur lors de la sauvegarde"

---

## Onglet 2 — Clés API & Modèle IA

**Composant** : `ApiTab.tsx`  
**Layout** : 2 colonnes sur desktop (`lg:grid-cols-[200px_1fr]`)

### Colonne gauche — Sélecteur de provider
Liste des 6 providers (Anthropic, OpenAI, Google, OpenRouter, xAI, Zhipu) sous forme de boutons verticaux. Chaque bouton affiche :
- Nom du provider
- Badge coloré : "✓ Actif" (couleur provider) ou "Non configuré" (gris)

Clic sur un provider → change le contenu de la colonne droite.

### Colonne droite — Configuration du provider actif
1. **Modèle IA** : dropdown des modèles disponibles pour ce provider
2. **Clé API** : input `type=password` avec toggle show/hide, placeholder spécifique au provider, badge statut
3. **Actions** :
   - Bouton "Tester la connexion" → `POST /api/user/test-api` (résultat inline)
   - Bouton "Sauvegarder" → `PATCH /api/user/api-settings`

### APIs utilisées
- `GET /api/user/api-settings` → chargement initial
- `PATCH /api/user/api-settings` → sauvegarde
- `POST /api/user/test-api` → test connexion

---

## Onglet 3 — Référentiel pédagogique

**Composant** : `ReferentielTab.tsx`  
**Layout** : 2 colonnes sur desktop (`lg:grid-cols-2`)

### Colonne gauche — Import
- **Import IA** : bouton "Importer un référentiel" → `<input type="file">` (PDF, DOCX, Excel, CSV, MD) → `POST /api/referentiel` (extraction IA ~15-30s, spinner pendant upload)
- **Import sans IA** : bouton "Importer mon fichier Excel" + lien "Télécharger le modèle" (`GET /api/referentiel?mode=template`)
- Formats acceptés affichés en badges
- Message d'avertissement durée extraction IA

### Colonne droite — Référentiels importés
- Liste des secteurs importés (`GET /api/referentiel?mode=list`)
- Chaque secteur : header expandable (nom, nb filières, nb modules)
- Expanded : liste des filières avec leurs modules en chips
- Actions par secteur : exporter Excel, supprimer (`DELETE /api/referentiel?secteurId=...`)
- État vide : "Aucun référentiel importé"

---

## Onglet 4 — Compte & Sécurité

**Composant** : `CompteTab.tsx`  
**Layout** : cards empilées, `max-w-2xl`

### Card 1 — Session active
- Email de l'utilisateur connecté
- Bouton "Se déconnecter" → `signOut({ callbackUrl: "/login" })`

### Card 2 — Changer le mot de passe
- Input "Mot de passe actuel"
- Input "Nouveau mot de passe" (min 8 chars)
- Input "Confirmer le nouveau mot de passe"
- Validation client : les deux nouveaux MDP correspondent
- Bouton "Mettre à jour" → `PATCH /api/user/password`
- Toast success / error

### Card 3 — Zone dangereuse
- Style : border rouge
- Bouton "Supprimer mon compte" → modale de confirmation (`window.confirm` ou dialog natif)
- À l'approbation : `DELETE /api/user/account` (endpoint à créer)
- Redirige vers `/login` après suppression

---

## Nouvel endpoint — `PATCH /api/user/password`

```
Body: { currentPassword: string, newPassword: string }
Réponse 200: { ok: true }
Réponse 400: { error: "Mot de passe actuel incorrect" }
Réponse 400: { error: "Le mot de passe doit faire au moins 8 caractères" }
```

Logique :
1. Auth check
2. Charger le hash actuel depuis Prisma
3. `bcryptjs.compare(currentPassword, hash)` — erreur 400 si faux
4. `bcryptjs.hash(newPassword, 10)` → mettre à jour

---

## Migration `NavSidebar.tsx`

Remplacer :
```tsx
<button onClick={onSettingsClick} ...>
  <GearIcon /> Modules & Paramètres
</button>
```
Par :
```tsx
<Link href="/parametres" ...>
  <GearIcon /> Paramètres
</Link>
```
Retirer la prop `onSettingsClick` de l'interface `NavSidebarProps`.

---

## Migration `AppShellV2.tsx`

Retirer :
- `const [sidebarOpen, setSidebarOpen] = useState(false)`
- Import de `Sidebar`
- Le rendu `<Sidebar open={sidebarOpen} onClose={...} .../>`
- La prop `onSettingsClick={() => setSidebarOpen(true)}` passée à `NavSidebar`

---

## Gestion des états de chargement

| Contexte | Comportement |
|---|---|
| Chargement initial des clés API | Skeleton / spinner dans `ApiTab` |
| Chargement des référentiels | Spinner dans `ReferentielTab` |
| Upload référentiel IA | Spinner + message "Extraction IA…" |
| Test API | Spinner inline dans le bouton |
| Sauvegarde | `disabled + opacity-50` sur le bouton actif |

---

## Style & Cohérence visuelle

- Couleurs primaires : `#003087` (OFPPT bleu), `#16A34A` (vert actif)
- Background page : `#F8FAFC`
- Cards : `bg-white border border-[#E2E8F0] rounded-xl`
- Onglet actif : border-bottom `#003087`, texte `#003087`
- Onglet inactif : texte `#6B7280`, hover `#374151`
- Inputs : `bg-[#F3F4F6] border border-[#E2E8F0] rounded-lg`
