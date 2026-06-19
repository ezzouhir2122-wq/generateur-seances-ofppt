import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { extractReferentielFromText, ExtractedReferentiel } from "@/lib/referentiel-extractor";
import { read, utils, write } from "xlsx";

export const maxDuration = 300;

// DOMMatrix polyfill — required by pdfjs-dist (used by pdf-parse) in Node.js serverless
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as Record<string, unknown>).DOMMatrix = class {
    a=1; b=0; c=0; d=1; e=0; f=0;
    m11=1; m12=0; m13=0; m14=0; m21=0; m22=1; m23=0; m24=0;
    m31=0; m32=0; m33=1; m34=0; m41=0; m42=0; m43=0; m44=1;
    is2D=true; isIdentity=true;
    constructor(_init?: string | number[]) {}
    static fromMatrix() { return new (globalThis.DOMMatrix as new() => unknown)(); }
    inverse() { return this; } multiply() { return this; } translate() { return this; }
    scale() { return this; } rotate() { return this; } rotateAxisAngle() { return this; }
    skewX() { return this; } skewY() { return this; } flipX() { return this; } flipY() { return this; }
    transformPoint() { return { x:0, y:0, z:0, w:1 }; }
    toFloat32Array() { return new Float32Array(16); } toFloat64Array() { return new Float64Array(16); }
    toJSON() { return {}; } toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
  };
}

// ── Template Excel helpers ──────────────────────────────────────────────────

// Colonnes du modèle OFPPT (format officiel)
const TEMPLATE_HEADERS = [
  "Filière", "Niveau de formation", "N° Module",
  "Intitulé du module", "Masse horaire (h)", "Sous-élément", "Apprentissage de base",
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function col(row: Record<string, unknown>, ...names: string[]): string {
  for (const name of names) {
    const key = Object.keys(row).find(k => normalize(k) === normalize(name));
    if (key && row[key] !== undefined && row[key] !== "") return String(row[key]).trim();
  }
  return "";
}

function parseTemplateExcel(buffer: Buffer): ExtractedReferentiel | null {
  const wb = read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (rows.length === 0) return null;

  const keys = Object.keys(rows[0]).map(normalize);

  // Format OFPPT nouveau : "Niveau de formation" + "N° Module" + "Apprentissage de base"
  const isNewOfpptFormat = keys.some(k => k.includes("niveau"))
    && keys.some(k => k.includes("apprentissage"));

  // Format OFPPT ancien : "Intitulé du module" + "Apprentissage de base"
  const isOldOfpptFormat = !isNewOfpptFormat
    && keys.some(k => k.includes("intitule") || k.includes("intitulé"))
    && keys.some(k => k.includes("apprentissage"));

  const isOfpptFormat = isNewOfpptFormat || isOldOfpptFormat;

  // Format générique : secteur + filière + module + compétence
  const isGenericFormat = keys.some(k => k.includes("secteur"))
    && keys.some(k => k.includes("filiere") || k.includes("filière"))
    && keys.some(k => k.includes("module"));

  if (!isOfpptFormat && !isGenericFormat) return null;

  const result: ExtractedReferentiel = { secteur: "", filiere: "", modules: [] };
  // Track filiere per module (new format can have multiple niveaux → multiple filieres)
  const moduleFiliere = new Map<string, string>();

  for (const row of rows) {
    if (isOfpptFormat) {
      let filiere: string;
      let moduleCode: string;
      let moduleNom: string;

      if (isNewOfpptFormat) {
        // Nouveau format : Filière | Niveau de formation | N° Module | Intitulé du module | Masse horaire | Sous-élément | Apprentissage de base
        const filiereVal = col(row, "Filière", "Filiere", "filiere");
        filiere = col(row, "Niveau de formation", "Niveau de fo", "Niveau");
        moduleCode = col(row, "N° Module", "N°Module", "N° module", "N°module", "Numero Module", "No Module");
        moduleNom = col(row, "Intitulé du module", "Intitule du module", "Module");
        // Filière column → stored as secteur; Niveau de formation → stored as filière
        if (!result.secteur && filiereVal) result.secteur = filiereVal;
      } else {
        // Ancien format : Secteur | Filière | Intitulé du module | ...
        const secteur = col(row, "Secteur");
        filiere = col(row, "Filière", "Filiere");
        moduleCode = "";
        moduleNom = col(row, "Intitulé du module", "Intitule du module", "Module");
        if (!result.secteur && secteur) result.secteur = secteur;
        if (!result.filiere && filiere) result.filiere = filiere;
      }

      const mhgStr = col(row, "Masse horaire (h)", "Masse horaire", "MHG", "Masse horai");
      const mhg = mhgStr ? parseFloat(mhgStr) : undefined;
      const sousElement = col(row, "Sous-élément", "Sous-element", "Sous élément", "Sous-elemen");
      const apprentissage = col(row, "Apprentissage de base", "Apprentissage");

      if (!result.secteur) result.secteur = "OFPPT";
      if (!result.filiere && filiere) result.filiere = filiere;
      if (!result.filiere) result.filiere = "Formation";

      if (!moduleNom) continue;

      const moduleKey = moduleCode ? moduleCode.toLowerCase() : moduleNom.toLowerCase();
      let mod = result.modules.find(m =>
        (moduleCode && m.code?.toLowerCase() === moduleCode.toLowerCase()) ||
        m.nom.toLowerCase() === moduleNom.toLowerCase()
      );
      if (!mod) {
        mod = { nom: moduleNom, code: moduleCode || undefined, mhg: mhg || undefined, competences: [], sequences: [] };
        result.modules.push(mod);
        if (filiere) moduleFiliere.set(moduleKey, filiere);
      }
      if (mhg && !mod.mhg) mod.mhg = mhg;
      if (moduleCode && !mod.code) mod.code = moduleCode;

      if (!apprentissage) continue;

      const titre = sousElement ? `${sousElement} — ${apprentissage}` : apprentissage;
      if (!mod.competences!.some(c => c.titre === titre)) {
        mod.competences!.push({ titre, objectifs: [] });
      }
    } else {
      // Format générique avec toutes les colonnes
      const secteur = col(row, "Secteur");
      const filiere = col(row, "Filière", "Filiere");
      const filiereCode = col(row, "Code Filière", "Code Filiere");
      const moduleCode = col(row, "Code Module");
      const moduleNom = col(row, "Module", "Nom Module", "Intitulé module");
      const mhgStr = col(row, "MHG", "Masse Horaire");
      const mhg = mhgStr ? parseFloat(mhgStr) : undefined;
      const competenceTitre = col(row, "Compétence", "Competence");
      const objectifTitre = col(row, "Objectif");
      const critereTitre = col(row, "Critère", "Critere", "Critère de performance");

      if (!result.secteur && secteur) result.secteur = secteur;
      if (!result.filiere && filiere) result.filiere = filiere;
      if (!result.filiereCode && filiereCode) result.filiereCode = filiereCode;
      if (!moduleNom) continue;

      let mod = result.modules.find(m =>
        (moduleCode && m.code?.toLowerCase() === moduleCode.toLowerCase()) ||
        m.nom.toLowerCase() === moduleNom.toLowerCase()
      );
      if (!mod) {
        mod = { nom: moduleNom, code: moduleCode || undefined, mhg: mhg || undefined, competences: [], sequences: [] };
        result.modules.push(mod);
      }
      if (!competenceTitre) continue;

      let comp = mod.competences!.find(c => c.titre.toLowerCase() === competenceTitre.toLowerCase());
      if (!comp) { comp = { titre: competenceTitre, objectifs: [] }; mod.competences!.push(comp); }
      if (!objectifTitre) continue;

      let obj = comp.objectifs.find(o => o.titre.toLowerCase() === objectifTitre.toLowerCase());
      if (!obj) { obj = { titre: objectifTitre, criteres: [] }; comp.objectifs.push(obj); }
      if (critereTitre && !obj.criteres.includes(critereTitre)) obj.criteres.push(critereTitre);
    }
  }

  return result.modules.length > 0 ? result : null;
}

function generateTemplateExcel(): Buffer {
  const wb = utils.book_new();
  const data = [
    TEMPLATE_HEADERS,
    ["TSC", "Technicien Spécialisé", "M101", "Métier et formation", "30", "A1", "Connaître les techniques de prise de notes"],
    ["TSC", "Technicien Spécialisé", "M101", "Métier et formation", "30", "A2", "Consulter des ouvrages spécialisés"],
    ["TSC", "Technicien Spécialisé", "M101", "Métier et formation", "30", "B1", "Distinguer la nature et les exigences de l'emploi"],
    ["TSC", "Technicien Spécialisé", "M101", "Métier et formation", "30", "B2", "Décrire les conditions générales d'exercice du métier"],
    ["TSC", "Technicien Spécialisé", "M102", "Programmation Web", "80", "A1", "Analyser les besoins du projet"],
    ["TSC", "Technicien Spécialisé", "M102", "Programmation Web", "80", "A2", "Concevoir l'architecture de l'application"],
    ["TSC", "Technicien Spécialisé", "M102", "Programmation Web", "80", "B1", "Implémenter les fonctionnalités selon les spécifications"],
  ];
  const ws = utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 50 }];
  utils.book_append_sheet(wb, ws, "Référentiel");
  return Buffer.from(write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ── Text extraction (AI path) ───────────────────────────────────────────────

async function extractTextFromBuffer(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "xlsx" || ext === "xls") {
    const wb = read(buffer, { type: "buffer" });
    const lines: string[] = [];
    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      lines.push(`=== Feuille: ${name} ===`);
      rows.forEach((row) => {
        lines.push(Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(" | "));
      });
    });
    return lines.join("\n");
  }

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "docx" || ext === "doc") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "md" || ext === "markdown") {
    return buffer.toString("utf-8");
  }

  if (ext === "csv") {
    const text = buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return "";
    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
    return lines
      .slice(1)
      .map((line) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        return headers.map((h, i) => `${h}: ${cols[i] ?? ""}`).join(" | ");
      })
      .join("\n");
  }

  throw new Error("Format non supporté. Utilisez PDF, DOCX, Excel, CSV ou Markdown.");
}

// ── Fast batch save for template imports (no AI objectifs) ────────────────────
async function saveReferentielBatch(extracted: ExtractedReferentiel) {
  // Upsert filiere (secteur supprimé — stocké comme champ texte filiere)
  let filiere = await prisma.filiere.findFirst({
    where: { nom: extracted.filiere, filiere: extracted.secteur || null },
  });
  if (!filiere) filiere = await prisma.filiere.create({
    data: { nom: extracted.filiere, code: extracted.filiereCode ?? null, filiere: extracted.secteur || null },
  });

  // 3. Load all existing modules in one query
  const existingMods = await prisma.refModule.findMany({
    where: { filiereId: filiere.id },
    select: { id: true, nom: true, code: true, mhg: true },
  });
  const moduleIdMap = new Map<string, string>();
  for (const em of existingMods) {
    moduleIdMap.set((em.code ?? em.nom).toLowerCase(), em.id);
  }

  // 4. Create new modules in parallel
  const newMods = extracted.modules.filter(m => !moduleIdMap.has((m.code ?? m.nom).toLowerCase()));
  const created = await Promise.all(
    newMods.map(m => prisma.refModule.create({ data: { nom: m.nom, code: m.code ?? null, mhg: m.mhg ?? null, filiereId: filiere.id } }))
  );
  created.forEach((m, i) => moduleIdMap.set((newMods[i].code ?? newMods[i].nom).toLowerCase(), m.id));

  // 5. Load all existing competences in one query
  const allModuleIds = [...moduleIdMap.values()];
  const existingComps = await prisma.competence.findMany({
    where: { moduleId: { in: allModuleIds }, sequenceId: null },
    select: { titre: true, moduleId: true },
  });
  const existingCompSet = new Set(existingComps.map(c => `${c.moduleId}:${c.titre.toLowerCase()}`));

  // 6. Batch create all new competences in one createMany
  const compsToCreate: { titre: string; moduleId: string; sequenceId: null }[] = [];
  for (const mod of extracted.modules) {
    const moduleId = moduleIdMap.get((mod.code ?? mod.nom).toLowerCase());
    if (!moduleId) continue;
    for (const comp of mod.competences ?? []) {
      if (!existingCompSet.has(`${moduleId}:${comp.titre.toLowerCase()}`)) {
        compsToCreate.push({ titre: comp.titre, moduleId, sequenceId: null });
      }
    }
  }
  if (compsToCreate.length > 0) await prisma.competence.createMany({ data: compsToCreate });

  return { modulesCreated: newMods.length, competencesCreated: compsToCreate.length, sequencesCreated: 0, objectifsCreated: 0, criteresCreated: 0 };
}

// ── Sequential save for AI imports (has nested objectifs/criteres) ─────────────
async function saveReferentielFull(extracted: ExtractedReferentiel) {
  let filiere = await prisma.filiere.findFirst({
    where: { nom: extracted.filiere, filiere: extracted.secteur || null },
  });
  if (!filiere) filiere = await prisma.filiere.create({
    data: { nom: extracted.filiere, code: extracted.filiereCode ?? null, filiere: extracted.secteur || null },
  });

  let modulesCreated = 0, sequencesCreated = 0, competencesCreated = 0, objectifsCreated = 0, criteresCreated = 0;

  async function createCompetence(comp: { titre: string; objectifs?: { titre: string; criteres?: string[] }[] }, moduleId: string, sequenceId: string | null) {
    const competence = await prisma.competence.create({ data: { titre: comp.titre, moduleId, sequenceId } });
    competencesCreated++;
    for (const obj of comp.objectifs ?? []) {
      const objectif = await prisma.objectif.create({ data: { titre: obj.titre, competenceId: competence.id } });
      objectifsCreated++;
      for (const crit of obj.criteres ?? []) {
        await prisma.criterePerformance.create({ data: { description: crit, objectifId: objectif.id } });
        criteresCreated++;
      }
    }
  }

  for (const mod of extracted.modules ?? []) {
    let refModule = await prisma.refModule.findFirst({
      where: { filiereId: filiere.id, ...(mod.code ? { code: { equals: mod.code, mode: "insensitive" } } : { nom: { equals: mod.nom, mode: "insensitive" } }) },
    });
    if (refModule) {
      if (mod.mhg && !refModule.mhg) refModule = await prisma.refModule.update({ where: { id: refModule.id }, data: { mhg: mod.mhg } });
    } else {
      refModule = await prisma.refModule.create({ data: { nom: mod.nom, code: mod.code ?? null, mhg: mod.mhg ?? null, filiereId: filiere.id } });
      modulesCreated++;
    }
    const existingComps = await prisma.competence.findMany({ where: { moduleId: refModule.id, sequenceId: null }, select: { titre: true } });
    const existingTitles = new Set(existingComps.map(c => c.titre.toLowerCase()));
    for (const comp of mod.competences ?? []) {
      if (!existingTitles.has(comp.titre.toLowerCase())) await createCompetence(comp, refModule.id, null);
    }
    for (const seq of mod.sequences ?? []) {
      let sequence = await prisma.sequence.findFirst({ where: { moduleId: refModule.id, titre: { equals: seq.titre, mode: "insensitive" } } });
      if (!sequence) { sequence = await prisma.sequence.create({ data: { titre: seq.titre, code: seq.code ?? null, moduleId: refModule.id } }); sequencesCreated++; }
      const existingSeqComps = await prisma.competence.findMany({ where: { sequenceId: sequence.id }, select: { titre: true } });
      const existingSeqTitles = new Set(existingSeqComps.map(c => c.titre.toLowerCase()));
      for (const comp of seq.competences ?? []) {
        if (!existingSeqTitles.has(comp.titre.toLowerCase())) await createCompetence(comp, refModule.id, sequence.id);
      }
    }
  }

  return { modulesCreated, sequencesCreated, competencesCreated, objectifsCreated, criteresCreated };
}

// ── CSV parser: auto-detects ; or , separator ────────────────────────────────
function parseCsvRows(buffer: Buffer): Record<string, unknown>[] | null {
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;
  const sep = lines[0].includes(";") ? ";" : ",";

  function splitRow(line: string): string[] {
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols.map(c => c.replace(/^"|"$/g, "").trim());
  }

  const headers = splitRow(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitRow(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

// ── Markdown table parser ────────────────────────────────────────────────────
// Supports GFM tables: | Col1 | Col2 | … |
function parseMarkdownTable(buffer: Buffer): Record<string, unknown>[] | null {
  // Strip UTF-8 BOM if present
  let text = buffer.toString("utf-8");
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.split(/\r?\n/);

  function parseMdRow(line: string): string[] {
    return line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  }

  function isSeparatorRow(cells: string[]): boolean {
    return cells.length > 0 && cells.every(c => /^[-: ]+$/.test(c) && c.includes("-"));
  }

  // Collect all table lines and find the first valid header
  const allRows: Record<string, unknown>[] = [];
  let headers: string[] | null = null;
  let expectSeparator = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      // Non-table line — reset table state (new section starts)
      headers = null;
      expectSeparator = false;
      continue;
    }
    const cells = parseMdRow(trimmed);
    if (cells.length === 0) continue;

    if (headers === null) {
      // Could be a header row
      if (!isSeparatorRow(cells)) {
        headers = cells;
        expectSeparator = true;
      }
      continue;
    }

    if (expectSeparator) {
      // Next line after header must be separator
      if (isSeparatorRow(cells)) { expectSeparator = false; continue; }
      // Not a separator — treat previous line as data (no separator table)
      expectSeparator = false;
    }

    // Skip rows with same column count as separator (malformed)
    if (isSeparatorRow(cells)) { headers = null; continue; }

    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    // Only add rows that have at least one non-empty cell
    if (Object.values(row).some(v => v !== "")) allRows.push(row);
  }

  return allRows.length > 0 ? allRows : null;
}

function generateTemplateMd(): string {
  return `# Référentiel Pédagogique OFPPT

| Filière | Niveau de formation | N° Module | Intitulé du module | Masse horaire (h) | Compétences Pedagogique |
|---------|---------------------|-----------|-------------------|:-----------------:|------------------------|
| Gestion des Entreprises | 1ère Année | M101 | Métier et formation | 30 | Connaître les techniques de prise de notes |
| Gestion des Entreprises | 1ère Année | M101 | Métier et formation | 30 | Consulter des ouvrages spécialisés |
| Gestion des Entreprises | 1ère Année | M101 | Métier et formation | 30 | Distinguer la nature et les exigences de l'emploi |
| Gestion des Entreprises | 1ère Année | M102 | Communication professionnelle | 45 | Maîtriser les techniques de communication orale |
| Gestion des Entreprises | 1ère Année | M102 | Communication professionnelle | 45 | Rédiger des documents professionnels |
| GEOCF | 2ème Année | M201 | Mathématiques appliquées | 60 | Appliquer les méthodes de calcul numérique |
| GEOCF | 2ème Année | M201 | Mathématiques appliquées | 60 | Résoudre des problèmes d'optimisation |
`;
}

// ── OFPPT direct-competences format ──────────────────────────────────────────
// Columns: Filière | Niveau de formation | N° Module | Intitulé du module | Masse horaire (h) | Compétences Pedagogique
// One competence per row — groups are split by (Filière + Niveau de formation)
function parseOfpptDirectFormat(rows: Record<string, unknown>[]): ExtractedReferentiel[] | null {
  if (rows.length === 0) return null;
  const keys = Object.keys(rows[0]).map(normalize);

  const hasNiveau = keys.some(k => k.includes("niveau"));
  const hasModule = keys.some(k => k.includes("module") || k.includes("intitule") || k.includes("intitulé"));
  const hasComp = keys.some(k => k.includes("competence") || k.includes("compétence") || k.includes("pedagogique") || k.includes("pédagogique"));
  if (!hasNiveau || !hasModule || !hasComp) return null;

  const groupMap = new Map<string, ExtractedReferentiel>();
  const groupOrder: string[] = [];

  for (const row of rows) {
    const filiereVal = col(row, "Filière", "Filiere", "filiere");
    const niveauVal  = col(row, "Niveau de formation", "Niveau de fo", "Niveau de f", "Niveau");
    const mCode      = col(row, "N° Module", "N°Module", "N° module", "N°module", "Numero Module", "No Module");
    const mNom       = col(row, "Intitulé du module", "Intitule du module", "Intitulé module", "Module");
    const mhgStr     = col(row, "Masse horaire (h)", "Masse horaire", "MHG", "Masse horai");
    const mhg        = mhgStr && !isNaN(parseFloat(mhgStr)) ? parseFloat(mhgStr) : undefined;
    const compTitre  = col(
      row,
      "Compétences Pedagogique", "Competences Pedagogique",
      "Compétences Pedagogiques", "Competences Pedagogiques",
      "Compétence Pedagogique",  "Competence Pedagogique",
      "Compétences", "Competences",
    );

    if (!mNom) continue;

    const key = `${filiereVal}||${niveauVal}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { secteur: filiereVal || "OFPPT", filiere: niveauVal || "Formation", modules: [] });
      groupOrder.push(key);
    }
    const group = groupMap.get(key)!;

    let mod = group.modules.find(m =>
      (mCode && m.code?.toLowerCase() === mCode.toLowerCase()) ||
      m.nom.toLowerCase() === mNom.toLowerCase()
    );
    if (!mod) {
      mod = { nom: mNom, code: mCode || undefined, mhg, competences: [], sequences: [] };
      group.modules.push(mod);
    }
    if (mhg && !mod.mhg) mod.mhg = mhg;

    if (!compTitre) continue;
    if (!mod.competences!.some(c => c.titre === compTitre)) {
      mod.competences!.push({ titre: compTitre, objectifs: [] });
    }
  }

  const groups = groupOrder.map(k => groupMap.get(k)!).filter(g => g.modules.length > 0);
  return groups.length > 0 ? groups : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();

    let extracted: ExtractedReferentiel | null = null;
    let importMode = "ia";

    // ── Fast path 1: template Excel (Sous-élément + Apprentissage format) ──
    if (ext === "xlsx" || ext === "xls") {
      extracted = parseTemplateExcel(buffer);
      if (extracted) importMode = "template";
    }

    // ── Fast path 2: OFPPT direct-competences format (CSV or Excel) ──
    if (!extracted) {
      let rows: Record<string, unknown>[] | null = null;
      if (ext === "csv") {
        rows = parseCsvRows(buffer);
      } else if (ext === "xlsx" || ext === "xls") {
        const wb2 = read(buffer, { type: "buffer" });
        const ws2 = wb2.Sheets[wb2.SheetNames[0]];
        rows = utils.sheet_to_json<Record<string, unknown>>(ws2, { defval: "" });
      }
      if (rows && rows.length > 0) {
        const groups = parseOfpptDirectFormat(rows);
        if (groups && groups.length > 0) {
          let modulesCreated = 0, competencesCreated = 0;
          for (const group of groups) {
            const s = await saveReferentielBatch(group);
            modulesCreated += s.modulesCreated;
            competencesCreated += s.competencesCreated;
          }
          return NextResponse.json({
            success: true,
            secteur: groups[0].secteur,
            filiere: groups[0].filiere,
            importMode: "template",
            stats: { modulesCreated, competencesCreated, sequencesCreated: 0, objectifsCreated: 0, criteresCreated: 0 },
          });
        }
      }
    }

    // ── Fast path 3: Markdown table format (.md) ──
    if (!extracted && (ext === "md" || ext === "markdown")) {
      const rows = parseMarkdownTable(buffer);
      if (rows && rows.length > 0) {
        const groups = parseOfpptDirectFormat(rows);
        if (groups && groups.length > 0) {
          let modulesCreated = 0, competencesCreated = 0;
          for (const group of groups) {
            const s = await saveReferentielBatch(group);
            modulesCreated += s.modulesCreated;
            competencesCreated += s.competencesCreated;
          }
          return NextResponse.json({
            success: true, secteur: groups[0].secteur, filiere: groups[0].filiere,
            importMode: "template",
            stats: { modulesCreated, competencesCreated, sequencesCreated: 0, objectifsCreated: 0, criteresCreated: 0 },
          });
        }
      }
    }

    // ── Slow path: AI extraction (PDF, DOCX, unrecognised formats) ──
    if (!extracted) {
      const text = await extractTextFromBuffer(buffer, file.type, file.name);
      if (!text || text.trim().length < 50) return NextResponse.json({ error: "Le fichier semble vide ou illisible" }, { status: 400 });
      extracted = await extractReferentielFromText(text);
    }

    const stats = importMode === "template"
      ? await saveReferentielBatch(extracted)
      : await saveReferentielFull(extracted);

    return NextResponse.json({ success: true, secteur: extracted.secteur, filiere: extracted.filiere, importMode, stats });
  } catch (err) {
    console.error("Erreur référentiel:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur lors du traitement" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const mode = req.nextUrl.searchParams.get("mode");

  // Template Excel download
  if (mode === "template") {
    const buf = generateTemplateExcel();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modele-referentiel-ofppt.xlsx"',
      },
    });
  }

  // Template Markdown download
  if (mode === "template-md") {
    const md = generateTemplateMd();
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="modele-referentiel-ofppt.md"',
      },
    });
  }

  // Lightweight mode for the assistant — returns only filières + module names
  if (mode === "summary") {
    const filieres = await prisma.filiere.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        modules: { select: { id: true, nom: true, code: true, mhg: true }, orderBy: { nom: "asc" } },
      },
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(filieres);
  }

  if (mode === "cascade") {
    const filieres = await prisma.filiere.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        modules: {
          select: {
            id: true,
            nom: true,
            code: true,
            sequences: {
              select: {
                id: true,
                titre: true,
                code: true,
                competences: {
                  select: {
                    id: true,
                    titre: true,
                    objectifs: { select: { titre: true, criteres: { select: { description: true } } } },
                  },
                  orderBy: { titre: "asc" },
                },
              },
              orderBy: [{ ordre: "asc" }, { titre: "asc" }],
            },
            competences: {
              where: { sequenceId: null },
              select: {
                id: true,
                titre: true,
                objectifs: { select: { titre: true, criteres: { select: { description: true } } } },
              },
              orderBy: { titre: "asc" },
            },
          },
          orderBy: { nom: "asc" },
        },
      },
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(filieres);
  }

  // Lightweight list mode for sidebar — no competences/objectifs/criteres
  if (mode === "list") {
    const filieres = await prisma.filiere.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        filiere: true,
        modules: {
          select: { id: true, nom: true, code: true, mhg: true },
          orderBy: { nom: "asc" },
        },
      },
      orderBy: { nom: "asc" },
    });
    return NextResponse.json(groupFilieres(filieres));
  }

  // Default GET — grouped filieres (used by GroupeForm and other clients)
  const filieres = await prisma.filiere.findMany({
    select: { id: true, nom: true, code: true, filiere: true },
    orderBy: { nom: "asc" },
  });
  return NextResponse.json(groupFilieres(filieres));
}

// ── Group Filiere records by their filiere text field ─────────────────────────
// Produces the same { id, nom, code, filieres[] } shape previously returned by Secteur
function groupFilieres<T extends { id: string; nom: string; code: string | null; filiere: string | null }>(
  filieres: T[]
): { id: string; nom: string; code: null; filieres: T[] }[] {
  const map = new Map<string, { id: string; nom: string; code: null; filieres: T[] }>();
  for (const f of filieres) {
    const key = f.filiere ?? f.nom;
    if (!map.has(key)) map.set(key, { id: key, nom: key, code: null, filieres: [] });
    map.get(key)!.filieres.push(f);
  }
  return Array.from(map.values());
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // secteurId = filière group name (ex: "TSC") — supprime toutes les Filiere de ce groupe
  const secteurId = searchParams.get("secteurId");
  const filiereId = searchParams.get("filiereId");

  if (filiereId) {
    await prisma.filiere.delete({ where: { id: filiereId } });
  } else if (secteurId) {
    await prisma.filiere.deleteMany({ where: { filiere: secteurId } });
  } else {
    await prisma.filiere.deleteMany({});
  }

  return NextResponse.json({ success: true });
}
