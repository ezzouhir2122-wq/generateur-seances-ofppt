import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { read, utils } from "xlsx";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id: groupeId, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const toCreate = rows
    .map((row) => ({
      nom: String(row["Nom"] ?? row["NOM"] ?? "").trim(),
      prenom: String(row["Prénom"] ?? row["Prenom"] ?? row["PRÉNOM"] ?? "").trim(),
      cne: String(row["CNE"] ?? row["Cne"] ?? "").trim() || null,
    }))
    .filter((r) => r.nom && r.prenom);

  if (toCreate.length === 0)
    return NextResponse.json({ error: "Aucun stagiaire valide trouvé. Vérifiez les colonnes : Nom, Prénom, CNE" }, { status: 400 });

  const result = await prisma.stagiaire.createMany({
    data: toCreate.map((r) => ({ ...r, groupeId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ created: result.count, total: toCreate.length });
}
