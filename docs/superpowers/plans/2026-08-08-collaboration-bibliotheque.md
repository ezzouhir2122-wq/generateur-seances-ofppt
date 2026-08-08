# Collaboration & Bibliothèque Enrichie — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet "Mes séances & fiches" dans la bibliothèque avec bouton "Partager" rapide, et afficher l'établissement du formateur sur chaque ressource partagée avec filtre.

**Architecture:** Migration Prisma pour ajouter `etablissement` à `SharedResource`, enrichissement de l'API existante, nouveau comportement de l'API `mes-ressources`, puis mise à jour des composants React dans l'ordre : types → ResourceCard → PublishModal → BibliothequeClient.

**Tech Stack:** Next.js App Router, Prisma ORM (PostgreSQL), React, TypeScript, Tailwind CSS

## Global Constraints

- Stack Next.js 16 App Router — toutes les routes API sont dans `src/app/api/`
- Prisma ORM — toute modification de schéma passe par `prisma/schema.prisma` + migration
- `session.user.etablissement` est déjà typé dans `src/types/next-auth.d.ts`
- Pas de tests automatisés dans ce projet — vérification manuelle via `npm run dev`
- Couleurs : vert `#16A34A`, bleu `#003087`, texte secondaire `rgba(255,255,255,0.60)`
- Commit après chaque tâche

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `prisma/schema.prisma` | Modifier — ajouter `etablissement String?` à `SharedResource` |
| `src/app/api/bibliotheque/route.ts` | Modifier — GET retourne `etablissement` + filtre + liste établissements ; POST stocke `etablissement` |
| `src/app/api/bibliotheque/mes-ressources/route.ts` | Modifier — ajouter `createdAt`, `type`, `isPublished` (flag) dans la réponse |
| `src/types/bibliotheque.ts` | Modifier — ajouter `etablissement?: string` à `ResourceListItem` et `ResourceDetail` ; nouveau type `MyOwnResource` |
| `src/components/bibliotheque/ResourceCard.tsx` | Modifier — afficher `etablissement` sous `authorName` |
| `src/components/bibliotheque/PublishModal.tsx` | Modifier — accepter props `defaultSourceId?` et `defaultType?` pour pré-remplissage |
| `src/components/bibliotheque/BibliothequeClient.tsx` | Modifier — 2 onglets, filtre établissement, onglet "Mes séances & fiches" avec cartes et bouton Partager |

---

## Task 1 — Migration Prisma : champ `etablissement`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produit: champ `etablissement String?` disponible sur le modèle `SharedResource` en DB

- [ ] **Step 1 : Ajouter le champ dans le schéma**

Dans `prisma/schema.prisma`, dans le bloc `model SharedResource { ... }`, ajouter après la ligne `authorName  String` :

```prisma
etablissement String?
```

Le bloc doit ressembler à :
```prisma
model SharedResource {
  id            String   @id @default(cuid())
  type          String
  titre         String
  description   String?  @db.Text
  filiere       String?
  module        String?
  niveau        String?
  contenu       String?  @db.Text
  fileUrl       String?
  fileName      String?
  fileType      String?
  fileSize      Int?
  authorId      String
  author        User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorName    String
  etablissement String?   // <-- nouveau
  createdAt     DateTime @default(now())
  likes         ResourceLike[]
  comments      ResourceComment[]

  @@index([type])
  @@index([filiere])
  @@index([createdAt])
}
```

- [ ] **Step 2 : Lancer la migration**

```bash
cd COMPETENCIA
npx prisma migrate dev --name add-etablissement-to-shared-resource
```

Attendu : `✔ Your database is now in sync with your schema.`

- [ ] **Step 3 : Vérifier le client Prisma régénéré**

```bash
npx prisma generate
```

- [ ] **Step 4 : Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add etablissement field to SharedResource"
```

---

## Task 2 — API : GET et POST `/api/bibliotheque`

**Files:**
- Modify: `src/app/api/bibliotheque/route.ts`

**Interfaces:**
- Consomme: `session.user.etablissement` (string | null, déjà dispo via next-auth)
- Produit (GET): champ `etablissement: string | null` sur chaque ressource + tableau `etablissements: string[]` dans `filters`
- Produit (POST): stocke `etablissement` depuis la session

- [ ] **Step 1 : Mettre à jour le GET**

Remplacer le contenu de `src/app/api/bibliotheque/route.ts` — section GET :

1. Ajouter le param `etablissement` dans les searchParams :
```typescript
const etablissementQ = sp.get("etablissement");
```

2. Ajouter le filtre dans `where` :
```typescript
if (etablissementQ) where.etablissement = etablissementQ;
```

3. Dans `select` du `findMany`, ajouter :
```typescript
etablissement: true,
```

4. Dans le calcul des filtres distincts, ajouter :
```typescript
const etablissements = [...new Set(all.map((r) => r.etablissement).filter(Boolean))].sort() as string[];
```

5. Dans `filters` retourné, ajouter :
```typescript
filters: { filieres, modules, etablissements },
```

6. Dans le mapping de chaque ressource, ajouter :
```typescript
etablissement: r.etablissement,
```

- [ ] **Step 2 : Mettre à jour le POST**

Dans la section POST, après `const authorName = session.user.name ?? "Formateur";`, ajouter :
```typescript
const etablissement = session.user.etablissement ?? null;
```

Dans l'objet `data: Prisma.SharedResourceCreateInput`, ajouter :
```typescript
etablissement,
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npm run build 2>&1 | head -30
```

Attendu : aucune erreur TypeScript sur `route.ts`.

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/bibliotheque/route.ts
git commit -m "feat(api): expose etablissement on SharedResource GET+POST"
```

---

## Task 3 — API : GET `/api/bibliotheque/mes-ressources` enrichi

**Files:**
- Modify: `src/app/api/bibliotheque/mes-ressources/route.ts`

**Interfaces:**
- Produit: pour chaque séance/fiche, ajoute `createdAt: string`, `isPublished: boolean`
- `isPublished` = vrai si une `SharedResource` avec `sourceId` correspondant existe (on stocke le `sourceId` implicitement via le contenu, mais la vérif la plus simple est de chercher si une SharedResource avec même `authorId` et même `titre` existe — **non**, meilleure approche : stocker les IDs sources dans un Set en faisant un findMany sur SharedResource)

Note : Le champ `sourceId` n'est pas stocké en DB sur SharedResource (c'est une copie figée). La vérification `isPublished` se fait ainsi : on récupère toutes les SharedResource de l'utilisateur de type SEANCE ou FICHE, on extrait leurs titres, et on compare par titre. C'est simple et suffisant.

- [ ] **Step 1 : Modifier la route**

Remplacer le contenu de `src/app/api/bibliotheque/mes-ressources/route.ts` par :

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const [seances, fiches, published] = await Promise.all([
    prisma.seance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, filiere: true, module: true, niveau: true, createdAt: true },
    }),
    prisma.fiche.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, titre: true, filiere: true, module: true, niveau: true, createdAt: true },
    }),
    prisma.sharedResource.findMany({
      where: { authorId: userId, type: { in: ["SEANCE", "FICHE"] } },
      select: { titre: true, type: true },
    }),
  ]);

  const publishedSeanceTitres = new Set(
    published.filter((p) => p.type === "SEANCE").map((p) => p.titre)
  );
  const publishedFicheTitres = new Set(
    published.filter((p) => p.type === "FICHE").map((p) => p.titre)
  );

  return NextResponse.json({
    seances: seances.map((s) => ({
      id: s.id,
      titre: s.title,
      filiere: s.filiere,
      module: s.module,
      niveau: s.niveau,
      createdAt: s.createdAt,
      isPublished: publishedSeanceTitres.has(s.title),
    })),
    fiches: fiches.map((f) => ({
      id: f.id,
      titre: f.titre,
      filiere: f.filiere,
      module: f.module,
      niveau: f.niveau,
      createdAt: f.createdAt,
      isPublished: publishedFicheTitres.has(f.titre),
    })),
  });
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/bibliotheque/mes-ressources/route.ts
git commit -m "feat(api): enrich mes-ressources with createdAt and isPublished"
```

---

## Task 4 — Types TypeScript

**Files:**
- Modify: `src/types/bibliotheque.ts`

**Interfaces:**
- Produit: `etablissement?: string` sur `ResourceListItem` et `ResourceDetail` ; type `MyOwnResource` exporté

- [ ] **Step 1 : Mettre à jour `bibliotheque.ts`**

Ajouter `etablissement?: string | null;` dans `ResourceListItem` après `likedByMe: boolean;` :

```typescript
export interface ResourceListItem {
  id: string;
  type: ResourceType;
  titre: string;
  description: string | null;
  filiere: string | null;
  module: string | null;
  niveau: string | null;
  fileName: string | null;
  fileType: string | null;
  authorName: string;
  etablissement?: string | null;   // <-- nouveau
  isMine: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}
```

Ajouter également dans `ResourceDetail` (qui extends ResourceListItem, donc hérité automatiquement).

Ajouter le nouveau type à la fin du fichier :

```typescript
export interface MyOwnResource {
  id: string;
  titre: string;
  filiere: string | null;
  module: string | null;
  niveau: string | null;
  createdAt: string;
  isPublished: boolean;
}

export interface MyOwnResources {
  seances: MyOwnResource[];
  fiches: MyOwnResource[];
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/types/bibliotheque.ts
git commit -m "feat(types): add etablissement to ResourceListItem, add MyOwnResource type"
```

---

## Task 5 — ResourceCard : afficher l'établissement

**Files:**
- Modify: `src/components/bibliotheque/ResourceCard.tsx`

**Interfaces:**
- Consomme: `resource.etablissement?: string | null` (défini dans Task 4)

- [ ] **Step 1 : Modifier le pied de carte**

Dans `ResourceCard.tsx`, trouver le bloc `<span className="text-[11px] truncate max-w-[120px]"` qui affiche `{r.authorName}`.

Remplacer par :

```tsx
<div className="flex flex-col min-w-0">
  <span className="text-[11px] truncate max-w-[140px]" style={{ color: "#9CA3AF" }}>
    {r.authorName}
  </span>
  {r.etablissement && (
    <span className="text-[10px] truncate max-w-[140px]" style={{ color: "#C4C9D4" }}>
      {r.etablissement}
    </span>
  )}
</div>
```

- [ ] **Step 2 : Vérifier visuellement**

Lancer `npm run dev` et ouvrir `/bibliotheque`. Les ressources sans établissement ne doivent pas afficher de ligne vide.

- [ ] **Step 3 : Commit**

```bash
git add src/components/bibliotheque/ResourceCard.tsx
git commit -m "feat(ui): display etablissement on ResourceCard"
```

---

## Task 6 — PublishModal : props de pré-remplissage

**Files:**
- Modify: `src/components/bibliotheque/PublishModal.tsx`

**Interfaces:**
- Consomme: props `defaultSourceId?: string` et `defaultType?: ResourceType`
- Produit: modal qui s'ouvre avec type et sourceId déjà sélectionnés si ces props sont fournies

- [ ] **Step 1 : Ajouter les props**

Modifier l'interface `Props` :

```typescript
interface Props {
  onClose: () => void;
  onPublished: () => void;
  defaultSourceId?: string;
  defaultType?: ResourceType;
}
```

- [ ] **Step 2 : Utiliser les props dans l'initialisation des états**

Modifier les lignes `useState` pour utiliser les valeurs par défaut :

```typescript
export default function PublishModal({ onClose, onPublished, defaultSourceId, defaultType }: Props) {
  const [type, setType] = useState<ResourceType>(defaultType ?? "SEANCE");
  // ... autres states inchangés ...
  const [sourceId, setSourceId] = useState(defaultSourceId ?? "");
```

- [ ] **Step 3 : Vérifier que le reset `switchType` ne casse pas le comportement**

La fonction `switchType` remet `sourceId` à `""` quand l'utilisateur change de type manuellement — comportement correct, pas de changement nécessaire.

- [ ] **Step 4 : Commit**

```bash
git add src/components/bibliotheque/PublishModal.tsx
git commit -m "feat(ui): PublishModal accepts defaultSourceId and defaultType props"
```

---

## Task 7 — BibliothequeClient : onglets + filtre établissement + onglet "Mes séances & fiches"

**Files:**
- Modify: `src/components/bibliotheque/BibliothequeClient.tsx`

**Interfaces:**
- Consomme: `MyOwnResources` (Task 4), `PublishModal` avec `defaultSourceId`/`defaultType` (Task 6), filtre `etablissement` sur GET `/api/bibliotheque` (Task 2)

- [ ] **Step 1 : Ajouter les imports et états**

En haut du composant, ajouter l'import du nouveau type :
```typescript
import { ResourceListItem, ResourceType, TYPE_META, MyOwnResources } from "@/types/bibliotheque";
```

Ajouter les nouveaux états après les états existants :
```typescript
const [activeTab, setActiveTab] = useState<"communaute" | "mes-ressources">("communaute");
const [etablissement, setEtablissement] = useState("");
const [myResources, setMyResources] = useState<MyOwnResources>({ seances: [], fiches: [] });
const [myLoading, setMyLoading] = useState(false);
const [publishDefaults, setPublishDefaults] = useState<{ sourceId?: string; type?: ResourceType }>({});
```

- [ ] **Step 2 : Ajouter le fetch des mes-ressources**

Ajouter un `useEffect` séparé pour charger les ressources propres de l'utilisateur quand l'onglet "mes-ressources" est actif :

```typescript
useEffect(() => {
  if (activeTab !== "mes-ressources") return;
  setMyLoading(true);
  fetch("/api/bibliotheque/mes-ressources")
    .then((r) => r.json())
    .then((d) => setMyResources(d))
    .catch(() => {})
    .finally(() => setMyLoading(false));
}, [activeTab]);
```

- [ ] **Step 3 : Ajouter `etablissement` au fetch de la communauté**

Dans `fetchData`, ajouter dans les params :
```typescript
if (etablissement) params.set("etablissement", etablissement);
```

Et dans les dépendances du `useCallback` : `[q, type, filiere, moduleNom, sort, etablissement]`

- [ ] **Step 4 : Mettre à jour l'état des filtres**

Modifier le type de `filters` pour inclure `etablissements` :
```typescript
const [filters, setFilters] = useState<{ filieres: string[]; modules: string[]; etablissements: string[] }>({ 
  filieres: [], modules: [], etablissements: [] 
});
```

- [ ] **Step 5 : Ajouter les onglets en haut du rendu**

Avant la barre de recherche existante, insérer :

```tsx
{/* Onglets */}
<div className="flex gap-1 mb-5 border-b" style={{ borderColor: "#E2E8F0" }}>
  {[
    { key: "communaute", label: "Communauté" },
    { key: "mes-ressources", label: "Mes séances & fiches" },
  ].map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key as "communaute" | "mes-ressources")}
      className="px-4 py-2 text-sm font-medium transition-colors"
      style={{
        color: activeTab === tab.key ? "#003087" : "#9CA3AF",
        borderBottom: activeTab === tab.key ? "2px solid #003087" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      {tab.label}
    </button>
  ))}
</div>
```

- [ ] **Step 6 : Ajouter le filtre établissement dans la barre Communauté**

Dans la barre des filtres (onglet Communauté), après le select `moduleNom`, ajouter :

```tsx
{filters.etablissements.length > 0 && (
  <select value={etablissement} onChange={(e) => setEtablissement(e.target.value)} style={selectStyle}>
    <option value="">Tous les établissements</option>
    {filters.etablissements.map((e) => <option key={e} value={e}>{e}</option>)}
  </select>
)}
```

- [ ] **Step 7 : Conditionner l'affichage Communauté vs Mes ressources**

Envelopper la barre de filtres + grille existante dans `{activeTab === "communaute" && ...}`.

Ajouter ensuite le rendu de l'onglet "Mes séances & fiches" :

```tsx
{activeTab === "mes-ressources" && (
  <div>
    {myLoading ? (
      <p className="text-sm text-center py-16" style={{ color: "#9CA3AF" }}>Chargement…</p>
    ) : (
      <>
        {/* Séances */}
        {myResources.seances.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6B7280" }}>
              Séances pédagogiques ({myResources.seances.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myResources.seances.map((s) => (
                <div key={s.id} className="card-hover flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA830" }}>
                      ⚡ Séance
                    </span>
                    {s.isPublished && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "#D1FAE5", color: "#065F46" }}>
                        Publié ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#111827" }}>{s.titre}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {s.filiere && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{s.filiere}</span>}
                      {s.module && <span className="text-[10px] px-2 py-0.5 rounded truncate max-w-[160px]" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{s.module}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                    <span className="text-[10px]" style={{ color: "#C4C9D4" }}>
                      {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                    {!s.isPublished && (
                      <button
                        onClick={() => { setPublishDefaults({ sourceId: s.id, type: "SEANCE" }); setShowPublish(true); }}
                        className="text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors"
                        style={{ background: "#16A34A", color: "#FFFFFF" }}
                      >
                        Partager
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fiches */}
        {myResources.fiches.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6B7280" }}>
              Fiches pédagogiques ({myResources.fiches.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myResources.fiches.map((f) => (
                <div key={f.id} className="card-hover flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "#00308714", color: "#003087", border: "1px solid #00308730" }}>
                      📋 Fiche
                    </span>
                    {f.isPublished && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "#D1FAE5", color: "#065F46" }}>
                        Publié ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#111827" }}>{f.titre}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {f.filiere && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{f.filiere}</span>}
                      {f.module && <span className="text-[10px] px-2 py-0.5 rounded truncate max-w-[160px]" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{f.module}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                    <span className="text-[10px]" style={{ color: "#C4C9D4" }}>
                      {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                    {!f.isPublished && (
                      <button
                        onClick={() => { setPublishDefaults({ sourceId: f.id, type: "FICHE" }); setShowPublish(true); }}
                        className="text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors"
                        style={{ background: "#16A34A", color: "#FFFFFF" }}
                      >
                        Partager
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {myResources.seances.length === 0 && myResources.fiches.length === 0 && (
          <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: "1px dashed #E2E8F0" }}>
            <p className="text-sm" style={{ color: "#374151" }}>Aucune séance ou fiche générée</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Génère des séances et fiches pédagogiques pour les partager ici.</p>
          </div>
        )}
      </>
    )}
  </div>
)}
```

- [ ] **Step 8 : Passer `publishDefaults` au PublishModal**

Trouver dans le JSX l'appel `<PublishModal ... />` et passer les nouvelles props :

```tsx
{showPublish && (
  <PublishModal
    onClose={() => { setShowPublish(false); setPublishDefaults({}); }}
    onPublished={() => { setShowPublish(false); setPublishDefaults({}); fetchData(); if (activeTab === "mes-ressources") { /* re-fetch my resources */ setActiveTab("communaute"); setTimeout(() => setActiveTab("mes-ressources"), 0); } }}
    defaultSourceId={publishDefaults.sourceId}
    defaultType={publishDefaults.type}
  />
)}
```

- [ ] **Step 9 : Vérifier manuellement**

Lancer `npm run dev`. Aller sur `/bibliotheque` :
- Vérifier que les 2 onglets s'affichent
- Cliquer "Mes séances & fiches" → voir les séances générées
- Cliquer "Partager" sur une séance → PublishModal s'ouvre avec le titre/filière pré-remplis
- Après publication, badge "Publié ✓" apparaît sur la carte
- Onglet "Communauté" : le filtre établissement apparaît si des ressources avec établissement existent

- [ ] **Step 10 : Commit**

```bash
git add src/components/bibliotheque/BibliothequeClient.tsx
git commit -m "feat(ui): add tabs Communauté/Mes séances, etablissement filter in Bibliothèque"
```

---

## Task 8 — Push et vérification Vercel

- [ ] **Step 1 : Push**

```bash
git push
```

- [ ] **Step 2 : Vérifier le build Vercel**

Attendre le déploiement sur Vercel et vérifier qu'il n'y a pas d'erreurs de build.

- [ ] **Step 3 : Tester en production**

Ouvrir l'app déployée, aller sur `/bibliotheque`, vérifier les 2 onglets et la publication rapide.
