import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ReferentielClient from "./ReferentielClient";
import PageShell from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default async function ReferentielPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Filiere.filiere = libellé "Filière" (ex: "TSC") — regroupement côté serveur
  const filieres = await prisma.filiere.findMany({
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
    orderBy: { createdAt: "desc" },
  });

  // Grouper les Filiere par leur champ `filiere` (= "Filière" OFPPT, ex: "TSC")
  const groupMap = new Map<
    string,
    { id: string; nom: string; code: null; filieres: typeof filieres }
  >();
  for (const f of filieres) {
    const key = f.filiere ?? f.nom;
    if (!groupMap.has(key))
      groupMap.set(key, { id: key, nom: key, code: null, filieres: [] });
    groupMap.get(key)!.filieres.push(f);
  }

  const data = Array.from(groupMap.values()).map((s) => ({
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

  return (
    <PageShell
      title="Référentiel"
      subtitle="Consultez vos filières, modules et compétences importés"
      icon="📑"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Pédagogie" },
        { label: "Référentiel" },
      ]}
    >
      <ReferentielClient secteurs={data} />
    </PageShell>
  );
}
