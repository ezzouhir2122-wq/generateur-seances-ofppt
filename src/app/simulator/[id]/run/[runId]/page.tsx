'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Choix {
  label: string;
  description: string;
  consequences: string;
  impactScore: number;
  impactSatisfaction: number;
  impactFinancier: number;
  impactMoral: number;
}

interface Decision {
  choixSelectionne: string;
  consequences: string;
  impactScore: number;
}

interface RunEvent {
  id: string;
  ordre: number;
  templateType: string;
  titre: string;
  description: string;
  contexte: string;
  personnageImplique: string;
  documentAttache: string | null;
  choixA: Choix;
  choixB: Choix;
  choixC: Choix;
  decision: Decision | null;
}

interface RunState {
  id: string;
  status: string;
  score: number;
  satisfactionClient: number;
  santeFinanciere: number;
  moralEquipe: number;
  evenementCourant: number;
  events: RunEvent[];
}

interface SimInfo {
  titre: string;
  company: { nom: string; secteur: string } | null;
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function GamePage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<RunState | null>(null);
  const [simInfo, setSimInfo] = useState<SimInfo | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [lastConsequence, setLastConsequence] = useState('');
  const [showDoc, setShowDoc] = useState(false);
  const [eventStartTime, setEventStartTime] = useState(Date.now());

  const currentEvent = run?.events[run.evenementCourant] ?? null;
  const totalEvents = run?.events.length ?? 0;
  const isLastDone = run?.status === 'TERMINE';

  const fetchRun = useCallback(async () => {
    const [runRes, simRes] = await Promise.all([
      fetch(`/api/simulator/${id}/runs/${runId}`),
      fetch(`/api/simulator/${id}`),
    ]);
    const [runData, simData] = await Promise.all([runRes.json(), simRes.json()]);
    setRun(runData);
    setSimInfo({ titre: simData.titre, company: simData.company });
    setEventStartTime(Date.now());
  }, [id, runId]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  async function handleDecide(choixSelectionne: 'A' | 'B' | 'C') {
    if (!currentEvent || deciding) return;
    setDeciding(true);
    const tempsReponse = Math.round((Date.now() - eventStartTime) / 1000);

    const res = await fetch(`/api/simulator/${id}/runs/${runId}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: currentEvent.id, choixSelectionne, tempsReponse }),
    });
    const data = await res.json();

    setLastConsequence(data.decision.consequences);
    await fetchRun();
    setDeciding(false);
    setEventStartTime(Date.now());
  }

  async function handlePause() {
    await fetch(`/api/simulator/${id}/runs/${runId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAUSE' }),
    });
    router.push(`/simulator/${id}`);
  }

  if (!run || !simInfo) return <div className="flex items-center justify-center h-screen text-gray-400">Chargement...</div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10" style={{ background: '#003087' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <div className="flex-1">
            <div className="text-white font-bold text-lg">{simInfo.company?.nom ?? simInfo.titre}</div>
            <div className="text-blue-200 text-xs">{simInfo.company?.secteur}</div>
          </div>
          <div className="flex gap-4 flex-1">
            <Gauge label="Satisfaction client" value={run.satisfactionClient} color="#22C55E" />
            <Gauge label="Santé financière" value={run.santeFinanciere} color="#3B82F6" />
            <Gauge label="Moral équipe" value={run.moralEquipe} color="#F59E0B" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white">{run.score}</div>
            <div className="text-blue-200 text-xs">Score · Évent. {Math.min(run.evenementCourant + 1, totalEvents)}/{totalEvents}</div>
          </div>
          <button onClick={handlePause} className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded border border-white/20">
            ⏸ Pause
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {isLastDone ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl">🏁</div>
            <div className="text-white text-2xl font-bold">Simulation terminée !</div>
            <div className="text-gray-400">Score final : {run.score}/100</div>
            <div className="flex gap-3 mt-2">
              <Link
                href={`/simulator/${id}/run/${runId}/rapport`}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white"
                style={{ background: '#0A4DA8' }}
              >
                Voir le rapport IA
              </Link>
              <Link
                href={`/simulator/${id}`}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-600 text-gray-300"
              >
                Retour
              </Link>
            </div>
          </div>
        ) : currentEvent ? (
          <div className="grid grid-cols-3 gap-8">
            {/* Event + Choices */}
            <div className="col-span-2 space-y-5">
              {lastConsequence && (
                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-5 py-3 text-yellow-200 text-sm">
                  <span className="font-bold">Conséquences : </span>{lastConsequence}
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-white/10">
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">
                      {currentEvent.templateType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white font-bold text-xl">{currentEvent.titre}</div>
                    <div className="text-blue-200 text-sm">{currentEvent.personnageImplique}</div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{currentEvent.description}</p>
                {currentEvent.contexte && (
                  <p className="text-gray-400 text-xs mt-3 leading-relaxed border-t border-white/10 pt-3">{currentEvent.contexte}</p>
                )}
                {currentEvent.documentAttache && (
                  <button
                    onClick={() => setShowDoc(true)}
                    className="mt-3 text-xs text-blue-300 hover:text-blue-200 underline"
                  >
                    📄 Voir le document
                  </button>
                )}
              </div>

              {!currentEvent.decision ? (
                <div className="space-y-3">
                  <div className="text-gray-400 text-sm font-medium">Quelle décision prenez-vous ?</div>
                  {(['A', 'B', 'C'] as const).map(letter => {
                    const choix = currentEvent[`choix${letter}` as 'choixA' | 'choixB' | 'choixC'];
                    return (
                      <button
                        key={letter}
                        onClick={() => handleDecide(letter)}
                        disabled={deciding}
                        className="w-full text-left p-5 rounded-xl border-2 transition-all disabled:opacity-50 hover:border-blue-500 hover:bg-blue-900/20"
                        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 text-white"
                            style={{ background: '#0A4DA8' }}
                          >
                            {letter}
                          </span>
                          <div>
                            <div className="text-white font-semibold text-sm">{choix.label}</div>
                            <div className="text-gray-400 text-xs mt-0.5">{choix.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                  <div className="text-green-300 text-sm font-semibold mb-1">
                    Choix {currentEvent.decision.choixSelectionne} sélectionné
                  </div>
                  <div className="text-gray-300 text-sm">{currentEvent.decision.consequences}</div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-gray-400 text-xs font-bold uppercase mb-3">Historique</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {run.events
                    .filter(ev => ev.decision)
                    .map(ev => (
                      <div key={ev.id} className="text-xs border-b border-white/5 pb-2">
                        <div className="text-gray-300 font-medium truncate">{ev.titre}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-gray-500">Choix {ev.decision!.choixSelectionne}</span>
                          <span className={ev.decision!.impactScore >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {ev.decision!.impactScore > 0 ? '+' : ''}{ev.decision!.impactScore}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Document modal */}
      {showDoc && currentEvent?.documentAttache && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
          onClick={() => setShowDoc(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-gray-900">Document</div>
              <button onClick={() => setShowDoc(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{currentEvent.documentAttache}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
