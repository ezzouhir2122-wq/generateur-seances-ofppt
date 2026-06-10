import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const matricule = typeof body.matricule === "string" ? body.matricule.slice(0, 100) : null;
  const etablissement = typeof body.etablissement === "string" ? body.etablissement.slice(0, 100) : null;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { matricule, etablissement },
    select: { name: true, matricule: true, etablissement: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
