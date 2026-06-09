import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { read, utils } from "xlsx";

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
    include: { stagiaires: true },
  });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    select: { id: true, titre: true },
  });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const fullName = String(row["Stagiaire"] ?? "").trim();
    const competenceTitre = String(row["Compétence"] ?? row["Competence"] ?? "").trim();
    const note = Number(row["Note (/20)"] ?? row["Note"] ?? -1);

    if (!fullName || !competenceTitre || note < 0 || note > 20) continue;

    const stagiaire = groupe.stagiaires.find(
      (s) => `${s.prenom} ${s.nom}`.toLowerCase() === fullName.toLowerCase()
    );
    const competence = competences.find(
      (c) => c.titre.toLowerCase() === competenceTitre.toLowerCase()
    );

    if (!stagiaire) { errors.push(`Stagiaire introuvable : ${fullName}`); continue; }
    if (!competence) { errors.push(`Compétence introuvable : ${competenceTitre}`); continue; }

    const pourcentage = Math.round((note / 20) * 100);
    await prisma.progressionCompetence.upsert({
      where: { stagiaireId_competenceId: { stagiaireId: stagiaire.id, competenceId: competence.id } },
      update: { pourcentage, source: "import" },
      create: { stagiaireId: stagiaire.id, competenceId: competence.id, pourcentage, source: "import" },
    });
    imported++;
  }

  return NextResponse.json({ imported, errors: errors.slice(0, 10) });
}
