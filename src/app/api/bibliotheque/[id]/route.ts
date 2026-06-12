import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/bibliotheque/[id] — détail + commentaires + état du like
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const r = await prisma.sharedResource.findUnique({
    where: { id },
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId }, select: { id: true } },
      comments: { orderBy: { createdAt: "desc" }, select: { id: true, authorName: true, contenu: true, createdAt: true, userId: true } },
    },
  });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: r.id,
    type: r.type,
    titre: r.titre,
    description: r.description,
    filiere: r.filiere,
    module: r.module,
    niveau: r.niveau,
    contenu: r.contenu,
    fileUrl: r.fileUrl,
    fileName: r.fileName,
    fileType: r.fileType,
    fileSize: r.fileSize,
    authorName: r.authorName,
    isMine: r.authorId === userId,
    createdAt: r.createdAt,
    likeCount: r._count.likes,
    commentCount: r._count.comments,
    likedByMe: r.likes.length > 0,
    comments: r.comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      contenu: c.contenu,
      createdAt: c.createdAt,
      isMine: c.userId === userId,
    })),
  });
}

// DELETE /api/bibliotheque/[id] — l'auteur peut supprimer sa ressource
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const r = await prisma.sharedResource.findUnique({ where: { id }, select: { authorId: true } });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (r.authorId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });

  await prisma.sharedResource.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
