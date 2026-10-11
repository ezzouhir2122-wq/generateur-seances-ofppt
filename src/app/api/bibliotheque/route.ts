import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const TYPES = ["SEANCE", "FICHE", "EVALUATION", "FICHIER"] as const;
type ResourceType = (typeof TYPES)[number];

// GET /api/bibliotheque?type=&filiere=&module=&q=&sort=recent|popular
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const filiere = sp.get("filiere");
  const moduleQ = sp.get("module");
  const q = sp.get("q")?.trim();
  const sort = sp.get("sort") === "popular" ? "popular" : "recent";
  const etablissementQ = sp.get("etablissement");

  // Portée : le public pour tout le monde, plus les ressources reservees a
  // mon etablissement. Un formateur sans etablissement renseigne ne voit
  // que le public — moins de resultats, jamais d'erreur.
  const monEtablissement = session.user.etablissement ?? null;
  const where: Prisma.SharedResourceWhereInput = {
    AND: [
      {
        OR: [
          { visibilite: "PUBLIC" },
          ...(monEtablissement
            ? [{ visibilite: "ETABLISSEMENT", etablissement: monEtablissement }]
            : []),
        ],
      },
    ],
  };
  if (type && TYPES.includes(type as ResourceType)) where.type = type;
  if (filiere) where.filiere = filiere;
  if (moduleQ) where.module = moduleQ;
  if (etablissementQ) where.etablissement = etablissementQ;
  if (q) {
    // where.OR sert deja a la visibilite : on ajoute la recherche comme
    // seconde condition du AND, sinon elle ecraserait le filtre de portee.
    (where.AND as Prisma.SharedResourceWhereInput[]).push({
      OR: [
        { titre: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { authorName: { contains: q, mode: "insensitive" } },
        { module: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const orderBy: Prisma.SharedResourceOrderByWithRelationInput =
    sort === "popular" ? { likes: { _count: "desc" } } : { createdAt: "desc" };

  const resources = await prisma.sharedResource.findMany({
    where,
    orderBy,
    take: 100,
    select: {
      id: true,
      type: true,
      titre: true,
      description: true,
      filiere: true,
      module: true,
      niveau: true,
      fileName: true,
      fileType: true,
      authorName: true,
      etablissement: true,
      authorId: true,
      createdAt: true,
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId }, select: { id: true } },
    },
  });

  // Options de filtre (valeurs distinctes présentes)
  const all = await prisma.sharedResource.findMany({
    where: {
      OR: [
        { visibilite: "PUBLIC" },
        ...(monEtablissement
          ? [{ visibilite: "ETABLISSEMENT", etablissement: monEtablissement }]
          : []),
      ],
    },
    select: { filiere: true, module: true, etablissement: true },
  });
  const filieres = [...new Set(all.map((r) => r.filiere).filter(Boolean))].sort();
  const modules = [...new Set(all.map((r) => r.module).filter(Boolean))].sort();
  const etablissements = [...new Set(all.map((r) => r.etablissement).filter(Boolean))].sort() as string[];

  return NextResponse.json({
    resources: resources.map((r) => ({
      id: r.id,
      type: r.type,
      titre: r.titre,
      description: r.description,
      filiere: r.filiere,
      module: r.module,
      niveau: r.niveau,
      fileName: r.fileName,
      fileType: r.fileType,
      authorName: r.authorName,
      etablissement: r.etablissement,
      isMine: r.authorId === userId,
      createdAt: r.createdAt,
      likeCount: r._count.likes,
      commentCount: r._count.comments,
      likedByMe: r.likes.length > 0,
    })),
    filters: { filieres, modules, etablissements },
  });
}

// POST /api/bibliotheque — publier (copie figée)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;
  const authorName = session.user.name ?? "Formateur";
  const etablissement = session.user.etablissement ?? null;

  const body = await req.json();
  const type = body.type as string;
  if (!TYPES.includes(type as ResourceType))
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });

  // L'auteur choisit la portee. "ETABLISSEMENT" n'a de sens que si son
  // profil en mentionne un : sinon on retombe sur PUBLIC plutot que de
  // publier dans le vide.
  const visibilite =
    body.visibilite === "ETABLISSEMENT" && etablissement ? "ETABLISSEMENT" : "PUBLIC";

  const data: Prisma.SharedResourceCreateInput = {
    type,
    visibilite,
    titre: (body.titre ?? "").trim(),
    description: body.description?.trim() || null,
    filiere: body.filiere?.trim() || null,
    module: body.module?.trim() || null,
    niveau: body.niveau?.trim() || null,
    authorName,
    etablissement,
    author: { connect: { id: userId } },
  };

  if (type === "SEANCE" || type === "FICHE" || type === "EVALUATION") {
    const sourceId = body.sourceId as string | undefined;
    if (!sourceId) return NextResponse.json({ error: "Ressource source requise" }, { status: 400 });

    // On relit la source en base en exigeant userId : un formateur ne peut
    // publier que ce qui lui appartient, meme en forgeant la requete.
    if (type === "SEANCE") {
      const s = await prisma.seance.findFirst({ where: { id: sourceId, userId } });
      if (!s) return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
      data.titre = data.titre || s.title;
      data.filiere = data.filiere ?? s.filiere;
      data.module = data.module ?? s.module;
      data.niveau = data.niveau ?? s.niveau;
      data.contenu = s.contenu;
    } else if (type === "FICHE") {
      const f = await prisma.fiche.findFirst({ where: { id: sourceId, userId } });
      if (!f) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
      data.titre = data.titre || f.titre;
      data.filiere = data.filiere ?? f.filiere;
      data.module = data.module ?? f.module;
      data.niveau = data.niveau ?? f.niveau;
      data.contenu = f.contenu;
    } else {
      const e = await prisma.evaluation.findFirst({ where: { id: sourceId, userId } });
      if (!e) return NextResponse.json({ error: "Évaluation introuvable" }, { status: 404 });
      data.titre = data.titre || e.titre;
      data.filiere = data.filiere ?? e.filiere;
      data.module = data.module ?? e.module;
      data.niveau = data.niveau ?? e.niveau;
      data.contenu = e.contenu;
    }

    // Lien vers l'origine : sert a savoir si c'est deja publie, par id.
    data.sourceId = sourceId;

    const deja = await prisma.sharedResource.findFirst({
      where: { authorId: userId, sourceId, type },
      select: { id: true },
    });
    if (deja)
      return NextResponse.json(
        { error: "Cette ressource est déjà publiée dans la bibliothèque." },
        { status: 409 },
      );
  } else if (type === "FICHIER") {
    if (!body.fileUrl) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    data.fileUrl = body.fileUrl;
    data.fileName = body.fileName ?? null;
    data.fileType = body.fileType ?? null;
    data.fileSize = typeof body.fileSize === "number" ? body.fileSize : null;
  }

  if (!data.titre) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const created = await prisma.sharedResource.create({ data, select: { id: true } });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
