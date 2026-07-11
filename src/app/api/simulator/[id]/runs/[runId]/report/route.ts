import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateReport } from '@/lib/simulator/report';
import type { EntrepriseVirtuelle } from '@/lib/simulator/types';

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id, runId } = await params;

  const simulation = await prisma.simulation.findFirst({
    where: { id, userId: session.user.id },
    include: { company: true },
  });
  if (!simulation?.company) return NextResponse.json({ error: 'Simulation introuvable' }, { status: 404 });

  const run = await prisma.simulationRun.findFirst({
    where: { id: runId, simulationId: id },
    include: {
      events: { orderBy: { ordre: 'asc' }, include: { decision: true } },
      report: true,
    },
  });
  if (!run) return NextResponse.json({ error: 'Run introuvable' }, { status: 404 });

  if (run.report) return NextResponse.json(run.report);

  const userKeys = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { claudeApiKey: true, preferredModel: true },
  });
  const apiKey = userKeys?.claudeApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Clé Claude manquante' }, { status: 400 });

  const model = userKeys?.preferredModel?.startsWith('claude') ? userKeys.preferredModel : 'claude-sonnet-4-6';
  const entreprise = simulation.company as unknown as EntrepriseVirtuelle;

  const decisions = run.events
    .filter(ev => ev.decision)
    .map(ev => {
      const choixMap: Record<string, { label: string }> = {
        A: ev.choixA as unknown as { label: string },
        B: ev.choixB as unknown as { label: string },
        C: ev.choixC as unknown as { label: string },
      };
      return {
        ordre: ev.ordre,
        titre: ev.titre,
        choixSelectionne: ev.decision!.choixSelectionne,
        choixLabel: choixMap[ev.decision!.choixSelectionne]?.label ?? '',
        consequences: ev.decision!.consequences,
        impactScore: ev.decision!.impactScore,
      };
    });

  const reportData = await generateReport(
    {
      entreprise,
      decisions,
      scoresFinal: {
        score: run.score,
        satisfactionClient: run.satisfactionClient,
        santeFinanciere: run.santeFinanciere,
        moralEquipe: run.moralEquipe,
      },
      competencesCiblees: simulation.competencesCiblees,
      difficulte: simulation.difficulte,
    },
    apiKey,
    model
  );

  const report = await prisma.simulationReport.create({
    data: {
      runId,
      ...reportData,
    },
  });

  return NextResponse.json(report);
}
