import Anthropic from '@anthropic-ai/sdk';
import { selectTemplates, buildTemplateList } from './engine';
import type { SimulatorConfig, EntrepriseVirtuelle } from './types';

function buildPrompt(config: SimulatorConfig): string {
  const templates = selectTemplates(config);
  const templateList = buildTemplateList(templates);

  return `Tu es un générateur d'entreprises virtuelles pour des simulations pédagogiques OFPPT au Maroc.

Génère une entreprise fictive COMPLÈTE pour :
- Problématique / thème à traiter : « ${config.titre} »
- Filière : ${config.filiere}
- Module : ${config.module}
- Niveau : ${config.niveau}
- Durée simulation : ${config.duree}
- Difficulté : ${config.difficulte}
- Stagiaires : ${config.nbStagiaires}

ANCRAGE OBLIGATOIRE (priorité absolue, avant toute autre règle) :
1. CONTEXTE DU TITRE — Toute la simulation (description de l'entreprise, personnages, documents, problemesCles et chaque événement de arcNarratif) doit tourner autour de la problématique « ${config.titre} ». Ne t'en écarte jamais : c'est le fil conducteur du début à la fin.
2. PÉRIMÈTRE DU MODULE — Chaque situation et chaque choix doivent rester STRICTEMENT dans le périmètre du module « ${config.module} » : les tâches, décisions, documents et compétences mobilisées relèvent de ce module précis, pas d'un autre domaine. Si un événement sort du module, reformule-le pour y revenir.
3. SITUATIONS PRESQUE RÉELLES — Place le stagiaire dans des cas d'usage concrets et crédibles du métier : vraies tâches, incidents, échéances, contraintes et dilemmes qu'il rencontrera réellement en entreprise au Maroc. Bannis l'abstrait et le scolaire ; privilégie le terrain.
4. DOCUMENTS AUTHENTIQUES — Les documents joints imitent de vrais documents professionnels du module (montants en MAD, dates, références, interlocuteurs plausibles).

Types d'événements à intégrer (dans cet ordre dans arcNarratif) :
${templateList}

EXERCICES CHIFFRÉS À SAISIE LIBRE (quand le module ou le thème s'y prête : comptabilité, fiscalité, finance, gestion, facturation, paie, trésorerie) :
- Les événements de type CONTROLE_MONTANT, VERIF_ECRITURE_COMPTABLE, CONTROLE_FACTURE, CALCUL_TVA, RAPPROCHEMENT_BANCAIRE (et tout événement FINANCIER pertinent) deviennent de VRAIS exercices que le stagiaire RÉSOUT en SAISISSANT un nombre (pas de QCM).
- Pour ces événements : NE METS PAS choixA/choixB/choixC. Mets à la place un objet "exercice" (voir schéma ci-dessous) et OMETS les choix.
- "documentAttache" OBLIGATOIRE = un document comptable réaliste AVEC des montants chiffrés en MAD (lignes détaillées, taux de TVA 20 %, totaux, dates, références). Glisse PARFOIS une erreur à détecter : TVA oubliée ou mauvais taux, total faux, écriture déséquilibrée, débit/crédit inversés, arrondi erroné.
- "enonce" = la consigne précise et la question chiffrée unique (ex : « Calculez le montant TTC de la facture », « Quel est le solde du compte 514 après rapprochement ? »). La réponse doit être UN SEUL nombre.
- "reponseAttendue" = la valeur numérique exacte (nombre, sans séparateur de milliers, point décimal si besoin). "unite" = "MAD" ou "%" selon le cas. "tolerance" = écart absolu toléré (0 pour un montant exact, sinon petit, ex 1).
- "explication" = correction détaillée pas à pas pour apprendre (ex : « HT 45 000 + TVA 20 % = 9 000 → TTC 54 000 MAD »).
- impacts de l'exercice = valeurs POSITIVES (gain si le stagiaire trouve la bonne réponse), ±10 à ±20 selon la difficulté.
- Chiffres crédibles pour une PME marocaine ; cohérence absolue entre le document, l'énoncé et la reponseAttendue.
- Vise au moins 2 exercices à saisie libre quand la filière/le module est comptable ou financier. Les autres événements restent en QCM (choixA/B/C).

Schéma d'un événement EXERCICE (à la place des choix) :
  "exercice": {
    "enonce": "Consigne + question chiffrée unique",
    "reponseAttendue": 54000,
    "unite": "MAD",
    "tolerance": 0,
    "explication": "Correction détaillée du calcul",
    "impactScore": 15, "impactSatisfaction": 8, "impactFinancier": 10, "impactMoral": 6
  }

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
      "description": "Description narrative immersive, 1 paragraphe concis (3-4 phrases)",
      "contexte": "Contexte additionnel bref (1-2 phrases)",
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
- Un événement a SOIT choixA/B/C (QCM décisionnel) SOIT "exercice" (saisie libre chiffrée), jamais les deux
- choixA = meilleure décision (+), choixB = neutre (0±3), choixC = mauvaise décision (-)
- Impacts : ±5 à ±20 selon gravité
- Noms marocains réalistes (entreprises, personnes, villes)
- Reste collé à la problématique « ${config.titre} » et au module « ${config.module} » du premier au dernier événement
- problemesCles = déclinaisons concrètes de la problématique « ${config.titre} »
- Langue française
- Sois concis : descriptions courtes et efficaces, pas de remplissage. Le JSON DOIT être complet et se terminer correctement.`;
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
    max_tokens: 16000,
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
    max_tokens: 16000,
    messages: [{ role: 'user', content: buildPrompt(config) }],
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
