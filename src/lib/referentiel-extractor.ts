import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedReferentiel {
  secteur: string;
  secteurCode?: string;
  filiere: string;
  filiereCode?: string;
  modules: {
    nom: string;
    code?: string;
    mhg?: number;
    competences: {
      titre: string;
      objectifs: {
        titre: string;
        criteres: string[];
      }[];
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
      "competences": [
        {
          "titre": "titre de la compétence",
          "objectifs": [
            {
              "titre": "titre de l'objectif",
              "criteres": ["critère de performance 1", "critère 2"]
            }
          ]
        }
      ]
    }
  ]
}

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
