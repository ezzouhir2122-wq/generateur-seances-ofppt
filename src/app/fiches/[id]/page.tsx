import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import FicheDetailClient from "@/components/ui/FicheDetailClient";

export default async function FicheDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) notFound();

  return <FicheDetailClient fiche={fiche} />;
}
