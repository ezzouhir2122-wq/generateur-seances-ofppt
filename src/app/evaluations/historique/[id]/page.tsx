import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import EvaluationDetailClient from "@/components/ui/EvaluationDetailClient";

export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  let evaluation;
  try {
    evaluation = await prisma.evaluation.findUnique({
      where: { id, userId: session.user.id },
    });
  } catch {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-red-500">Base de données non configurée.</p>
      </div>
    );
  }

  if (!evaluation) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/evaluations/historique"
          className="text-sm text-gray-500 hover:text-ofppt-green transition-colors"
        >
          ← Mes évaluations
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium truncate max-w-xs">
          {evaluation.titre}
        </span>
      </div>

      <EvaluationDetailClient evaluation={evaluation} />
    </div>
  );
}
