import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { streamGenerate } from '@/lib/simulator/generator';
import type { EntrepriseVirtuelle } from '@/lib/simulator/types';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const { simulationId, filiere, module, niveau, duree, nbStagiaires, difficulte, competencesCiblees } = body;

  if (!simulationId) return NextResponse.json({ error: 'simulationId manquant' }, { status: 400 });

  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, userId: session.user.id },
  });
  if (!simulation) return NextResponse.json({ error: 'Simulation introuvable' }, { status: 404 });

  const userKeys = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { claudeApiKey: true, preferredModel: true },
  });
  const apiKey = userKeys?.claudeApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Clé Claude manquante' }, { status: 400 });

  // Génération d'un gros JSON de fond (entreprise + scénarios) : on force Haiku,
  // bien plus rapide, pour rester sous la limite maxDuration de Vercel (120s).
  // Sonnet dépassait le timeout et coupait le stream avant la sauvegarde en DB.
  const model = 'claude-haiku-4-5-20251001';

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        let fullText = '';
        for await (const chunk of streamGenerate(
          { filiere, module, niveau, duree, nbStagiaires, difficulte, competencesCiblees },
          apiKey,
          model
        )) {
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        const clean = fullText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const entreprise = JSON.parse(clean) as EntrepriseVirtuelle;

        await prisma.virtualCompany.upsert({
          where: { simulationId },
          update: {
            nom: entreprise.nom,
            secteur: entreprise.secteur,
            description: entreprise.description,
            contexteEconomique: entreprise.contexteEconomique,
            organigramme: entreprise.organigramme as object,
            personnages: entreprise.personnages as object,
            clients: entreprise.clients as object,
            fournisseurs: entreprise.fournisseurs as object,
            documents: entreprise.documents as object,
            problemesCles: entreprise.problemesCles,
            arcNarratif: entreprise.arcNarratif as object,
          },
          create: {
            simulationId,
            nom: entreprise.nom,
            secteur: entreprise.secteur,
            description: entreprise.description,
            contexteEconomique: entreprise.contexteEconomique,
            organigramme: entreprise.organigramme as object,
            personnages: entreprise.personnages as object,
            clients: entreprise.clients as object,
            fournisseurs: entreprise.fournisseurs as object,
            documents: entreprise.documents as object,
            problemesCles: entreprise.problemesCles,
            arcNarratif: entreprise.arcNarratif as object,
          },
        });

        controller.enqueue(encoder.encode(`\n[[DONE]]${JSON.stringify({ simulationId })}`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur génération';
        controller.enqueue(encoder.encode(`[[ERROR]]${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
