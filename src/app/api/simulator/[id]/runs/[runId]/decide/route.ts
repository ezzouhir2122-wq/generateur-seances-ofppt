import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { applyDecision } from '@/lib/simulator/scoring';
import type { Choix } from '@/lib/simulator/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id, runId } = await params;

  const simulation = await prisma.simulation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const run = await prisma.simulationRun.findFirst({
    where: { id: runId, simulationId: id },
  });
  if (!run) return NextResponse.json({ error: 'Run introuvable' }, { status: 404 });
  if (run.status === 'TERMINE') return NextResponse.json({ error: 'Run terminé' }, { status: 400 });

  const { eventId, choixSelectionne, tempsReponse } = await req.json();
  if (!eventId || !['A', 'B', 'C'].includes(choixSelectionne)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const event = await prisma.runEvent.findFirst({
    where: { id: eventId, runId },
  });
  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });

  const choixMap: Record<string, Choix> = {
    A: event.choixA as unknown as Choix,
    B: event.choixB as unknown as Choix,
    C: event.choixC as unknown as Choix,
  };
  const choix = choixMap[choixSelectionne];

  const newState = applyDecision(
    {
      score: run.score,
      satisfactionClient: run.satisfactionClient,
      santeFinanciere: run.santeFinanciere,
      moralEquipe: run.moralEquipe,
    },
    choix
  );

  const totalEvents = await prisma.runEvent.count({ where: { runId } });
  const nextEvenement = run.evenementCourant + 1;
  const isLast = nextEvenement >= totalEvents;

  const [decision, updatedRun] = await prisma.$transaction([
    prisma.runDecision.create({
      data: {
        eventId,
        choixSelectionne,
        consequences: choix.consequences,
        impactScore: choix.impactScore,
        impactSatisfaction: choix.impactSatisfaction,
        impactFinancier: choix.impactFinancier,
        impactMoral: choix.impactMoral,
        tempsReponse: tempsReponse ?? 0,
      },
    }),
    prisma.simulationRun.update({
      where: { id: runId },
      data: {
        ...newState,
        evenementCourant: nextEvenement,
        status: isLast ? 'TERMINE' : 'EN_COURS',
      },
    }),
  ]);

  return NextResponse.json({ decision, run: updatedRun, isLast });
}
