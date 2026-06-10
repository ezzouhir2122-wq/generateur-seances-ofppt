import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ReferentielClient from "./ReferentielClient";

export const dynamic = "force-dynamic";

export default async function ReferentielPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const secteurs = await prisma.secteur.findMany({
    include: {
      filieres: {
        include: {
          modules: {
            select: { id: true, nom: true, code: true, mhg: true },
            orderBy: { nom: "asc" },
          },
        },
        orderBy: { nom: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = secteurs.map((s) => ({
    id: s.id,
    nom: s.nom,
    code: s.code,
    filieres: s.filieres.map((f) => ({
      id: f.id,
      nom: f.nom,
      code: f.code,
      modules: f.modules.map((m) => ({
        id: m.id,
        nom: m.nom,
        code: m.code,
        mhg: m.mhg,
      })),
    })),
  }));

  return <ReferentielClient secteurs={data} />;
}
