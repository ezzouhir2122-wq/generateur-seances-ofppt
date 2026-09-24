import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  // Ne rejeter qu'une demande réellement en attente
  if (existing.status !== "PENDING") return NextResponse.json({ ok: true, alreadyProcessed: true });

  await prisma.user.update({ where: { id }, data: { status: "REJECTED" } });
  return NextResponse.json({ ok: true });
}
