# Espace admin, approbation formateurs & flux mot de passe — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un espace admin qui approuve les inscriptions formateurs (PENDING→APPROVED), avec emails, réinitialisation et changement de mot de passe.

**Architecture:** NextAuth v5 (Credentials, JWT) enrichi de `role`/`status` ; middleware Edge qui garde `/admin` ; APIs App Router sous `/api/admin`, `/api/auth/*`, `/api/user` ; emails via Resend ; jetons de réinitialisation hashés en base Postgres via Prisma.

**Tech Stack:** Next.js 16 (App Router), NextAuth v5 beta, Prisma + PostgreSQL, bcryptjs, Resend, TypeScript, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-24-espace-admin-auth-design.md`

## Global Constraints

- `bcryptjs`, `@prisma/client`, `prisma` restent dans `serverExternalPackages` (next.config.ts) — ne pas retirer.
- Ne JAMAIS importer `src/auth.ts` (Prisma) dans le middleware/Edge — utiliser `src/auth.config.ts` seul.
- Le hash du mot de passe se fait dans le runtime Next.js (routes API/scripts lancés via Next), pas via `tsx` isolé.
- Mot de passe admin fourni par variable d'env, JAMAIS commité en clair.
- `turbopack.root` reste `process.cwd()` (pas `__dirname` → casse le build Vercel).
- Interface en français, terminologie OFPPT. Rôles = `"ADMIN"`/`"FORMATEUR"`, statuts = `"PENDING"`/`"APPROVED"`/`"REJECTED"` (chaînes exactes, majuscules).
- Pas de framework de test dans le projet : vérification = `npx tsc --noEmit`, `curl` sur `http://localhost:3000`, et Playwright. Commits fréquents.
- Déploiement : après chaque tâche livrable, commit ; push final déclenche Vercel (vérifier sur www.competencia.one).

## Review Focus

- **Connexion d'un compte PENDING** : doit être refusée avec un message « en attente d'approbation » distinct de « identifiants invalides » (Task 2).
- **Comptes existants après migration** : doivent rester connectables (status APPROVED), sinon tout le monde est verrouillé (Task 1).
- **Jeton de réinitialisation expiré / déjà utilisé / inconnu** : doit être refusé proprement, sans changer de mot de passe (Task 6).
- **`/admin` accédé par un formateur** (non-admin) : redirection, jamais d'accès aux données admin ; les APIs `/api/admin/*` re-vérifient le rôle côté serveur (Task 2 + Task 5).
- **`forgot-password` avec un email inexistant** : répond `ok` sans révéler l'absence du compte (Task 6).

---

## Task 1 : Schéma Prisma, migration & compte admin

**Files:**
- Modify: `prisma/schema.prisma` (modèle `User` + nouveau `PasswordResetToken`)
- Create: migration Prisma (générée)
- Create: `scripts/create-admin.ts`

**Interfaces:**
- Produces: colonnes `User.role`, `User.status`, `User.approvedAt` ; table `PasswordResetToken { id, tokenHash, userId, expiresAt, usedAt, createdAt }` ; script `create-admin` idempotent.

- [ ] **Step 1 : Modifier `User` dans `prisma/schema.prisma`**

Ajouter dans le modèle `User` (après `preferredModel`) :

```prisma
  role          String        @default("FORMATEUR")
  status        String        @default("PENDING")
  approvedAt    DateTime?
  resetTokens   PasswordResetToken[]
```

- [ ] **Step 2 : Ajouter le modèle `PasswordResetToken`**

À la fin de `prisma/schema.prisma` :

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

- [ ] **Step 3 : Créer la migration avec backfill**

Run: `npx prisma migrate dev --name add_role_status_reset --create-only`

Puis éditer le fichier SQL généré : après les `ALTER TABLE ... ADD COLUMN`, ajouter à la fin :

```sql
-- Backfill : ne verrouiller aucun compte existant
UPDATE "User" SET "status" = 'APPROVED', "approvedAt" = NOW() WHERE "status" = 'PENDING';
```

- [ ] **Step 4 : Appliquer la migration**

Run: `npx prisma migrate dev`
Expected: migration appliquée, `npx prisma generate` OK.

- [ ] **Step 5 : Écrire `scripts/create-admin.ts`**

```ts
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = process.env.ADMIN_NAME || "Elmustapha Ezzouhir";
  if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD requis");

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "APPROVED", password: hash, approvedAt: new Date() },
    create: { email, name, password: hash, role: "ADMIN", status: "APPROVED", approvedAt: new Date() },
  });
  console.log("Admin prêt :", email);
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 6 : Créer le compte admin (hors dépôt)**

Run (PowerShell, valeurs non commitées) :
```
$env:ADMIN_EMAIL="elmustapha.ezzouhir@ofppt.ma"; $env:ADMIN_PASSWORD="AICHAsara22"; npx tsx scripts/create-admin.ts
```
Expected: « Admin prêt : elmustapha.ezzouhir@ofppt.ma ». Vérifier avec `npx prisma studio` que `role=ADMIN`, `status=APPROVED`.

> Si `tsx` échoue sur le hash (règle projet), créer à la place une route jetable `POST /api/admin/seed` gardée par `process.env.ADMIN_SEED_SECRET`, l'appeler une fois, puis la supprimer.

- [ ] **Step 7 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations scripts/create-admin.ts
git commit -m "feat(db): role/status User + PasswordResetToken + script admin"
```

---

## Task 2 : Auth (role/status) & gating middleware

**Files:**
- Modify: `src/auth.ts` (authorize + jwt + session)
- Modify: `src/auth.config.ts` (chemins publics + garde `/admin`)
- Modify: `src/next-auth.d.ts` (ou créer si absent — augmentation de types)

**Interfaces:**
- Consumes: `User.role`, `User.status` (Task 1).
- Produces: `session.user.role`, `session.user.status`, `token.role`, `token.status` ; erreur de connexion avec `code="AccountPending"` ; garde `/admin` réservée ADMIN.

- [ ] **Step 1 : Bloquer la connexion non approuvée dans `src/auth.ts`**

Dans `authorize()`, après `const valid = await bcrypt.compare(...)` et le `if (!valid) return null;`, ajouter :

```ts
if (user.status !== "APPROVED") {
  throw new CredentialsSignin(user.status === "REJECTED" ? "AccountRejected" : "AccountPending");
}
```

Importer en haut : `import { CredentialsSignin } from "next-auth";`
Et compléter l'objet retourné avec `role: user.role, status: user.status`.

- [ ] **Step 2 : Propager role/status dans les callbacks**

Dans `jwt` callback, sous `if (user) { ... }` ajouter :
```ts
token.role = (user as { role?: string }).role ?? token.role;
token.status = (user as { status?: string }).status ?? token.status;
```
Dans `session` callback ajouter :
```ts
session.user.role = (token.role as string) ?? "FORMATEUR";
session.user.status = (token.status as string) ?? "APPROVED";
```

- [ ] **Step 3 : Augmenter les types**

Localiser le fichier d'augmentation existant (`grep -rl "declare module \"next-auth\"" src`). S'il existe, y ajouter `role?: string; status?: string;` à `User` et `Session["user"]`. Sinon créer `src/next-auth.d.ts` :

```ts
import "next-auth";
declare module "next-auth" {
  interface User { role?: string; status?: string; matricule?: string | null; etablissement?: string | null; }
  interface Session { user: { id: string; role?: string; status?: string } & import("next-auth").DefaultSession["user"]; }
}
declare module "next-auth/jwt" {
  interface JWT { id?: string; role?: string; status?: string; }
}
```
(Fusionner avec les augmentations `matricule`/`etablissement` déjà présentes plutôt que dupliquer.)

- [ ] **Step 4 : Garder `/admin` dans `src/auth.config.ts`**

Dans `authorized()`, avant `return isLoggedIn;`, ajouter les chemins publics de reset et la garde admin :

```ts
const isPublicAuthFlow =
  nextUrl.pathname.startsWith("/mot-de-passe-oublie") ||
  nextUrl.pathname.startsWith("/reinitialiser-mot-de-passe") ||
  nextUrl.pathname.startsWith("/api/auth/forgot-password") ||
  nextUrl.pathname.startsWith("/api/auth/reset-password");
if (isPublicAuthFlow) return true;

const isAdminArea =
  nextUrl.pathname.startsWith("/admin") || nextUrl.pathname.startsWith("/api/admin");
if (isAdminArea) {
  const role = (auth?.user as { role?: string } | undefined)?.role;
  if (!isLoggedIn) return false;
  if (role !== "ADMIN") return Response.redirect(new URL("/", nextUrl));
  return true;
}
```

- [ ] **Step 5 : Vérifier compilation + connexion**

Run: `npx tsc --noEmit` → 0 erreur.
Démarrer `npm run dev`. Créer un user PENDING de test via Prisma Studio (ou attendre Task 4), tenter la connexion → doit afficher une erreur `AccountPending` (vérifiée finement en Task 8). Connexion d'un compte APPROVED existant → OK.

- [ ] **Step 6 : Commit**

```bash
git add src/auth.ts src/auth.config.ts src/next-auth.d.ts
git commit -m "feat(auth): role/status en session + blocage PENDING + garde /admin"
```

---

## Task 3 : Emails (refonte lib/email.ts) + env

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `sendApprovalEmail({to,name,loginUrl})`, `sendAdminNewRequestEmail({adminEmail,formateurName,formateurEmail,adminUrl})`, `sendPasswordResetEmail({to,name,resetUrl})`. Constantes `EMAIL_FROM`, `APP_URL` lues depuis env.

- [ ] **Step 1 : Réécrire `src/lib/email.ts`**

Remplacer le contenu par un module exposant les 3 fonctions. En-tête :

```ts
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Competencia IA <onboarding@resend.dev>";
export const APP_URL = process.env.APP_URL || "https://www.competencia.one";

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) { console.log("[email] RESEND_API_KEY absent, skip:", subject); return; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: FROM, to, subject, html });
}
```

Puis (réutiliser la charte HTML existante — header sombre, bouton `#0A4DA8`) :
```ts
export async function sendApprovalEmail({ to, name, loginUrl }: { to: string; name: string; loginUrl: string; }) {
  await send(to, "Votre compte Compétencia IA est activé",
    layout(`<h1>Bienvenue, ${name} 👋</h1>
      <p>Votre compte formateur a été <strong>approuvé</strong>. Vous pouvez maintenant accéder à votre espace.</p>
      ${button(loginUrl, "Accéder à mon espace →")}`));
}
export async function sendAdminNewRequestEmail({ adminEmail, formateurName, formateurEmail, adminUrl }:
  { adminEmail: string; formateurName: string; formateurEmail: string; adminUrl: string; }) {
  await send(adminEmail, "Nouvelle demande d'inscription formateur",
    layout(`<h1>Nouvelle demande</h1>
      <p><strong>${formateurName}</strong> (${formateurEmail}) demande l'accès à Compétencia IA.</p>
      ${button(adminUrl, "Voir les demandes →")}`));
}
export async function sendPasswordResetEmail({ to, name, resetUrl }: { to: string; name: string; resetUrl: string; }) {
  await send(to, "Réinitialisation de votre mot de passe",
    layout(`<h1>Réinitialisation</h1>
      <p>Bonjour ${name}, cliquez ci-dessous pour définir un nouveau mot de passe. Ce lien expire dans 1 heure.</p>
      ${button(resetUrl, "Réinitialiser mon mot de passe →")}
      <p style="color:#9CA3AF;font-size:12px;margin-top:20px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`));
}
```

Ajouter deux helpers `layout(inner: string): string` (réutilise le squelette `<table>` + header + footer de l'ancien `buildEmailHtml`) et `button(href: string, label: string): string`. Supprimer l'ancien `sendWelcomeEmail`.

- [ ] **Step 2 : Mettre à jour `.env.example`**

Ajouter :
```
APP_URL=https://www.competencia.one
EMAIL_FROM=Competencia IA <no-reply@competencia.one>
ADMIN_EMAIL=elmustapha.ezzouhir@ofppt.ma
```

- [ ] **Step 3 : Vérifier compilation**

Run: `npx tsc --noEmit` → 0 erreur (attention : plus aucune référence à `sendWelcomeEmail`, corrigée en Task 4).

- [ ] **Step 4 : Commit**

```bash
git add src/lib/email.ts .env.example
git commit -m "feat(email): emails approbation/demande/reset + sender & APP_URL configurables"
```

---

## Task 4 : Inscription en PENDING + notification admin

**Files:**
- Modify: `src/app/api/register/route.ts`
- Modify: `src/components/forms/RegisterForm.tsx`

**Interfaces:**
- Consumes: `sendAdminNewRequestEmail`, `APP_URL` (Task 3) ; `User.status` (Task 1).
- Produces: réponse `{ ok: true, pending: true }` ; RegisterForm affiche un état de confirmation.

- [ ] **Step 1 : Réécrire la logique de `register/route.ts`**

Remplacer la création + `sendWelcomeEmail` par :

```ts
import { sendAdminNewRequestEmail, APP_URL } from "@/lib/email";
// ...
await prisma.user.create({
  data: { name: cleanName, email: cleanEmail, password: hash, status: "PENDING", role: "FORMATEUR" },
});
const adminEmail = process.env.ADMIN_EMAIL;
if (adminEmail) {
  sendAdminNewRequestEmail({
    adminEmail, formateurName: cleanName, formateurEmail: cleanEmail,
    adminUrl: `${APP_URL}/admin`,
  }).catch(() => {});
}
return NextResponse.json({ ok: true, pending: true });
```

- [ ] **Step 2 : Adapter `RegisterForm.tsx` (plus d'auto-login)**

Remplacer le bloc succès (`signIn(...)` + `window.location.href="/"`) par un état de confirmation :

```tsx
const [done, setDone] = useState(false);
// dans handleSubmit, après res OK :
setIsLoading(false);
setDone(true);
// rendu : si done, afficher un panneau
if (done) {
  return (
    <div className="p-4 rounded-lg text-center" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
      <p className="font-semibold" style={{ color: "#15803D" }}>Demande envoyée ✓</p>
      <p className="text-sm mt-2" style={{ color: "#374151" }}>
        Votre compte doit être approuvé par l'administrateur. Vous recevrez un email dès son activation.
      </p>
      <button onClick={onSwitchToLogin} className="mt-4 text-sm font-semibold underline" style={{ color: "#003087" }}>
        Retour à la connexion
      </button>
    </div>
  );
}
```

Supprimer l'import `signIn` s'il n'est plus utilisé.

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit`. Dev server : soumettre le formulaire « Créer un compte » → panneau « Demande envoyée ». Vérifier en base (Prisma Studio) : nouveau user `status=PENDING`.

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/register/route.ts src/components/forms/RegisterForm.tsx
git commit -m "feat(register): inscription en attente d'approbation + email admin"
```

---

## Task 5 : Espace admin (page + APIs approve/reject)

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/AdminClient.tsx` (client : boutons + fetch)
- Create: `src/app/api/admin/formateurs/route.ts` (GET)
- Create: `src/app/api/admin/formateurs/[id]/approve/route.ts` (POST)
- Create: `src/app/api/admin/formateurs/[id]/reject/route.ts` (POST)
- Modify: nav (ajouter lien « Administration » si role ADMIN) — voir `src/components/shell/index.tsx`

**Interfaces:**
- Consumes: `auth()` (session role), `sendApprovalEmail`, `APP_URL`.
- Produces: `GET /api/admin/formateurs → { pending: Row[], approved: Row[] }` avec `Row = { id, name, email, createdAt, approvedAt }`.

- [ ] **Step 1 : Garde serveur réutilisable**

Créer `src/lib/admin-guard.ts` :
```ts
import { auth } from "@/auth";
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}
```

- [ ] **Step 2 : `GET /api/admin/formateurs`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const select = { id: true, name: true, email: true, createdAt: true, approvedAt: true };
  const [pending, approved] = await Promise.all([
    prisma.user.findMany({ where: { status: "PENDING" }, select, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { status: "APPROVED", role: "FORMATEUR" }, select, orderBy: { approvedAt: "desc" } }),
  ]);
  return NextResponse.json({ pending, approved });
}
```

- [ ] **Step 3 : `POST /api/admin/formateurs/[id]/approve`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { sendApprovalEmail, APP_URL } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.update({
    where: { id }, data: { status: "APPROVED", approvedAt: new Date() },
    select: { email: true, name: true },
  });
  sendApprovalEmail({ to: user.email, name: user.name, loginUrl: `${APP_URL}/login` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4 : `POST /api/admin/formateurs/[id]/reject`**

Identique mais `data: { status: "REJECTED" }` et pas d'email. Garde `requireAdmin` idem.

- [ ] **Step 5 : Page `/admin` (serveur) + client**

`src/app/admin/page.tsx` (server) : `requireAdmin()` sinon `redirect("/")`, rend `<AdminClient />`.
`AdminClient.tsx` (client) : `useEffect` → `fetch("/api/admin/formateurs")`, affiche 2 sections. Chaque ligne en attente a **Approuver** (`POST .../approve`) et **Rejeter** (`POST .../reject`), puis retire la ligne de l'état local. Style cohérent (cartes blanches, bleu `#003087`, vert `#16A34A`). Titre « Administration · Demandes d'accès ».

- [ ] **Step 6 : Lien « Administration » dans la nav (ADMIN seulement)**

Dans `src/components/shell/index.tsx`, `AppShell` reçoit déjà `user`. Étendre le type `AppShellProps.user` avec `role?: string | null` (et passer `session.user.role` depuis `layout.tsx`). Afficher un lien vers `/admin` uniquement si `user?.role === "ADMIN"`.

Dans `src/app/layout.tsx`, `AppShell` est appelé avec `user={session?.user ?? null}` — vérifier que `role` est inclus (il l'est via la session, Task 2).

- [ ] **Step 7 : Vérifier**

Run: `npx tsc --noEmit`. Se connecter en admin → `/admin` liste les demandes ; Approuver → la ligne disparaît, user `APPROVED` en base, ce user peut désormais se connecter. Se connecter en formateur → `/admin` redirige vers `/`. `curl` non authentifié `POST /api/admin/formateurs/x/approve` → 403.

- [ ] **Step 8 : Commit**

```bash
git add src/lib/admin-guard.ts src/app/admin src/app/api/admin src/components/shell/index.tsx src/app/layout.tsx
git commit -m "feat(admin): espace d'approbation formateurs + APIs approve/reject"
```

---

## Task 6 : Mot de passe oublié & réinitialisation

**Files:**
- Create: `src/lib/reset-tokens.ts` (génération/vérif jeton)
- Create: `src/app/api/auth/forgot-password/route.ts` (POST)
- Create: `src/app/api/auth/reset-password/route.ts` (POST)
- Create: `src/app/mot-de-passe-oublie/page.tsx`
- Create: `src/app/reinitialiser-mot-de-passe/page.tsx`

**Interfaces:**
- Consumes: `PasswordResetToken` (Task 1), `sendPasswordResetEmail`, `APP_URL` (Task 3).
- Produces: `POST /api/auth/forgot-password { email }` → `{ ok: true }` ; `POST /api/auth/reset-password { token, password }` → `{ ok: true } | { error }`.

- [ ] **Step 1 : Helper jetons `src/lib/reset-tokens.ts`**

```ts
import crypto from "crypto";
export function generateToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

- [ ] **Step 2 : `POST /api/auth/forgot-password`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/reset-tokens";
import { sendPasswordResetEmail, APP_URL } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string };
  const clean = (email || "").toLowerCase().trim();
  const user = clean ? await prisma.user.findUnique({ where: { email: clean } }) : null;
  if (user && user.status === "APPROVED") {
    const { token, tokenHash } = generateToken();
    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
    });
    sendPasswordResetEmail({
      to: user.email, name: user.name,
      resetUrl: `${APP_URL}/reinitialiser-mot-de-passe?token=${token}`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true }); // ne révèle jamais l'existence du compte
}
```

- [ ] **Step 3 : `POST /api/auth/reset-password`**

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/reset-tokens";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json() as { token?: string; password?: string };
  if (!token || !password || password.length < 6)
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date())
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4 : Page `/mot-de-passe-oublie`**

Client component : champ email → `POST /api/auth/forgot-password` → message générique « Si un compte existe, un email a été envoyé. » Lien retour vers `/login`. Style login (fond `#F5F7FA`, carte blanche).

- [ ] **Step 5 : Page `/reinitialiser-mot-de-passe`**

Client component : lit `?token=` (via `useSearchParams`), 2 champs (nouveau mdp + confirmation, avec œil), → `POST /api/auth/reset-password`. Succès → redirige `/login?reset=ok`. Erreur → affiche le message. Encapsuler `useSearchParams` dans `<Suspense>`.

- [ ] **Step 6 : Vérifier**

Run: `npx tsc --noEmit`. Dev : `/mot-de-passe-oublie` avec un email APPROVED → en base une ligne `PasswordResetToken`. Copier le token (Studio), ouvrir `/reinitialiser-mot-de-passe?token=...`, définir un mdp → connexion avec le nouveau mdp OK. Rejouer le même lien → « Lien invalide ou expiré ». Email inexistant → réponse `ok` quand même.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/reset-tokens.ts src/app/api/auth/forgot-password src/app/api/auth/reset-password src/app/mot-de-passe-oublie src/app/reinitialiser-mot-de-passe
git commit -m "feat(auth): mot de passe oublie + reinitialisation par jeton"
```

---

## Task 7 : Changer le mot de passe (connecté)

**Files:**
- Create: `src/app/api/user/change-password/route.ts` (POST)
- Modify: `src/app/parametres/page.tsx` (+ éventuel composant client `ChangePasswordForm.tsx`)

**Interfaces:**
- Consumes: `auth()` session, `bcrypt`.
- Produces: `POST /api/user/change-password { current, next } → { ok } | { error }`.

- [ ] **Step 1 : API `change-password`**

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { current, next } = await req.json() as { current?: string; next?: string };
  if (!current || !next || next.length < 6)
    return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !(await bcrypt.compare(current, user.password)))
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(next, 10) } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2 : Section « Changer le mot de passe » dans `/parametres`**

Créer `src/components/forms/ChangePasswordForm.tsx` (client) : 3 champs (actuel, nouveau, confirmation) avec œil → `POST /api/user/change-password` → toast succès/erreur (le projet utilise `sonner`). L'insérer dans `src/app/parametres/page.tsx` (repérer la structure existante, ajouter une carte cohérente).

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit`. Connecté, mauvais mot de passe actuel → « incorrect » ; bon → changement OK, reconnexion avec le nouveau mdp.

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/user/change-password src/components/forms/ChangePasswordForm.tsx src/app/parametres/page.tsx
git commit -m "feat(user): changer le mot de passe depuis les parametres"
```

---

## Task 8 : Formulaire de connexion (œil, oublié, messages)

**Files:**
- Modify: `src/components/forms/LoginForm.tsx`

**Interfaces:**
- Consumes: `signIn` (avec code d'erreur `AccountPending`/`AccountRejected`), route `/mot-de-passe-oublie`, query `?reset=ok`.

- [ ] **Step 1 : Icône œil dans le champ mot de passe**

Remplacer le bouton texte « Afficher/Masquer » par une icône œil/œil barré cliquable (bascule `showPassword`). Supprimer la case à cocher inactive « Afficher le mot de passe ».

```tsx
<button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Masquer" : "Afficher"}
  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
  {showPassword ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 1 12 1 12a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  )}
</button>
```

- [ ] **Step 2 : Lien « Mot de passe oublié ? » fonctionnel**

Remplacer le `<span>Mot de passe oublié ?</span>` par `<Link href="/mot-de-passe-oublie">` (importer `Link` de `next/link`).

- [ ] **Step 3 : Messages d'erreur distincts**

`signIn(...)` retourne `result?.error` = le `code`. Mapper :
```ts
if (result?.error) {
  const map: Record<string, string> = {
    AccountPending: "Votre compte est en attente d'approbation par l'administrateur.",
    AccountRejected: "Votre demande d'accès a été refusée.",
  };
  setLocalError(map[result.error] ?? "Email ou mot de passe incorrect");
  setIsLoading(false);
  return;
}
```
Et lire `?reset=ok` (via `useSearchParams`, sous `<Suspense>` ou `window.location`) pour afficher un bandeau vert « Mot de passe modifié, connectez-vous. ».

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit`. Dev : œil bascule l'affichage ; compte PENDING → message « en attente » ; mauvais mdp → « incorrect » ; lien oublié → `/mot-de-passe-oublie` ; arrivée depuis reset → bandeau vert.

- [ ] **Step 5 : Commit**

```bash
git add src/components/forms/LoginForm.tsx
git commit -m "feat(login): oeil, lien mot de passe oublie, messages en attente/refuse"
```

---

## Task 9 : Déploiement & vérification production

- [ ] **Step 1 : Type-check global**

Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 2 : Configurer les variables d'env Vercel**

Dans le dashboard Vercel (projet `generateur-seances-ofppt`) : `APP_URL`, `EMAIL_FROM`, `ADMIN_EMAIL` (+ `RESEND_API_KEY` déjà présent). Rappel : vérifier le domaine `competencia.one` dans Resend pour un envoi réel.

- [ ] **Step 3 : Appliquer la migration en production**

La base prod doit recevoir la migration : `npx prisma migrate deploy` (avec `DATABASE_URL` prod), ou via le build. Vérifier que le backfill APPROVED s'est appliqué.

- [ ] **Step 4 : Créer l'admin en production**

Exécuter `scripts/create-admin.ts` avec les env prod (une fois), ou la route jetable `/api/admin/seed`.

- [ ] **Step 5 : Push**

```bash
git push origin master
```
Attendre le build Vercel (~5-8 min, build à froid).

- [ ] **Step 6 : Vérification Playwright sur www.competencia.one**

- `/login` : œil fonctionne, lien « mot de passe oublié » présent.
- Créer un compte de test → « Demande envoyée ».
- Se connecter en admin → `/admin` affiche la demande → Approuver.
- Se connecter avec le compte de test approuvé → dashboard OK.
- Un formateur ne voit pas le lien « Administration » et `/admin` le redirige.

- [ ] **Step 7 : Mettre à jour la mémoire projet**

Ajouter une entrée mémoire (pièges éventuels rencontrés, ex. next-auth `CredentialsSignin` code) et lier `[[project_wap_pwa]]`.
