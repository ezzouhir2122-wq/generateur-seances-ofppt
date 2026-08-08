# Collaboration & Partage — Bibliothèque enrichie

**Date :** 2026-08-08  
**Statut :** Approuvé  
**Approche retenue :** A — Enrichissement ciblé

---

## Contexte

La Bibliothèque collaborative existe déjà (`SharedResource`, likes, commentaires, filtres filière/module/type). Problème constaté : les formateurs ne voient pas leurs séances générées dans la bibliothèque car la publication est manuelle et peu visible. De plus, l'identité inter-établissements (OFPPT national) n'est pas exploitée.

---

## Objectif

1. Permettre aux formateurs de voir et partager leurs séances/fiches facilement depuis la bibliothèque
2. Afficher l'établissement d'origine sur chaque ressource partagée + filtre par établissement

---

## Architecture

### 1. Onglets dans la Bibliothèque

La page `/bibliotheque` passe à 2 onglets :

- **"Communauté"** — comportement actuel : toutes les ressources partagées publiquement, filtres, recherche, likes, commentaires
- **"Mes séances & fiches"** — liste les séances (depuis `/api/seances` historique) et fiches (depuis `/api/fiches`) de l'utilisateur connecté. Chaque carte affiche :
  - Titre, filière, module, date de génération
  - Bouton **"Partager"** → ouvre PublishModal pré-rempli (sourceId + type)
  - Badge **"Publié ✓"** si la ressource a déjà une SharedResource associée (vérification par sourceId)

### 2. Établissement sur les ressources

- Champ `etablissement String?` ajouté à `SharedResource`
- Copié depuis `user.etablissement` au moment de la publication (POST)
- Affiché sous le nom de l'auteur : `Elmustapha Ezzouhir · ISGI Marrakech`
- Omis silencieusement si null
- Nouveau filtre **"Tous les établissements"** dans la barre de recherche

---

## Changements techniques

### Base de données
```prisma
model SharedResource {
  // ... champs existants ...
  etablissement String?  // nouveau
}
```
Migration : `npx prisma migrate dev --name add-etablissement-to-shared-resource`

### API

| Route | Changement |
|-------|-----------|
| `POST /api/bibliotheque` | Lire `session.user.etablissement`, stocker dans `etablissement` |
| `GET /api/bibliotheque` | Retourner `etablissement` + accepter param `?etablissement=` pour filtrer + retourner liste des établissements distincts |
| `GET /api/bibliotheque/mes-ressources` | **Nouveau** — retourner séances + fiches de l'utilisateur avec flag `isPublished` |

### Composants

| Fichier | Changement |
|---------|-----------|
| `BibliothequeClient.tsx` | Ajouter onglets Communauté / Mes séances & fiches, fetch mes-ressources, filtre établissement |
| `ResourceCard.tsx` | Afficher `etablissement` sous l'auteur |
| `PublishModal.tsx` | Accepter props `defaultSourceId` et `defaultType` pour pré-remplissage |
| `types/bibliotheque.ts` | Ajouter `etablissement?: string` à `ResourceListItem` et `ResourceDetail` |

---

## Hors scope (à faire après)

- Co-construction de référentiels par filière (votes sur compétences)
- Forum inter-établissements
- Dashboard stats national

---

## Critères de succès

- Un formateur voit ses séances dans l'onglet "Mes séances & fiches" dès qu'il arrive sur la bibliothèque
- Le bouton "Partager" ouvre le PublishModal avec sourceId et type déjà remplis
- Les ressources publiées affichent l'établissement de l'auteur
- Le filtre établissement retourne les bonnes ressources
