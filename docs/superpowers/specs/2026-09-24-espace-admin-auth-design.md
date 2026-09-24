# Espace admin, approbation des formateurs & flux mot de passe — Design

Date : 2026-09-24
Projet : Compétencia IA (OFPPT)
Statut : Validé (architecture) — spec en revue

## 1. Objectif

Introduire un espace administrateur et un cycle de vie de compte formateur :

1. Un formateur crée son compte via « Créer un compte » sur `www.competencia.one` →
   le compte est **en attente** (`PENDING`) et **ne peut pas se connecter**.
2. L'administrateur (`elmustapha.ezzouhir@ofppt.ma`) est prévenu (espace admin + email),
   puis **approuve** (ou rejette) la demande.
3. À l'approbation, le formateur reçoit un **email de bienvenue** avec un lien vers `/login`.
4. Le formulaire de connexion propose : email, mot de passe (avec **œil** afficher/masquer),
   **mot de passe oublié** (réinitialisation par email) et **changer le mot de passe**
   (dans les paramètres, une fois connecté).

Hors périmètre (YAGNI) : gestion fine des permissions, multi-admins, suppression en masse,
historique d'audit, expiration de session personnalisée.

## 2. Modèle de données (Prisma + migration PostgreSQL)

### 2.1 Champs ajoutés à `User`

| Champ | Type | Défaut | Notes |
|---|---|---|---|
| `role` | `String` | `"FORMATEUR"` | Valeurs : `ADMIN`, `FORMATEUR` |
| `status` | `String` | `"PENDING"` | Valeurs : `PENDING`, `APPROVED`, `REJECTED` |
| `approvedAt` | `DateTime?` | `null` | Rempli à l'approbation |

On utilise des `String` (pas d'`enum` Prisma) pour rester cohérent avec le style existant
du schéma et éviter une migration d'enum PostgreSQL.

### 2.2 Nouvelle table `PasswordResetToken`

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique   // SHA-256 du jeton (jamais le jeton en clair en base)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

Relation inverse ajoutée sur `User` : `resetTokens PasswordResetToken[]`.

### 2.3 Migration de données (ne verrouiller personne)

La migration ajoute les colonnes PUIS exécute :

```sql
UPDATE "User" SET "status" = 'APPROVED', "approvedAt" = NOW() WHERE "status" = 'PENDING';
```

Ainsi tous les comptes **existants** (dont `ezzouhir2122@gmail.com`) restent actifs.
Les NOUVELLES inscriptions, elles, arriveront en `PENDING` (valeur par défaut appliquée
après ce backfill).

### 2.4 Compte admin

`elmustapha.ezzouhir@ofppt.ma` créé avec `role="ADMIN"`, `status="APPROVED"`,
mot de passe hashé (bcrypt, 10 tours).

**Le mot de passe en clair n'est JAMAIS commité.** Création via un script one-shot
`scripts/create-admin.ts` qui lit `ADMIN_EMAIL` / `ADMIN_PASSWORD` depuis l'environnement
(ou arguments), exécuté une seule fois localement contre la base. Idempotent : si l'email
existe déjà, il met à jour role/status/hash.

## 3. Authentification & contrôle d'accès

### 3.1 `src/auth.ts` (Node runtime, Credentials)

Dans `authorize()`, après vérification du mot de passe :
- Si `user.status !== "APPROVED"` → lever une erreur typée `CredentialsSignin`
  avec `code = "AccountPending"` (ou `AccountRejected`) pour que le formulaire affiche
  un message distinct.
- Ajouter `role` et `status` à l'objet retourné.

Callbacks :
- `jwt` : propager `token.role` et `token.status`.
- `session` : exposer `session.user.role` et `session.user.status`.
- Augmentation de types next-auth (`next-auth.d.ts`) : ajouter `role`, `status`.

### 3.2 `src/auth.config.ts` (Edge, middleware)

Dans `authorized()` :
- Les chemins publics existants restent (`/bienvenue`, assets PWA, `/api/auth`, `/api/register`).
- Ajouter comme publics : `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`,
  `/api/auth/forgot-password`, `/api/auth/reset-password`.
- Protéger `/admin` et `/api/admin/*` : autorisés uniquement si `auth.user.role === "ADMIN"`,
  sinon redirection vers `/` (ou 403 pour les routes API).

## 4. Parcours détaillés

### 4.1 Inscription — `POST /api/register`

- Valide nom/email/mdp (règles existantes conservées : mdp ≥ 6).
- Crée l'utilisateur en `status="PENDING"`, `role="FORMATEUR"`.
- **Ne connecte plus** automatiquement ; **n'envoie plus** l'email avec mot de passe en clair.
- Envoie à l'admin `sendAdminNewRequestEmail(...)` (non bloquant).
- Réponse `{ ok: true, pending: true }`.

`RegisterForm.tsx` : après succès, afficher un état de confirmation
« Votre demande a été envoyée. Vous recevrez un email dès son approbation. »
(supprimer l'auto-login et l'affichage du mot de passe).

### 4.2 Espace admin — `/admin`

Page serveur (rôle ADMIN requis) :
- Section « Demandes en attente » : nom, email, date, boutons **Approuver** / **Rejeter**.
- Section « Formateurs actifs » : liste en lecture seule (nom, email, date d'approbation).
- Compteur de demandes en attente (badge).

APIs (toutes gardées `role === ADMIN`) :
- `GET  /api/admin/formateurs` → liste `{ pending: [...], approved: [...] }`.
- `POST /api/admin/formateurs/[id]/approve` → `status=APPROVED`, `approvedAt=now`,
  `sendApprovalEmail(...)` au formateur.
- `POST /api/admin/formateurs/[id]/reject` → `status=REJECTED` (compte conservé, non supprimé).

Entrée « Administration » ajoutée dans la navigation, **visible seulement si** `role === ADMIN`.

### 4.3 Mot de passe oublié — réinitialisation

- Page publique `/mot-de-passe-oublie` : champ email → `POST /api/auth/forgot-password`.
- `forgot-password` : si l'utilisateur existe **et** `APPROVED`, générer un jeton aléatoire
  (32 octets), stocker `sha256(jeton)` avec `expiresAt = now + 1h`, envoyer
  `sendPasswordResetEmail(...)` avec lien `/reinitialiser-mot-de-passe?token=<jeton>`.
  **Toujours** répondre `{ ok: true }` (ne pas révéler si l'email existe).
- Page publique `/reinitialiser-mot-de-passe?token=...` : nouveau mot de passe + confirmation
  → `POST /api/auth/reset-password`.
- `reset-password` : vérifier `sha256(token)` en base, non expiré, `usedAt = null` →
  mettre à jour le hash, marquer `usedAt = now`. Rediriger vers `/login?reset=ok`.

### 4.4 Changer le mot de passe (connecté) — `/parametres`

- Section « Changer le mot de passe » : mot de passe actuel, nouveau, confirmation.
- `POST /api/user/change-password` : vérifier le mot de passe actuel (bcrypt), imposer
  nouveau ≥ 6, mettre à jour le hash. Session requise.

### 4.5 Formulaire de connexion — `src/components/forms/LoginForm.tsx`

- Remplacer le bouton texte « Afficher/Masquer » et la case à cocher inactive par une
  **icône œil** cliquable dans le champ mot de passe (bascule `type` password/text).
- « Mot de passe oublié ? » → lien vers `/mot-de-passe-oublie`.
- Gérer les messages : identifiants invalides vs `AccountPending`
  (« Votre compte est en attente d'approbation ») vs `?reset=ok` (« Mot de passe modifié »).

## 5. Emails — `src/lib/email.ts`

Refonte : sender et URL de base configurables.

- `EMAIL_FROM` (env), ex. `Compétencia IA <no-reply@competencia.one>` ;
  fallback `onboarding@resend.dev`.
- `APP_URL` (env), ex. `https://www.competencia.one` ; remplace le lien `vercel.app` en dur.

Fonctions :
- `sendApprovalEmail({ to, name, loginUrl })` — compte approuvé, bouton → `/login`
  (sans mot de passe : le formateur l'a défini à l'inscription).
- `sendAdminNewRequestEmail({ adminEmail, formateurName, formateurEmail, adminUrl })`.
- `sendPasswordResetEmail({ to, name, resetUrl })`.
- L'ancien `sendWelcomeEmail(..., password)` (mot de passe en clair) est **supprimé**.

Toutes tolérantes à l'absence de `RESEND_API_KEY` (no-op) comme aujourd'hui.

### 5.1 Prérequis externe (utilisateur)

Vérifier le domaine **`competencia.one`** dans Resend et définir `EMAIL_FROM`
en conséquence. Tant que ce n'est pas fait, seuls les emails vers l'adresse propriétaire
du compte Resend sont délivrés (limite sandbox `onboarding@resend.dev`).

## 6. Variables d'environnement ajoutées

| Variable | Exemple | Rôle |
|---|---|---|
| `APP_URL` | `https://www.competencia.one` | Base des liens dans les emails |
| `EMAIL_FROM` | `Compétencia IA <no-reply@competencia.one>` | Expéditeur vérifié |
| `ADMIN_EMAIL` | `elmustapha.ezzouhir@ofppt.ma` | Destinataire des notifications de demande |

`.env.example` mis à jour ; `.env` réel non commité (règle projet).

## 7. Sécurité

- Jetons de réinitialisation : stockés **hashés** (SHA-256), à usage unique, expiration 1h.
- `forgot-password` ne révèle pas l'existence d'un compte.
- Toutes les routes `/api/admin/*` re-vérifient `role === ADMIN` côté serveur
  (pas seulement le middleware).
- Mot de passe admin fourni hors dépôt (script + env), jamais commité.
- Le changement de mot de passe exige le mot de passe actuel.

## 8. Tests / vérification

- Migration appliquée : comptes existants `APPROVED`, admin présent en `ADMIN`.
- Inscription → compte `PENDING`, connexion refusée avec message « en attente ».
- Approbation admin → `APPROVED` + email (ou log si Resend non configuré) → connexion OK.
- Rejet → connexion refusée.
- Mot de passe oublié → email → réinitialisation → connexion avec le nouveau mot de passe.
- Changer le mot de passe (connecté) → ancien requis, nouveau fonctionne.
- `/admin` inaccessible à un formateur (redirection) ; visible pour l'admin.
- Vérif Playwright sur `www.competencia.one` après déploiement (règle projet).

## 9. Ordre d'implémentation suggéré

1. Schéma + migration + `create-admin.ts`.
2. Auth (role/status dans authorize/jwt/session/types) + gating middleware.
3. Emails (refonte lib/email.ts + env).
4. Inscription (register PENDING + email admin) + RegisterForm.
5. Espace admin (page + APIs approve/reject).
6. Mot de passe oublié (pages + APIs + jetons).
7. Changer le mot de passe (paramètres + API).
8. LoginForm (œil, lien oublié, messages).
9. Déploiement + vérification.
