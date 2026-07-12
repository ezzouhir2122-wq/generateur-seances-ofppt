'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Filiere {
  id: string;
  nom: string;
  filiere: string | null;
  modules: Array<{ id: string; nom: string; code: string | null }>;
}

const NIVEAUX = ['1ère Année', '2ème Année', 'Technicien', 'Technicien Spécialisé'];
const DUREES = ['1h', '2h', '3h', '4h+'];
const DIFFICULTES = [
  { value: 'DEBUTANT', label: 'Débutant', color: '#22C55E' },
  { value: 'INTERMEDIAIRE', label: 'Intermédiaire', color: '#F59E0B' },
  { value: 'AVANCE', label: 'Avancé', color: '#EF4444' },
];

export default function NewSimulationPage() {
  const router = useRouter();
  const streamRef = useRef<HTMLDivElement>(null);

  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [form, setForm] = useState({
    titre: '',
    filiere: '',
    filiereId: '',
    module: '',
    moduleId: '',
    niveau: NIVEAUX[0],
    duree: '2h',
    nbStagiaires: 20,
    difficulte: 'INTERMEDIAIRE',
    competencesCiblees: [] as string[],
  });
  const [step, setStep] = useState<'form' | 'generating' | 'done'>('form');
  const [streamText, setStreamText] = useState('');
  const [simulationId, setSimulationId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/referentiel/structure')
      .then(r => r.json())
      .then((data) => {
        // L'API renvoie { secteurs: [{ filieres: [{ id, nom, filiere, modules }] }] }
        // On aplatit en liste plate de filières pour le dropdown.
        const flat: Filiere[] = Array.isArray(data)
          ? data
          : (data?.secteurs ?? []).flatMap((s: { filieres?: Filiere[] }) => s.filieres ?? []);
        setFilieres(flat);
      })
      .catch(() => setFilieres([]));
  }, []);

  const selectedFiliere = filieres.find(f => f.id === form.filiereId);

  async function handleGenerate() {
    if (!form.titre || !form.filiere) { setError('Titre et filière requis'); return; }
    setError('');
    setStep('generating');
    setStreamText('');

    const createRes = await fetch('/api/simulator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: form.titre,
        filiere: form.filiere,
        module: form.module,
        niveau: form.niveau,
        duree: form.duree,
        nbStagiaires: form.nbStagiaires,
        difficulte: form.difficulte,
        competencesCiblees: form.competencesCiblees,
      }),
    });
    const sim = await createRes.json();
    if (!createRes.ok || !sim?.id) {
      setError(sim?.error ?? 'Impossible de créer la simulation.');
      setStep('form');
      return;
    }
    setSimulationId(sim.id);

    const response = await fetch('/api/simulator/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulationId: sim.id,
        filiere: form.filiere,
        module: form.module,
        niveau: form.niveau,
        duree: form.duree,
        nbStagiaires: form.nbStagiaires,
        difficulte: form.difficulte,
        competencesCiblees: form.competencesCiblees,
      }),
    });

    if (!response.ok || !response.body) {
      setError('Le service de génération est indisponible. Réessayez.');
      setStep('form');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accum = '';
    let finished = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accum += chunk;
      if (accum.includes('[[DONE]]')) {
        setStep('done');
        finished = true;
        break;
      }
      if (accum.includes('[[ERROR]]')) {
        setError(accum.split('[[ERROR]]')[1] ?? 'Erreur génération');
        setStep('form');
        finished = true;
        break;
      }
      setStreamText(accum);
      if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }

    // Le stream s'est terminé sans marqueur [[DONE]]/[[ERROR]] : génération
    // interrompue (timeout serveur). On sort de l'état bloqué "generating".
    if (!finished) {
      setError('La génération a été interrompue (délai dépassé). Réessayez avec une difficulté plus simple.');
      setStep('form');
    }
  }

  async function handleLaunch() {
    const runRes = await fetch(`/api/simulator/${simulationId}/runs`, { method: 'POST' });
    const run = await runRes.json();
    router.push(`/simulator/${simulationId}/run/${run.id}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#003087' }}>Nouvelle simulation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la simulation</label>
            <input
              type="text"
              value={form.titre}
              onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
              placeholder="Ex: Comptabilité PME — Cas pratique"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
            <select
              value={form.filiereId}
              onChange={e => {
                const f = filieres.find(x => x.id === e.target.value);
                setForm(p => ({ ...p, filiereId: e.target.value, filiere: f ? `${f.filiere ?? f.nom}` : '', module: '', moduleId: '' }));
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Sélectionner une filière</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.filiere ?? f.nom}</option>
              ))}
            </select>
          </div>

          {selectedFiliere && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select
                value={form.moduleId}
                onChange={e => {
                  const m = selectedFiliere.modules.find(x => x.id === e.target.value);
                  setForm(p => ({ ...p, moduleId: e.target.value, module: m?.nom ?? '' }));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sélectionner un module</option>
                {selectedFiliere.modules.map(m => (
                  <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ''}{m.nom}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={form.niveau}
                onChange={e => setForm(p => ({ ...p, niveau: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {NIVEAUX.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
              <select
                value={form.duree}
                onChange={e => setForm(p => ({ ...p, duree: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {DUREES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de stagiaires : <span className="font-bold" style={{ color: '#0A4DA8' }}>{form.nbStagiaires}</span>
            </label>
            <input
              type="range" min={5} max={35} value={form.nbStagiaires}
              onChange={e => setForm(p => ({ ...p, nbStagiaires: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté</label>
            <div className="flex gap-2">
              {DIFFICULTES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setForm(p => ({ ...p, difficulte: d.value }))}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: form.difficulte === d.value ? d.color : '#E5E7EB',
                    background: form.difficulte === d.value ? d.color + '20' : 'white',
                    color: form.difficulte === d.value ? d.color : '#6B7280',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

          <button
            onClick={handleGenerate}
            disabled={step === 'generating'}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-60"
            style={{ background: '#0A4DA8' }}
          >
            {step === 'generating' ? '⏳ Génération en cours...' : '🏢 Générer l\'entreprise virtuelle'}
          </button>
        </div>

        {/* Right: Streaming output */}
        <div
          className="bg-gray-950 rounded-xl p-5 min-h-[400px] flex flex-col"
          style={{ fontFamily: 'monospace' }}
        >
          {step === 'form' && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center">
              <div>
                <div className="text-3xl mb-3">🏢</div>
                <div>L&apos;entreprise virtuelle apparaîtra ici</div>
              </div>
            </div>
          )}
          {step === 'generating' && (
            <>
              <div className="text-green-400 text-xs mb-3 font-semibold">⚡ Génération en streaming...</div>
              <div
                ref={streamRef}
                className="flex-1 overflow-y-auto text-green-300 text-xs leading-relaxed whitespace-pre-wrap"
              >
                {streamText}
                <span className="animate-pulse">▋</span>
              </div>
            </>
          )}
          {step === 'done' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="text-4xl">✅</div>
              <div className="text-white font-semibold">Entreprise générée avec succès !</div>
              <div className="text-gray-400 text-sm text-center">
                L&apos;entreprise virtuelle et ses scénarios sont prêts.
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleLaunch}
                  className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm"
                  style={{ background: '#0A4DA8' }}
                >
                  ▶ Lancer la simulation
                </button>
                <button
                  onClick={() => router.push(`/simulator/${simulationId}`)}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-200 text-gray-700"
                >
                  Voir les détails
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
