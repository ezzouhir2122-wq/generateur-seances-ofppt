import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BibliothequeClient from "@/components/bibliotheque/BibliothequeClient";

export default async function BibliothequePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <BibliothequeClient />;
}
