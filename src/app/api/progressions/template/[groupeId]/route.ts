import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { utils, write } from "xlsx";

export async function GET(_: Request, { params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
    include: { stagiaires: { orderBy: { nom: "asc" } } },
  });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    select: { titre: true },
    orderBy: { createdAt: "asc" },
  });

  const headers = ["Stagiaire", "Compétence", "Note (/20)"];
  const rows: string[][] = [];
  for (const s of groupe.stagiaires) {
    for (const c of competences) {
      rows.push([`${s.prenom} ${s.nom}`, c.titre, ""]);
    }
  }

  const ws = utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 12 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Notes");
  const buffer = write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-notes-${groupeId}.xlsx"`,
    },
  });
}
