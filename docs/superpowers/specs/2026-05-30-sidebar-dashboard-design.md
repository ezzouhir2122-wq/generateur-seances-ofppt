# Spec — Sidebar Dashboard + Import Excel Modules
**Date :** 2026-05-30  
**App :** Competencia IA  
**Statut :** Approuvé

---

## 1. Objectif

Ajouter un panneau latéral droit (slide-over) configurable permettant au formateur de :
- Consulter son profil, ses stats, l'état des API
- Naviguer rapidement dans l'app
- Importer son fichier Excel OFPPT (Groupe | Module | MH.G) pour alimenter le formulaire de génération
- Voir les fonctionnalités à venir

---

## 2. Architecture

### Nouveaux fichiers
```
src/components/ui/Sidebar.tsx         ← Panneau slide-over principal (Client Component)
src/components/ui/SidebarToggle.tsx   ← Bouton ⚙ dans le header
src/app/api/modules/route.ts          ← GET / POST / DELETE modules
src/app/api/stats/route.ts            ← GET statistiques formateur
docs/superpowers/specs/               ← Ce fichier
```

### Fichiers modifiés
```
src/app/layout.tsx                    ← Ajout bouton toggle + <Sidebar>
src/components/forms/SeanceForm.tsx   ← Groupe et Module deviennent des <select>
prisma/schema.prisma                  ← Nouveau modèle UserModule
```

### Nouveau modèle Prisma
```prisma
model UserModule {
  id        String   @id @default(cuid())
  groupe    String
  module    String
  mhg       Int
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@unique([groupe, module, userId])
}
```

---

## 3. Design visuel du Sidebar

- **Déclencheur :** bouton `⚙` à droite dans le header (visible uniquement si connecté)
- **Comportement :** glisse depuis la droite, overlay semi-transparent derrière
- **Largeur :** 380px
- **Fermeture :** ✕ en haut, clic overlay, touche Échap
- **Fond :** blanc, ombre portée à gauche

### Sections (dans l'ordre)
1. **Profil** — nom, email du formateur connecté
2. **Statistiques** — séances générées, modules importés, filières actives
3. **Paramètres API** — état Claude ✅/❌, état OpenAI ✅/❌ (lecture `process.env`)
4. **Navigation rapide** — liens Nouvelle séance / Mes séances
5. **Paramétrage Modules** — import Excel, compteur modules, bouton réinitialiser
6. **À venir** — liste de fonctionnalités futures (Coming soon)

---

## 4. Flux Import Excel

### Étapes
1. Formateur clique `[📥 Importer fichier Excel]`
2. Sélecteur de fichier → accepte `.xlsx` et `.xls`
3. SheetJS (`xlsx` library) parse le fichier **côté client**
4. Détection des colonnes : `Groupe | Module | MH.G`
5. Aperçu : "47 lignes détectées — confirmer l'import ?"
6. Confirmation → `POST /api/modules` (payload JSON)
7. Prisma `upsert` (unique sur groupe + module + userId) → évite les doublons
8. Toast de confirmation : "✅ 47 modules importés"
9. Sidebar affiche le nouveau compteur

### Structure Excel attendue
| Groupe    | Module                          | MH.G |
|-----------|---------------------------------|------|
| GE105     | Ecrits professionnels           | 50   |
| GEOCF203  | Pratique de la paie             | 60   |
| IDOCS201  | Compétences comportementales    | 30   |

### Fallback
Si aucun module importé → formulaire actuel inchangé (champs texte libre). Rien ne casse.

---

## 5. Intégration Formulaire de génération

### Changements dans SeanceForm.tsx
- **Groupe** : `<select>` alimenté par `GET /api/modules?distinct=groupe`
- **Module** : `<select>` filtré selon le groupe sélectionné (`GET /api/modules?groupe=GEOCF203`)
- **MH.G** : champ numérique auto-rempli à la sélection du module
- **Prompt IA** : inclure MH.G dans le prompt pour un résultat calibré à la durée réelle

### Condition d'affichage
```
modules.length > 0 → dropdowns select
modules.length === 0 → champs texte libre (comportement actuel)
```

---

## 6. APIs

### GET /api/modules
- Retourne les modules de l'utilisateur connecté
- Query params : `?distinct=groupe` ou `?groupe=GEOCF203`

### POST /api/modules
- Body : `{ modules: [{ groupe, module, mhg }] }`
- Upsert pour éviter les doublons
- Retourne le nombre de modules insérés/mis à jour

### DELETE /api/modules
- Supprime tous les modules de l'utilisateur connecté
- Utilisé par le bouton "Réinitialiser"

### GET /api/stats
- Retourne : `{ seancesCount, modulesCount, filieresCount }`

---

## 7. Dépendances à installer

```bash
npm install xlsx        # SheetJS pour parser Excel côté client
npm install sonner      # Toast notifications
```

---

## 8. Ordre d'implémentation

1. Migration Prisma (UserModule)
2. APIs (`/api/modules`, `/api/stats`)
3. Sidebar component (toutes sections)
4. Intégration dans layout.tsx
5. Mise à jour SeanceForm.tsx (dropdowns conditionnels)
