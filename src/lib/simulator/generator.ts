import Anthropic from '@anthropic-ai/sdk';
import { selectTemplates, buildTemplateList } from './engine';
import type { SimulatorConfig, EntrepriseVirtuelle } from './types';

function buildPrompt(config: SimulatorConfig): string {
  const templates = selectTemplates(config);
  const templateList = buildTemplateList(templates);

  return `Tu es un générateur d'entreprises virtuelles pour des simulations pédagogiques OFPPT au Maroc.

Génère une entreprise fictive COMPLÈTE pour :
- Filière : ${config.filiere}
- Module : ${config.module}
- Niveau : ${config.niveau}
- Durée simulation : ${config.duree}
- Difficulté : ${config.difficulte}
- Stagiaires : ${config.nbStagiaires}

Types d'événements à intégrer (dans cet ordre dans arcNarratif) :
${templateList}

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte avant/après) :

{
  "nom": "Nom entreprise marocaine fictive",
  "secteur": "Secteur lié à ${config.filiere}",
  "description": "Description 3-4 phrases",
  "contexteEconomique": "Contexte économique 2-3 phrases",
  "organigramme": {"postes": [{"titre": "...", "responsable": "Prénom Nom"}]},
  "personnages": [
    {
      "nom": "Prénom Nom",
      "fonction": "Fonction",
      "personnalite": "Description personnalité",
      "objectifs": "Objectifs professionnels",
      "styleCommunication": "Style de communication",
      "niveauExigence": "MOYEN"
    }
  ],
  "clients": [{"nom": "...", "type": "CLIENT", "description": "...", "relation": "..."}],
  "fournisseurs": [{"nom": "...", "type": "FOURNISSEUR", "description": "...", "relation": "..."}],
  "documents": [{"type": "Facture", "titre": "...", "contenu": "..."}],
  "problemesCles": ["Problème 1", "Problème 2"],
  "arcNarratif": [
    {
      "ordre": 1,
      "templateType": "TYPE_EXACT_DU_TEMPLATE",
      "titre": "Titre événement",
      "description": "Description narrative immersive 2-3 paragraphes",
      "contexte": "Contexte additionnel",
      "personnageImplique": "Nom du personnage",
      "documentAttache": "Contenu document si applicable (sinon omettre)",
      "choixA": {"label": "A — Courte étiquette", "description": "Description choix A", "consequences": "Conséquences si A choisi", "impactScore": 15, "impactSatisfaction": 10, "impactFinancier": 8, "impactMoral": 10},
      "choixB": {"label": "B — ...", "description": "...", "consequences": "...", "impactScore": 0, "impactSatisfaction": 0, "impactFinancier": 0, "impactMoral": 0},
      "choixC": {"label": "C — ...", "description": "...", "consequences": "...", "impactScore": -15, "impactSatisfaction": -10, "impactFinancier": -8, "impactMoral": -10}
    }
  ]
}

Règles :
- 5-6 personnages ; 3-4 clients ; 2-3 fournisseurs ; 2-3 documents
- ${templates.length} événements dans arcNarratif
- choixA = meilleure décision (+), choixB = neutre (0±3), choixC = mauvaise décision (-)
- Impacts : ±5 à ±20 selon gravité
- Noms marocains réalistes (entreprises, personnes, villes)
- Filière et module intégrés dans le contexte
- Langue française`;
}

function parseJson(raw: string): EntrepriseVirtuelle {
  const clean = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean) as EntrepriseVirtuelle;
}

export async function generateEntreprise(
  config: SimulatorConfig,
  apiKey: string,
  model = 'claude-sonnet-4-6'
): Promise<EntrepriseVirtuelle> {
  const client = new Anthropic({ apiKey });
  let fullText = '';
  const stream = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(config) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
    }
  }
  return parseJson(fullText);
}

export async function* streamGenerate(
  config: SimulatorConfig,
  apiKey: string,
  model = 'claude-sonnet-4-6'
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(config) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
