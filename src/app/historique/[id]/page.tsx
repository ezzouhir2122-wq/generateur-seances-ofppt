import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import SeanceDetailClient from "@/components/ui/SeanceDetailClient";

export default async function SeanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  let seance;
  try {
    seance = await prisma.seance.findUnique({
      where: { id, userId: session.user.id },
    });
  } catch {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-red-500">Base de données non configurée.</p>
      </div>
    );
  }

  if (!seance) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/historique"
          className="text-sm text-gray-500 hover:text-ofppt-green transition-colors"
        >
          ← Mes séances
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium truncate max-w-xs">
          {seance.title}
        </span>
      </div>

      <SeanceDetailClient seance={seance} />
    </div>
  );
}
