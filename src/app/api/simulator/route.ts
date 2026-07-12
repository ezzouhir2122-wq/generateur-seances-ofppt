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

  // Le module est optionnel : le dropdown n'apparaît qu'après le choix d'une filière
  // et le formulaire n'exige que titre + filière. On l'accepte donc vide.
  if (!titre || !filiere) {
    return NextResponse.json({ error: 'Titre et filière requis' }, { status: 400 });
  }

  const simulation = await prisma.simulation.create({
    data: {
      titre,
      filiere,
      module: module ?? '',
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
