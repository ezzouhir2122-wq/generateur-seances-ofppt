import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const select = { id: true, name: true, email: true, createdAt: true, approvedAt: true };
  const [pending, approved, rejected] = await Promise.all([
    prisma.user.findMany({ where: { status: "PENDING" }, select, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      where: { status: "APPROVED", role: "FORMATEUR" },
      select,
      orderBy: { approvedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { status: "REJECTED", role: "FORMATEUR" },
      select,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return NextResponse.json({ pending, approved, rejected });
}
