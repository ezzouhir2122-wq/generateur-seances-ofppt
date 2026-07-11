import Anthropic from '@anthropic-ai/sdk';
import type { EntrepriseVirtuelle } from './types';

export interface ReportInput {
  entreprise: EntrepriseVirtuelle;
  decisions: Array<{
    ordre: number;
    titre: string;
    choixSelectionne: string;
    choixLabel: string;
    consequences: string;
    impactScore: number;
  }>;
  scoresFinal: {
    score: number;
    satisfactionClient: number;
    santeFinanciere: number;
    moralEquipe: number;
  };
  competencesCiblees: string[];
  difficulte: string;
}

export interface ReportData {
  pointsForts: string[];
  erreurs: string[];
  competencesMaitrisees: string[];
  competencesADevelopper: string[];
  conseils: string;
  planAmelioration: string;
  note: number;
  justification: string;
}

function buildReportPrompt(input: ReportInput): string {
  const decisionsText = input.decisions
    .map(d => `Événement ${d.ordre}: "${d.titre}" → Choix ${d.choixSelectionne} (${d.choixLabel}) | Impact: ${d.impactScore > 0 ? '+' : ''}${d.impactScore}`)
    .join('\n');

  const noteBase = Math.round(input.scoresFinal.score * 0.2);

  return `Tu es un évaluateur pédagogique OFPPT. Analyse cette simulation professionnelle.

ENTREPRISE : ${input.entreprise.nom} (${input.entreprise.secteur})

DÉCISIONS :
${decisionsText}

SCORES FINAUX :
- Score global : ${input.scoresFinal.score}/100
- Satisfaction client : ${input.scoresFinal.satisfactionClient}/100
- Santé financière : ${input.scoresFinal.santeFinanciere}/100
- Moral équipe : ${input.scoresFinal.moralEquipe}/100

COMPÉTENCES CIBLÉES : ${input.competencesCiblees.join(', ') || 'Non spécifiées'}
DIFFICULTÉ : ${input.difficulte}

Génère un rapport d'évaluation en JSON valide (sans markdown) :

{
  "pointsForts": ["3 points forts observés"],
  "erreurs": ["2-3 erreurs ou décisions sous-optimales"],
  "competencesMaitrisees": ["Compétences démontrées"],
  "competencesADevelopper": ["Compétences à améliorer"],
  "conseils": "Conseils détaillés en 3-4 paragraphes",
  "planAmelioration": "Plan concret en 4-5 étapes numérotées",
  "note": ${noteBase},
  "justification": "Justification de la note en 2-3 phrases"
}

La note /20 doit être cohérente avec le score ${input.scoresFinal.score}/100 (base ≈${noteBase}/20, ajustée selon qualité des décisions).`;
}

export async function generateReport(
  input: ReportInput,
  apiKey: string,
  model = 'claude-sonnet-4-6'
): Promise<ReportData> {
  const client = new Anthropic({ apiKey });
  let fullText = '';
  const stream = await client.messages.create({
    model,
    max_tokens: 3000,
    messages: [{ role: 'user', content: buildReportPrompt(input) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }
  const clean = fullText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean) as ReportData;
}
