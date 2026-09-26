import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

// Suppression définitive d'un compte formateur.
// Les relations Seance et UserModule n'ont pas de onDelete: Cascade dans le schéma,
// on les supprime donc explicitement dans une transaction avant l'utilisateur
// (les autres relations — fiches, groupes, simulations, chats… — cascadent).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (existing.role === "ADMIN") {
    return NextResponse.json({ error: "Impossible de supprimer un admin" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.seance.deleteMany({ where: { userId: id } }),
    prisma.userModule.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
