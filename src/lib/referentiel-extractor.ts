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

const OFPPT_PROMPT = (chunk: string, isFirstChunk: boolean) => `Tu es un expert en référentiels pédagogiques OFPPT (Maroc).
${isFirstChunk ? `
Extrais la structure pédagogique complète de ce document OFPPT en JSON strict.

RÈGLES IMPORTANTES :
- Dans les référentiels OFPPT, chaque MODULE correspond à UNE compétence principale.
- Chaque module contient des "ÉLÉMENTS DE COMPÉTENCE" notés A., B., C., D., E. etc. — ce sont les compétences à extraire.
- Les objectifs et critères de performance viennent après chaque élément.
- Les codes modules sont au format M101, GECF-04, etc.
` : `
Ce document est la suite d'un référentiel OFPPT. Extrais les modules et compétences présents dans ce passage en suivant les mêmes règles.
`}
DOCUMENT :
${chunk}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans explication) :
{
  "secteur": "nom du secteur",
  "secteurCode": "code ou null",
  "filiere": "nom de la filière",
  "filiereCode": "code ou null",
  "modules": [
    {
      "nom": "intitulé du module (= titre de la compétence principale)",
      "code": "code module ex: M101 ou GECF-04",
      "mhg": 120,
      "sequences": [],
      "competences": [
        {
          "titre": "A. Premier élément de compétence",
          "objectifs": [
            { "titre": "objectif 1", "criteres": ["critère 1", "critère 2"] }
          ]
        },
        {
          "titre": "B. Deuxième élément de compétence",
          "objectifs": []
        }
      ]
    }
  ]
}

Si le module est découpé en SÉQUENCES, utilise "sequences" au lieu de "competences".
Si une information manque, utilise null ou []. Extrais TOUS les éléments de compétence (A, B, C...) présents.`;

function splitIntoChunks(text: string, size = 40000): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    // Essaye de couper sur un saut de ligne pour ne pas couper au milieu d'une phrase
    let end = Math.min(i + size, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      if (nl > i + size * 0.7) end = nl + 1;
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

async function extractChunk(chunk: string, isFirst: boolean): Promise<ExtractedReferentiel> {
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8192,
    messages: [{ role: "user", content: OFPPT_PROMPT(chunk, isFirst) }],
  });
  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Réponse JSON invalide");
  return JSON.parse(raw.slice(start, end + 1)) as ExtractedReferentiel;
}

export async function extractReferentielFromText(text: string): Promise<ExtractedReferentiel> {
  const chunks = splitIntoChunks(text, 40000);

  // Premier chunk : structure complète (secteur, filière, modules)
  const first = await extractChunk(chunks[0], true);

  // Chunks suivants : fusionne les modules supplémentaires
  for (let i = 1; i < chunks.length; i++) {
    try {
      const extra = await extractChunk(chunks[i], false);
      if (extra.modules?.length) {
        // Fusionne les modules du chunk suivant dans le premier résultat
        for (const newMod of extra.modules) {
          const existing = first.modules.find(
            (m) => m.code && newMod.code && m.code.toLowerCase() === newMod.code.toLowerCase()
          );
          if (existing) {
            // Ajoute les compétences manquantes au module existant
            if (!existing.competences) existing.competences = [];
            for (const c of newMod.competences ?? []) {
              if (!existing.competences.some((ec) => ec.titre === c.titre)) {
                existing.competences.push(c);
              }
            }
          } else {
            first.modules.push(newMod);
          }
        }
      }
    } catch {
      // Chunk suivant illisible, on continue
    }
  }

  return first;
}
