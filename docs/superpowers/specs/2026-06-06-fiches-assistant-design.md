# Design Spec — Fiches Pédagogiques + Assistant IA (v3)

**Date :** 2026-06-06  
**Projet :** Competencia IA — Générateur de séances OFPPT  
**Auteur :** Session Claude Code

---

## 1. Contexte

L'application existante (v2) permet de générer des séances pédagogiques via IA, avec auth, historique et import Excel des modules. Cette spec décrit l'ajout de deux nouvelles fonctionnalités et la refonte de la navigation.

---

## 2. Navigation — Sidebar gauche permanente

### Structure
La navigation actuelle (header simple) est remplacée par une sidebar gauche permanente (190px) visible sur toutes les pages protégées.

**Sections :**
```
OUTILS
  📝  Séances pédagogiques     → /
  📋  Fiches pédagogiques      → /fiches
  🤖  Assistant IA             → /assistant

HISTORIQUE
  🕒  Mes séances              → /historique
  📁  Mes fiches               → /fiches/historique

Bas de sidebar : avatar + nom + email du formateur connecté
```

### Comportement
- Élément actif mis en surbrillance (fond blanc/15% opacity)
- Le bouton ⚙ Dashboard (slide-over) reste accessible depuis le header de chaque page
- Sur mobile : sidebar masquée par défaut, bouton hamburger en haut à gauche

### Fichiers impactés
- `src/components/ui/AppShell.tsx` — ajouter la sidebar gauche
- `src/app/layout.tsx` — wrapper inchangé (AppShell gère tout)
- Nouveau composant : `src/components/ui/NavSidebar.tsx`

---

## 3. Fiches Pédagogiques

### Page `/fiches`

Formulaire de génération d'une fiche pédagogique au format OFPPT standard.

**Champs du formulaire :**
| Champ | Type | Obligatoire |
|-------|------|-------------|
| Filière | select (depuis modules importés ou liste OFPPT) | Oui |
| Module | texte ou select | Oui |
| Intitulé de la séance | texte | Oui |
| Nom du formateur | texte (pré-rempli depuis profil) | Oui |
| Durée totale | select (1h / 2h / 3h / 4h) | Oui |
| Type | radio (Théorique / TP / TA) | Oui |
| Niveau | select (1ère / 2ème année) | Oui |
| Objectifs — Savoir | textarea | Oui |
| Objectifs — Savoir-faire | textarea | Oui |
| Objectifs — Savoir-être | textarea | Non |
| Prérequis des stagiaires | textarea | Non |

**Pré-remplissage depuis une séance :**  
Un bouton "Créer une fiche depuis cette séance" sur la page `/historique/[id]` pré-remplit le formulaire `/fiches` via query params (`?from=<seanceId>`).

**Contenu de la fiche générée par IA :**
1. En-tête officiel OFPPT (filière, module, formateur, date, durée)
2. Tableau des objectifs pédagogiques (savoir / savoir-faire / savoir-être)
3. Déroulement de la séance :
   - Phase d'introduction / mise en situation (durée indicative)
   - Phase de développement (activités détaillées, méthodes, supports)
   - Phase de synthèse et évaluation
4. Ressources et matériel pédagogique
5. Grille d'évaluation formative

**Export :** PDF et Word (via `src/lib/export.ts` existant)  
**Sauvegarde :** Nouveau modèle Prisma `Fiche` lié à `User`

### Page `/fiches/historique`

Liste des fiches générées (card avec titre, module, date, actions : voir / exporter / supprimer).  
Même pattern que `/historique` pour les séances.

### Page `/fiches/[id]`

Affichage détail d'une fiche sauvegardée avec boutons export.

### API Routes
- `POST /api/fiches/generate` — génère la fiche via Claude (→ OpenAI fallback), sauvegarde en DB
- `GET /api/fiches` — liste les fiches de l'utilisateur connecté
- `GET /api/fiches/[id]` — détail d'une fiche
- `DELETE /api/fiches/[id]` — suppression

### Modèle Prisma
Le modèle `User` existant doit être étendu :
```prisma
model User {
  // ... champs existants ...
  fiches        Fiche[]
  chatSessions  ChatSession[]
}
```

```prisma
model Fiche {
  id           String   @id @default(cuid())
  titre        String
  filiere      String
  module       String
  formateur    String
  duree        String
  niveau       String
  type         String
  objectifs    String
  contenu      String   @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  seanceId     String?  // optionnel — lien vers la séance source
}
```

---

## 4. Assistant IA

### Page `/assistant`

Interface de chat conversationnel, spécialisé dans les domaines pédagogiques OFPPT.

**Sélecteur de domaine (en haut du chat) :**
- Comptabilité
- Finance
- Gestion
- Fiscalité
- Pédagogie générale

Le domaine sélectionné est injecté dans le system prompt pour orienter les réponses vers le contexte formateur OFPPT.

**Interface :**
- Zone de messages (bulles utilisateur à droite, assistant à gauche)
- Input texte en bas + bouton Envoyer
- Bouton "Nouvelle conversation" (efface l'affichage, crée une nouvelle session en DB)
- Streaming des réponses (caractère par caractère via SSE / ReadableStream)

**System prompt :**
```
Tu es un assistant pédagogique expert pour les formateurs OFPPT du Maroc.
Tu réponds en français, avec précision et pédagogie.
Tu es spécialisé dans le domaine : {domaine}.
Tes réponses sont orientées formateurs : tu proposes des explications claires,
des exemples adaptés au contexte OFPPT, et des suggestions pédagogiques.
```

**Historique sauvegardé :**
- Chaque conversation = une `ChatSession`
- Chaque message = un `ChatMessage` (role: user | assistant)
- La sidebar liste les dernières conversations (titre = premier message utilisateur tronqué)

### API Routes
- `POST /api/chat` — envoie un message, retourne la réponse en streaming
- `GET /api/chat/sessions` — liste les sessions de l'utilisateur
- `GET /api/chat/sessions/[id]` — messages d'une session
- `POST /api/chat/sessions` — crée une nouvelle session
- `DELETE /api/chat/sessions/[id]` — supprime une session

### Modèles Prisma
```prisma
model ChatSession {
  id        String        @id @default(cuid())
  domaine   String
  createdAt DateTime      @default(now())
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  messages  ChatMessage[]
}

model ChatMessage {
  id        String      @id @default(cuid())
  role      String      // "user" | "assistant"
  content   String      @db.Text
  createdAt DateTime    @default(now())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

---

## 5. Architecture technique

### Fichiers à créer
```
src/
  app/
    fiches/
      page.tsx                    — formulaire génération fiche
      historique/page.tsx         — liste des fiches
      [id]/page.tsx               — détail fiche
    assistant/
      page.tsx                    — chat UI (client component)
    api/
      fiches/
        generate/route.ts
        route.ts                  — GET liste
        [id]/route.ts             — GET + DELETE
      chat/
        route.ts                  — POST message (streaming)
        sessions/
          route.ts                — GET + POST
          [id]/route.ts           — GET + DELETE
  components/
    ui/
      NavSidebar.tsx              — sidebar gauche
    forms/
      FicheForm.tsx               — formulaire fiche
    chat/
      ChatWindow.tsx              — interface messages
      ChatInput.tsx               — input + send
      SessionList.tsx             — liste conversations
  lib/
    prompts.ts                    — prompts IA centralisés (séances + fiches + chat)
```

### Fichiers modifiés
```
src/components/ui/AppShell.tsx    — intégrer NavSidebar
prisma/schema.prisma              — ajouter Fiche, ChatSession, ChatMessage
src/lib/export.ts                 — adapter pour les fiches
src/app/historique/[id]/page.tsx  — ajouter bouton "→ Créer une fiche"
```

---

## 6. Contraintes & décisions

| Décision | Raison |
|----------|--------|
| Streaming pour le chat (`ReadableStream`) | Expérience utilisateur fluide, réponses longues |
| Domaine injecté dans system prompt | Spécialisation sans modèle séparé |
| Fiche liée optionnellement à une séance | Flexibilité — fiche peut exister indépendamment |
| `prompts.ts` centralisé | Évite la duplication, facilite les améliorations futures |
| Mobile : sidebar masquée | L'app est principalement utilisée sur desktop |

---

## 7. Hors scope (v3)

- Gestion multi-formateurs / admin
- Traduction en arabe
- Templates personnalisés par filière
- Partage de fiches entre formateurs
