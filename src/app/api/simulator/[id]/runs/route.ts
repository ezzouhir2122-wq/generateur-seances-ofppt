import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { EvenementNarratif } from '@/lib/simulator/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const simulation = await prisma.simulation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const runs = await prisma.simulationRun.findMany({
    where: { simulationId: id },
    orderBy: { startedAt: 'desc' },
    include: { report: { select: { note: true } } },
  });

  return NextResponse.json(runs);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const simulation = await prisma.simulation.findFirst({
    where: { id, userId: session.user.id },
    include: { company: true },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  if (!simulation.company) return NextResponse.json({ error: "Générez d'abord l'entreprise" }, { status: 400 });

  const arc = simulation.company.arcNarratif as unknown as EvenementNarratif[];

  const run = await prisma.simulationRun.create({
    data: { simulationId: id },
  });

  await prisma.runEvent.createMany({
    data: arc.map(ev => ({
      runId: run.id,
      ordre: ev.ordre,
      templateType: ev.templateType,
      titre: ev.titre,
      description: ev.description,
      contexte: ev.contexte,
      personnageImplique: ev.personnageImplique,
      documentAttache: ev.documentAttache ?? null,
      choixA: ev.choixA as object,
      choixB: ev.choixB as object,
      choixC: ev.choixC as object,
    })),
  });

  return NextResponse.json(run, { status: 201 });
}
