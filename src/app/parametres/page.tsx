import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import ParametresClient from "./ParametresClient";

export const metadata = { title: "Paramètres — Competencia IA" };

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let userData = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    matricule: null as string | null,
    etablissement: null as string | null,
  };

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, matricule: true, etablissement: true },
    });
    if (user) {
      userData = {
        name: user.name ?? session.user.name ?? "",
        email: user.email ?? session.user.email ?? "",
        matricule: (user as { matricule?: string | null }).matricule ?? null,
        etablissement: (user as { etablissement?: string | null }).etablissement ?? null,
      };
    }
  } catch {
    // Champs optionnels absents en DB — on utilise les données de session
  }

  return <ParametresClient initialUser={userData} />;
}
