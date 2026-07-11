import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const simulations = await prisma.simulation.findMany({
    where: { userId: session.user.id },
    include: {
      company: { select: { nom: true, secteur: true } },
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { status: true, score: true, startedAt: true },
      },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(simulations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const { titre, filiere, module, niveau, duree, nbStagiaires, difficulte, competencesCiblees } = body;

  if (!titre || !filiere || !module) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const simulation = await prisma.simulation.create({
    data: {
      titre,
      filiere,
      module,
      niveau: niveau ?? '',
      duree: duree ?? '2h',
      nbStagiaires: nbStagiaires ?? 20,
      difficulte: difficulte ?? 'INTERMEDIAIRE',
      competencesCiblees: competencesCiblees ?? [],
      userId: session.user.id,
    },
  });

  return NextResponse.json(simulation, { status: 201 });
}
