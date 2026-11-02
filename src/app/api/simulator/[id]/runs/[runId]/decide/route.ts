import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { applyDecision } from '@/lib/simulator/scoring';
import type { Choix, ExerciceChiffre } from '@/lib/simulator/types';

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

  const { eventId, choixSelectionne, reponseSaisie, tempsReponse } = await req.json();
  if (!eventId) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const event = await prisma.runEvent.findFirst({
    where: { id: eventId, runId },
  });
  if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });

  const exercice = event.exercice as unknown as ExerciceChiffre | null;

  // Décision à persister : construite soit depuis un exercice chiffré (saisie libre),
  // soit depuis un choix QCM (A/B/C).
  let decisionData: {
    choixSelectionne: string;
    reponseSaisie: string | null;
    correct: boolean | null;
    consequences: string;
    impactScore: number;
    impactSatisfaction: number;
    impactFinancier: number;
    impactMoral: number;
  };
  let impacts: Choix;

  if (exercice) {
    // ── Exercice chiffré : valider la valeur saisie contre la réponse attendue ──
    const brut = String(reponseSaisie ?? '').replace(/\s/g, '').replace(',', '.');
    const valeur = Number.parseFloat(brut);
    if (!brut || Number.isNaN(valeur)) {
      return NextResponse.json({ error: 'Réponse chiffrée invalide' }, { status: 400 });
    }
    const tolerance = Math.abs(exercice.tolerance ?? 0);
    const correct = Math.abs(valeur - exercice.reponseAttendue) <= tolerance;
    const unite = exercice.unite ? ` ${exercice.unite}` : '';

    impacts = correct
      ? {
          label: 'Exercice réussi',
          description: '',
          consequences: `✅ Bonne réponse (${valeur}${unite}). ${exercice.explication}`,
          impactScore: Math.abs(exercice.impactScore),
          impactSatisfaction: Math.abs(exercice.impactSatisfaction),
          impactFinancier: Math.abs(exercice.impactFinancier),
          impactMoral: Math.abs(exercice.impactMoral),
        }
      : {
          label: 'Exercice échoué',
          description: '',
          consequences: `❌ Réponse incorrecte (${valeur}${unite}). ${exercice.explication}`,
          impactScore: -Math.abs(exercice.impactScore),
          impactSatisfaction: 0,
          impactFinancier: -Math.abs(exercice.impactFinancier),
          impactMoral: 0,
        };

    decisionData = {
      choixSelectionne: 'EX',
      reponseSaisie: brut,
      correct,
      consequences: impacts.consequences,
      impactScore: impacts.impactScore,
      impactSatisfaction: impacts.impactSatisfaction,
      impactFinancier: impacts.impactFinancier,
      impactMoral: impacts.impactMoral,
    };
  } else {
    // ── QCM décisionnel : choix A/B/C ──
    if (!['A', 'B', 'C'].includes(choixSelectionne)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    const choixMap: Record<string, Choix> = {
      A: event.choixA as unknown as Choix,
      B: event.choixB as unknown as Choix,
      C: event.choixC as unknown as Choix,
    };
    impacts = choixMap[choixSelectionne];
    decisionData = {
      choixSelectionne,
      reponseSaisie: null,
      correct: null,
      consequences: impacts.consequences,
      impactScore: impacts.impactScore,
      impactSatisfaction: impacts.impactSatisfaction,
      impactFinancier: impacts.impactFinancier,
      impactMoral: impacts.impactMoral,
    };
  }

  const newState = applyDecision(
    {
      score: run.score,
      satisfactionClient: run.satisfactionClient,
      santeFinanciere: run.santeFinanciere,
      moralEquipe: run.moralEquipe,
    },
    impacts
  );

  const totalEvents = await prisma.runEvent.count({ where: { runId } });
  const nextEvenement = run.evenementCourant + 1;
  const isLast = nextEvenement >= totalEvents;

  const [decision, updatedRun] = await prisma.$transaction([
    prisma.runDecision.create({
      data: {
        eventId,
        ...decisionData,
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
