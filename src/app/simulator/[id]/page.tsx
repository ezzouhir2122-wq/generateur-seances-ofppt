'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface SimulationDetail {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  niveau: string;
  duree: string;
  nbStagiaires: number;
  difficulte: string;
  company: {
    nom: string;
    secteur: string;
    description: string;
    personnages: Array<{ nom: string; fonction: string; personnalite: string }>;
    clients: Array<{ nom: string; type: string }>;
    fournisseurs: Array<{ nom: string }>;
    arcNarratif: Array<{ ordre: number; titre: string; templateType: string }>;
  } | null;
  runs: Array<{ id: string; status: string; score: number; startedAt: string; report: { note: number } | null }>;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  EN_COURS: { label: 'En cours', bg: '#DBEAFE', color: '#1D4ED8' },
  PAUSE: { label: 'En pause', bg: '#FEF3C7', color: '#92400E' },
  TERMINE: { label: 'Terminé', bg: '#DCFCE7', color: '#166534' },
};

export default function SimulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sim, setSim] = useState<SimulationDetail | null>(null);

  useEffect(() => {
    fetch(`/api/simulator/${id}`).then(r => r.json()).then(setSim);
  }, [id]);

  async function handleNewRun() {
    const res = await fetch(`/api/simulator/${id}/runs`, { method: 'POST' });
    const run = await res.json();
    router.push(`/simulator/${id}/run/${run.id}`);
  }

  if (!sim) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/simulator" className="text-sm text-blue-600 hover:underline">← Simulations</Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: '#003087' }}>{sim.titre}</h1>
          <div className="text-sm text-gray-500 mt-0.5">{sim.filiere} / {sim.module} · {sim.niveau} · {sim.duree}</div>
        </div>
        <button
          onClick={handleNewRun}
          disabled={!sim.company}
          className="px-4 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: '#0A4DA8' }}
          title={!sim.company ? "Générez d'abord l'entreprise" : undefined}
        >
          ▶ Nouveau run
        </button>
      </div>

      {/* Company card */}
      {sim.company ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#EFF6FF' }}>🏢</div>
            <div>
              <div className="font-bold text-lg" style={{ color: '#003087' }}>{sim.company.nom}</div>
              <div className="text-sm text-gray-500">{sim.company.secteur}</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{sim.company.description}</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700 mb-1">Personnages ({sim.company.personnages.length})</div>
              {sim.company.personnages.slice(0, 3).map((p, i) => (
                <div key={i} className="text-gray-500 truncate">{p.nom} — {p.fonction}</div>
              ))}
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Clients ({sim.company.clients.length})</div>
              {sim.company.clients.map((c, i) => <div key={i} className="text-gray-500 truncate">{c.nom}</div>)}
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">Scénarios ({sim.company.arcNarratif.length})</div>
              {sim.company.arcNarratif.slice(0, 4).map((ev, i) => (
                <div key={i} className="text-gray-500 truncate text-xs">{ev.ordre}. {ev.titre}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
          <div className="text-amber-600 font-medium">Entreprise non encore générée</div>
          <Link href={`/simulator/new?regenerate=${id}`} className="text-sm text-blue-600 hover:underline mt-1 block">
            Générer l&apos;entreprise →
          </Link>
        </div>
      )}

      {/* Runs */}
      <div>
        <h2 className="font-bold text-lg mb-3" style={{ color: '#003087' }}>Sessions ({sim.runs.length})</h2>
        {sim.runs.length === 0 ? (
          <div className="text-gray-400 text-sm">Aucune session. Lancez un run pour commencer.</div>
        ) : (
          <div className="space-y-2">
            {sim.runs.map(run => {
              const badge = STATUS_BADGE[run.status] ?? STATUS_BADGE.EN_COURS;
              return (
                <div key={run.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-medium text-gray-700">Score : {run.score}/100</span>
                      {run.report && <span className="text-sm text-green-700">Note IA : {run.report.note}/20</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Démarré le {new Date(run.startedAt).toLocaleDateString('fr-MA')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/simulator/${id}/run/${run.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ borderColor: '#0A4DA8', color: '#0A4DA8' }}
                    >
                      {run.status === 'TERMINE' ? 'Revoir' : '▶ Continuer'}
                    </Link>
                    {run.status === 'TERMINE' && (
                      <Link
                        href={`/simulator/${id}/run/${run.id}/rapport`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700"
                      >
                        Rapport
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
