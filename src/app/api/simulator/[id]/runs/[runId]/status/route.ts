import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
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

  const { status, tempsTotal } = await req.json();
  if (!['EN_COURS', 'PAUSE', 'TERMINE'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  const run = await prisma.simulationRun.update({
    where: { id: runId },
    data: { status, ...(tempsTotal !== undefined ? { tempsTotal } : {}) },
  });

  return NextResponse.json(run);
}
