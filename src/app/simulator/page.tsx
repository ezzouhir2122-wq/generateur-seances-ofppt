'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SimulationItem {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  difficulte: string;
  company: { nom: string; secteur: string } | null;
  runs: Array<{ status: string; score: number; startedAt: string }>;
  _count: { runs: number };
  createdAt: string;
}

const DIFF_COLORS: Record<string, string> = {
  DEBUTANT: '#22C55E',
  INTERMEDIAIRE: '#F59E0B',
  AVANCE: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  PAUSE: 'En pause',
  TERMINE: 'Terminé',
};

export default function SimulatorListPage() {
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/simulator')
      .then(r => r.json())
      .then(data => { setSimulations(data); setLoading(false); });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette simulation ?')) return;
    await fetch(`/api/simulator/${id}`, { method: 'DELETE' });
    setSimulations(prev => prev.filter(s => s.id !== id));
  }

  async function handleNewRun(id: string) {
    const res = await fetch(`/api/simulator/${id}/runs`, { method: 'POST' });
    const run = await res.json();
    router.push(`/simulator/${id}/run/${run.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#003087' }}>Competencia Simulator</h1>
          <p className="text-sm text-gray-500 mt-1">Entreprises virtuelles IA pour vos classes</p>
        </div>
        <Link
          href="/simulator/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
          style={{ background: '#0A4DA8' }}
        >
          + Nouvelle simulation
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Chargement...</div>
      ) : simulations.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-4xl mb-3">🎮</div>
          <div className="text-lg font-medium text-gray-600">Aucune simulation</div>
          <div className="text-sm text-gray-400 mt-1 mb-4">Créez votre première entreprise virtuelle</div>
          <Link
            href="/simulator/new"
            className="inline-flex px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: '#0A4DA8' }}
          >
            Créer une simulation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map(sim => {
            const lastRun = sim.runs[0];
            return (
              <div
                key={sim.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{sim.titre}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: DIFF_COLORS[sim.difficulte] ?? '#6B7280' }}
                    >
                      {sim.difficulte}
                    </span>
                    {lastRun && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {STATUS_LABELS[lastRun.status]}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {sim.company?.nom ?? 'Entreprise non générée'} · {sim.filiere} / {sim.module}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {sim._count.runs} run{sim._count.runs !== 1 ? 's' : ''}
                    {lastRun ? ` · Dernier score : ${lastRun.score}/100` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {sim.company ? (
                    <button
                      onClick={() => handleNewRun(sim.id)}
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors"
                      style={{ background: '#0A4DA8' }}
                    >
                      ▶ Lancer
                    </button>
                  ) : (
                    <Link
                      href={`/simulator/new?regenerate=${sim.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ borderColor: '#0A4DA8', color: '#0A4DA8' }}
                    >
                      Générer
                    </Link>
                  )}
                  <Link
                    href={`/simulator/${sim.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
                  >
                    Détails
                  </Link>
                  <button
                    onClick={() => handleDelete(sim.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
