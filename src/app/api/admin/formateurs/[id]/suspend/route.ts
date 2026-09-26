import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id }, select: { status: true, role: true } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  // On ne désactive qu'un formateur actuellement actif
  if (existing.role === "ADMIN") return NextResponse.json({ error: "Impossible de désactiver un admin" }, { status: 400 });
  if (existing.status !== "APPROVED") return NextResponse.json({ ok: true, alreadyProcessed: true });

  // On conserve approvedAt : le formateur reste "connu" comme approuvé, seulement désactivé
  await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  return NextResponse.json({ ok: true });
}
