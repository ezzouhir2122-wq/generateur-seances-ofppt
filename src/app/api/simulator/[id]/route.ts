import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const simulation = await prisma.simulation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      company: true,
      runs: {
        orderBy: { startedAt: 'desc' },
        include: { report: { select: { note: true } } },
      },
    },
  });

  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(simulation);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const simulation = await prisma.simulation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  await prisma.simulation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
