import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const distinctGroupe = searchParams.get("distinct") === "groupe";
  const filtreGroupe = searchParams.get("groupe");

  if (distinctGroupe) {
    const groupes = await prisma.userModule.findMany({
      where: { userId: session.user.id },
      select: { groupe: true },
      distinct: ["groupe"],
      orderBy: { groupe: "asc" },
    });
    return NextResponse.json(groupes.map((g) => g.groupe));
  }

  if (filtreGroupe) {
    const modules = await prisma.userModule.findMany({
      where: { userId: session.user.id, groupe: filtreGroupe },
      select: { module: true, mhg: true },
      orderBy: { module: "asc" },
    });
    return NextResponse.json(modules);
  }

  const modules = await prisma.userModule.findMany({
    where: { userId: session.user.id },
    orderBy: { groupe: "asc" },
  });
  return NextResponse.json(modules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { modules } = await req.json();
  if (!Array.isArray(modules) || modules.length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  let count = 0;
  for (const m of modules) {
    if (!m.groupe || !m.module) continue;
    await prisma.userModule.upsert({
      where: { groupe_module_userId: { groupe: m.groupe, module: m.module, userId: session.user.id } },
      update: { mhg: Number(m.mhg) || 0 },
      create: { groupe: m.groupe, module: m.module, mhg: Number(m.mhg) || 0, userId: session.user.id },
    });
    count++;
  }

  return NextResponse.json({ ok: true, count });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { count } = await prisma.userModule.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true, count });
}
