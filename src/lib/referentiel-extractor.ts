import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedCompetence {
  titre: string;
  objectifs: { titre: string; criteres: string[] }[];
}

export interface ExtractedReferentiel {
  secteur: string;
  secteurCode?: string;
  filiere: string;
  filiereCode?: string;
  modules: {
    nom: string;
    code?: string;
    mhg?: number;
    competences?: ExtractedCompetence[];
    sequences?: {
      titre: string;
      code?: string;
      competences: ExtractedCompetence[];
    }[];
  }[];
}

export async function extractReferentielFromText(text: string): Promise<ExtractedReferentiel> {
  const prompt = `Tu es un expert en analyse de référentiels pédagogiques OFPPT (Office de la Formation Professionnelle et de la Promotion du Travail) au Maroc.

Analyse le document suivant et extrais la structure pédagogique complète en JSON strict.

DOCUMENT :
${text.slice(0, 12000)}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans explication) respectant exactement cette structure :
{
  "secteur": "nom du secteur (ex: Tertiaire, Industrie, BTP...)",
  "secteurCode": "code optionnel du secteur",
  "filiere": "nom de la filière (ex: Comptabilité, Gestion des Entreprises...)",
  "filiereCode": "code optionnel de la filière",
  "modules": [
    {
      "nom": "intitulé du module",
      "code": "code module (ex: M101)",
      "mhg": 120,
      "sequences": [
        {
          "titre": "intitulé de la séquence pédagogique",
          "code": "code optionnel (ex: S1)",
          "competences": [
            {
              "titre": "titre de la compétence",
              "objectifs": [
                { "titre": "titre de l'objectif", "criteres": ["critère 1", "critère 2"] }
              ]
            }
          ]
        }
      ],
      "competences": []
    }
  ]
}

Si le document découpe le module en SÉQUENCES pédagogiques, place les compétences sous leur séquence dans "sequences" et laisse "competences" vide. Si le document ne mentionne PAS de séquences, laisse "sequences" vide et place les compétences directement dans "competences".

Si une information n'est pas présente, utilise null ou un tableau vide. Extrais un maximum d'informations présentes dans le document.`;

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonStr = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(jsonStr) as ExtractedReferentiel;
}
