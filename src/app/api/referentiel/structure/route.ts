import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/referentiel/structure
 * Retourne l'arbre cascadé : Filière → Niveau de formation → RefModule
 * Utilisé par SeanceForm et FicheForm pour les dropdowns cascadés.
 * Format : { secteurs: [{ id, nom, filieres: [{ id, nom, modules: [...] }] }] }
 * "secteurs" = groupes de Filiere par leur champ filiere (= "Filière" du fichier Excel)
 * "filieres" = enregistrements Filiere (= "Niveau de formation")
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const filieres = await prisma.filiere.findMany({
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      filiere: true,
      modules: {
        select: { id: true, nom: true, code: true, mhg: true },
        orderBy: { code: "asc" },
      },
    },
  });

  // Grouper par champ filiere → structure { secteurs: [{ id, nom, filieres: [...] }] }
  const map = new Map<string, { id: string; nom: string; filieres: typeof filieres }>();
  for (const f of filieres) {
    const key = f.filiere ?? f.nom;
    if (!map.has(key)) map.set(key, { id: key, nom: key, filieres: [] });
    map.get(key)!.filieres.push(f);
  }

  return NextResponse.json({ secteurs: Array.from(map.values()) });
}
