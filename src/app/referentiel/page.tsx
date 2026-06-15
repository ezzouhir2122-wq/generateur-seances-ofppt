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
            include: {
              competences: {
                select: {
                  id: true,
                  titre: true,
                  objectifs: { select: { titre: true } },
                },
                orderBy: { titre: "asc" },
              },
            },
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
        competences: m.competences.map((c) => ({
          id: c.id,
          titre: c.titre,
          objectifs: c.objectifs.map((o) => o.titre),
        })),
      })),
    })),
  }));

  return <ReferentielClient secteurs={data} />;
}
