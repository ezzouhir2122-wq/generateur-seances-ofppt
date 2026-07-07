import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BibliothequeClient from "@/components/bibliotheque/BibliothequeClient";
import PageShell from "@/components/ui/PageShell";

export default async function BibliothequePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <PageShell
      title="Bibliothèque"
      subtitle="Partagez et explorez les ressources pédagogiques de votre communauté"
      icon="📚"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Pédagogie" },
        { label: "Bibliothèque" },
      ]}
    >
      <BibliothequeClient />
    </PageShell>
  );
}
