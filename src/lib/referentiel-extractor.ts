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

// Tool schema — forces Claude to return valid structured JSON with no syntax errors.
const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_referentiel",
  description: "Extrait la structure pédagogique d'un référentiel OFPPT",
  input_schema: {
    type: "object",
    properties: {
      secteur: { type: "string" },
      secteurCode: { type: "string" },
      filiere: { type: "string" },
      filiereCode: { type: "string" },
      modules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nom: { type: "string" },
            code: { type: "string" },
            mhg: { type: "number" },
            competences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  objectifs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        titre: { type: "string" },
                        criteres: { type: "array", items: { type: "string" } },
                      },
                      required: ["titre", "criteres"],
                    },
                  },
                },
                required: ["titre", "objectifs"],
              },
            },
            sequences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  code: { type: "string" },
                  competences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        titre: { type: "string" },
                        objectifs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              titre: { type: "string" },
                              criteres: { type: "array", items: { type: "string" } },
                            },
                            required: ["titre", "criteres"],
                          },
                        },
                      },
                      required: ["titre", "objectifs"],
                    },
                  },
                },
                required: ["titre", "code", "competences"],
              },
            },
          },
          required: ["nom", "code", "mhg", "competences", "sequences"],
        },
      },
    },
    required: ["secteur", "secteurCode", "filiere", "filiereCode", "modules"],
  },
};

const OFPPT_PROMPT = (chunk: string, isFirstChunk: boolean) =>
  `Tu es un expert en référentiels pédagogiques OFPPT (Maroc).
${
  isFirstChunk
    ? `Extrais la structure pédagogique complète de ce document OFPPT.

RÈGLES :
- Chaque MODULE correspond à UNE compétence principale.
- Les "ÉLÉMENTS DE COMPÉTENCE" notés A., B., C., D., E. etc. sont les compétences à extraire.
- Les objectifs et critères de performance viennent après chaque élément.
- Les codes modules sont au format M101, GECF-04, etc.`
    : `Ce document est la suite d'un référentiel OFPPT. Extrais les modules et compétences présents en suivant les mêmes règles. Pour secteur/filière, reprends les mêmes valeurs si non mentionnées.`
}

DOCUMENT :
${chunk}

Utilise l'outil extract_referentiel. Pour les champs code/secteurCode/filiereCode inconnus, utilise une chaîne vide. Pour mhg inconnu, utilise 0.`;

function splitIntoChunks(text: string, size = 12000): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
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
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_referentiel" },
    messages: [{ role: "user", content: OFPPT_PROMPT(chunk, isFirst) }],
  });

  const toolBlock = message.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Aucune réponse structurée reçue de l'IA");
  }

  const result = toolBlock.input as ExtractedReferentiel;
  // Normalize empty strings back to undefined for optional code fields
  if (!result.secteurCode) result.secteurCode = undefined;
  if (!result.filiereCode) result.filiereCode = undefined;
  for (const mod of result.modules ?? []) {
    if (!mod.code) mod.code = undefined;
    if (!mod.mhg) mod.mhg = undefined;
    if (!mod.competences) mod.competences = [];
    if (!mod.sequences) mod.sequences = [];
  }
  return result;
}

function mergeInto(base: ExtractedReferentiel, extra: ExtractedReferentiel) {
  for (const newMod of extra.modules ?? []) {
    const existing = base.modules.find(
      (m) => m.code && newMod.code && m.code.toLowerCase() === newMod.code.toLowerCase()
    );
    if (existing) {
      if (!existing.competences) existing.competences = [];
      for (const c of newMod.competences ?? []) {
        if (!existing.competences.some((ec) => ec.titre === c.titre)) {
          existing.competences.push(c);
        }
      }
    } else {
      base.modules.push(newMod);
    }
  }
}

export async function extractReferentielFromText(text: string): Promise<ExtractedReferentiel> {
  const chunks = splitIntoChunks(text, 8000);

  // First chunk sequential — establishes secteur/filière
  const first = await extractChunk(chunks[0], true);

  if (chunks.length === 1) return first;

  // Remaining chunks in parallel batches
  const CONCURRENCY = 5;
  for (let i = 1; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((chunk) => extractChunk(chunk, false))
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.modules?.length) {
        mergeInto(first, result.value);
      }
    }
  }

  return first;
}
