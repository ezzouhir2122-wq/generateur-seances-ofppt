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

function sanitizeJson(str: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\" && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      if (code < 0x20) { result += " "; continue; }
    }
    result += ch;
  }
  return result;
}

// Repairs JSON truncated by a max_tokens cutoff by closing unclosed structures.
function repairTruncatedJson(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  let result = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    result += ch;
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" && stack[stack.length - 1] === "{") stack.pop();
      else if (ch === "]" && stack[stack.length - 1] === "[") stack.pop();
    }
  }

  if (inString) result += '"';
  // Remove trailing comma left by a truncated array element
  result = result.replace(/,\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) {
    result += stack[i] === "{" ? "}" : "]";
  }
  return result;
}

async function extractChunk(chunk: string, isFirst: boolean): Promise<ExtractedReferentiel> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: OFPPT_PROMPT(chunk, isFirst) }],
  });
  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const start = raw.indexOf("{");
  if (start === -1) throw new Error("Réponse JSON invalide");

  // Use full string from { onward so truncated responses can be repaired
  const end = raw.lastIndexOf("}");
  const jsonCandidate = end > start ? raw.slice(start, end + 1) : raw.slice(start);
  const sanitized = sanitizeJson(jsonCandidate);

  try {
    return JSON.parse(sanitized) as ExtractedReferentiel;
  } catch {
    // Response was likely truncated at max_tokens — repair and retry
    const repaired = repairTruncatedJson(sanitized);
    return JSON.parse(repaired) as ExtractedReferentiel;
  }
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
  const chunks = splitIntoChunks(text, 15000);

  // Premier chunk séquentiel pour obtenir secteur/filière
  const first = await extractChunk(chunks[0], true);

  if (chunks.length === 1) return first;

  // Chunks suivants en parallèle (max 6 simultanés)
  const CONCURRENCY = 6;
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
