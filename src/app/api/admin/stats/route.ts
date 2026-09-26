import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const [actifs, enAttente, rejetes, seances, fiches, simulations, stagiaires, groupes, chats] =
    await Promise.all([
      prisma.user.count({ where: { role: "FORMATEUR", status: "APPROVED" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { status: "REJECTED" } }),
      prisma.seance.count(),
      prisma.fiche.count(),
      prisma.simulation.count(),
      prisma.stagiaire.count(),
      prisma.groupe.count(),
      prisma.chatSession.count(),
    ]);

  return NextResponse.json({
    formateurs: { actifs, enAttente, rejetes },
    contenu: { seances, fiches, simulations, stagiaires, groupes, chats },
  });
}
