import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import FicheDetailClient from "@/components/ui/FicheDetailClient";
import PartagerButton from "@/components/bibliotheque/PartagerButton";

export default async function FicheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) notFound();

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-6 flex justify-end">
        <PartagerButton
          type="FICHE"
          sourceId={fiche.id}
          etablissement={session.user.etablissement ?? null}
        />
      </div>
      <FicheDetailClient fiche={fiche} />
    </>
  );
}
