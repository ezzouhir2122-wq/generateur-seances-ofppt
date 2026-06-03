import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [seancesCount, modulesCount, groupes] = await Promise.all([
    prisma.seance.count({ where: { userId: session.user.id } }),
    prisma.userModule.count({ where: { userId: session.user.id } }),
    prisma.userModule.findMany({
      where: { userId: session.user.id },
      select: { groupe: true },
      distinct: ["groupe"],
    }),
  ]);

  return NextResponse.json({
    seancesCount,
    modulesCount,
    filieresCount: groupes.length,
  });
}
