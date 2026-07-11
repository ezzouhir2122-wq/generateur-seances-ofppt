'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Report {
  pointsForts: string[];
  erreurs: string[];
  competencesMaitrisees: string[];
  competencesADevelopper: string[];
  conseils: string;
  planAmelioration: string;
  note: number;
  justification: string;
}

interface RunSummary {
  score: number;
  satisfactionClient: number;
  santeFinanciere: number;
  moralEquipe: number;
  tempsTotal: number;
  events: Array<{ decision: { choixSelectionne: string } | null }>;
  report: Report | null;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{score}</text>
      <text x="50" y="66" textAnchor="middle" fontSize="9" fill="#9CA3AF">/100</text>
    </svg>
  );
}

export default function RapportPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const runRes = await fetch(`/api/simulator/${id}/runs/${runId}`);
      const runData: RunSummary = await runRes.json();
      setRunSummary(runData);
      if (runData.report) {
        setReport(runData.report);
      }
      setLoading(false);
    })();
  }, [id, runId]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch(`/api/simulator/${id}/runs/${runId}/report`, { method: 'POST' });
    const data = await res.json();
    setReport(data);
    setGenerating(false);
  }

  const noteColor = report ? (report.note >= 14 ? '#22C55E' : report.note >= 10 ? '#F59E0B' : '#EF4444') : '#6B7280';

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link href={`/simulator/${id}`} className="text-sm text-blue-600 hover:underline">← Simulation</Link>
        <h1 className="text-2xl font-bold mt-1" style={{ color: '#003087' }}>Rapport d&apos;évaluation IA</h1>
      </div>

      {/* Stats */}
      {runSummary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <ScoreCircle score={runSummary.score} />
            <div className="text-xs text-gray-500 mt-1">Score global</div>
          </div>
          {[
            { label: 'Satisfaction', value: runSummary.satisfactionClient, color: '#22C55E' },
            { label: 'Finances', value: runSummary.santeFinanciere, color: '#3B82F6' },
            { label: 'Équipe', value: runSummary.moralEquipe, color: '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center">
              <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              <div className="text-xs text-gray-400">/100</div>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      {report && (
        <div className="bg-white rounded-xl border-2 p-6 flex items-center gap-6" style={{ borderColor: noteColor }}>
          <div className="text-6xl font-black" style={{ color: noteColor }}>{report.note}</div>
          <div>
            <div className="text-sm text-gray-500 font-medium">Note /20</div>
            <p className="text-sm text-gray-700 mt-1">{report.justification}</p>
          </div>
        </div>
      )}

      {!report && !generating && (
        <div className="text-center py-8 bg-blue-50 rounded-xl border border-blue-200">
          <div className="text-gray-600 mb-3">Le rapport IA n&apos;a pas encore été généré.</div>
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm"
            style={{ background: '#0A4DA8' }}
          >
            Générer le rapport IA
          </button>
        </div>
      )}

      {generating && (
        <div className="text-center py-8">
          <div className="text-gray-500">⏳ Génération du rapport en cours...</div>
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-green-700 mb-3">✅ Points forts</h3>
              <ul className="space-y-1">
                {report.pointsForts.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500">•</span>{p}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-red-700 mb-3">⚠ Erreurs / Décisions faibles</h3>
              <ul className="space-y-1">
                {report.erreurs.map((e, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-400">•</span>{e}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-blue-700 mb-3">🎯 Compétences maîtrisées</h3>
              <div className="flex flex-wrap gap-2">
                {report.competencesMaitrisees.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{c}</span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold mb-3" style={{ color: '#E8651A' }}>📈 À développer</h3>
              <div className="flex flex-wrap gap-2">
                {report.competencesADevelopper.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#FFF3EC', color: '#E8651A' }}>{c}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-3">💡 Conseils</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.conseils}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-3">📋 Plan d&apos;amélioration</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.planAmelioration}</p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/simulator/${id}`}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700"
            >
              ← Retour
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#003087' }}
            >
              🖨 Imprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
