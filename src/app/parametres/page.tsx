import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import ParametresClient from "./ParametresClient";

export const metadata = { title: "Paramètres — Competencia IA" };

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, matricule: true, etablissement: true },
  });

  return (
    <ParametresClient
      initialUser={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        matricule: user?.matricule ?? null,
        etablissement: user?.etablissement ?? null,
      }}
    />
  );
}
