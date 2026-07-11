import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
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
    include: {
      events: {
        orderBy: { ordre: 'asc' },
        include: { decision: true },
      },
      report: true,
    },
  });

  if (!run) return NextResponse.json({ error: 'Run introuvable' }, { status: 404 });
  return NextResponse.json(run);
}
