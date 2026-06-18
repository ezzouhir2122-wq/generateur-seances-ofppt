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

const TEMPLATE_HEADERS = ["Secteur", "Filière", "Code Filière", "Code Module", "Module", "MHG", "Compétence", "Objectif", "Critère"];

function normalize(s: string) {
  return s.toLowerCase().replace(/[̀-ͯ]/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
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
  const isTemplate = ["secteur", "filiere", "module"].every(k => keys.some(r => r.includes(k)));
  if (!isTemplate) return null;

  const result: ExtractedReferentiel = { secteur: "", filiere: "", modules: [] };

  for (const row of rows) {
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

  return result.secteur && result.filiere && result.modules.length > 0 ? result : null;
}

function generateTemplateExcel(): Buffer {
  const wb = utils.book_new();
  const data = [
    TEMPLATE_HEADERS,
    ["Informatique et Digital", "Développement Digital", "DD", "M101", "Programmation Orientée Objet", "80",
      "Analyser les besoins", "Identifier les exigences", "Les exigences fonctionnelles sont correctement identifiées"],
    ["Informatique et Digital", "Développement Digital", "DD", "M101", "Programmation Orientée Objet", "80",
      "Analyser les besoins", "Identifier les exigences", "Les exigences sont validées avec le client"],
    ["Informatique et Digital", "Développement Digital", "DD", "M101", "Programmation Orientée Objet", "80",
      "Analyser les besoins", "Définir l'architecture", "L'architecture retenue est justifiée"],
    ["Informatique et Digital", "Développement Digital", "DD", "M102", "Bases de données", "60",
      "Concevoir une base de données", "Modéliser le schéma", "Le modèle conceptuel est correct et complet"],
  ];
  const ws = utils.aoa_to_sheet(data);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 28 }));
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try direct template parse first — no AI, no timeout
    const ext = file.name.split(".").pop()?.toLowerCase();
    let extracted: ExtractedReferentiel | null = null;
    let importMode = "ia";

    if (ext === "xlsx" || ext === "xls") {
      extracted = parseTemplateExcel(buffer);
      if (extracted) importMode = "template";
    }

    if (!extracted) {
      const text = await extractTextFromBuffer(buffer, file.type, file.name);
      if (!text || text.trim().length < 50) {
        return NextResponse.json({ error: "Le fichier semble vide ou illisible" }, { status: 400 });
      }
      extracted = await extractReferentielFromText(text);
    }

    // Upsert Secteur
    let secteur = await prisma.secteur.findFirst({ where: { nom: extracted.secteur } });
    if (!secteur) {
      secteur = await prisma.secteur.create({
        data: { nom: extracted.secteur, code: extracted.secteurCode ?? null },
      });
    }

    // Upsert Filiere
    let filiere = await prisma.filiere.findFirst({
      where: { nom: extracted.filiere, secteurId: secteur.id },
    });
    if (!filiere) {
      filiere = await prisma.filiere.create({
        data: { nom: extracted.filiere, code: extracted.filiereCode ?? null, secteurId: secteur.id },
      });
    }

    let modulesCreated = 0;
    let sequencesCreated = 0;
    let competencesCreated = 0;
    let objectifsCreated = 0;
    let criteresCreated = 0;

    // Crée une compétence + ses objectifs + critères sous un module, éventuellement rattachée à une séquence.
    async function createCompetence(
      comp: { titre: string; objectifs?: { titre: string; criteres?: string[] }[] },
      moduleId: string,
      sequenceId: string | null
    ) {
      const competence = await prisma.competence.create({
        data: { titre: comp.titre, moduleId, sequenceId },
      });
      competencesCreated++;

      for (const obj of comp.objectifs ?? []) {
        const objectif = await prisma.objectif.create({
          data: { titre: obj.titre, competenceId: competence.id },
        });
        objectifsCreated++;

        for (const crit of obj.criteres ?? []) {
          await prisma.criterePerformance.create({
            data: { description: crit, objectifId: objectif.id },
          });
          criteresCreated++;
        }
      }
    }

    for (const mod of extracted.modules ?? []) {
      // Upsert module — évite les doublons si ré-importation
      let refModule = await prisma.refModule.findFirst({
        where: {
          filiereId: filiere.id,
          ...(mod.code
            ? { code: { equals: mod.code, mode: "insensitive" } }
            : { nom: { equals: mod.nom, mode: "insensitive" } }),
        },
      });

      if (refModule) {
        // Met à jour mhg si manquant
        if (mod.mhg && !refModule.mhg) {
          refModule = await prisma.refModule.update({
            where: { id: refModule.id },
            data: { mhg: mod.mhg },
          });
        }
      } else {
        refModule = await prisma.refModule.create({
          data: {
            nom: mod.nom,
            code: mod.code ?? null,
            mhg: mod.mhg ?? null,
            filiereId: filiere.id,
          },
        });
        modulesCreated++;
      }

      // Compétences directement sous le module (pas de séquence)
      const existingComps = await prisma.competence.findMany({
        where: { moduleId: refModule.id, sequenceId: null },
        select: { titre: true },
      });
      const existingTitles = new Set(existingComps.map((c) => c.titre.toLowerCase()));

      for (const comp of mod.competences ?? []) {
        if (!existingTitles.has(comp.titre.toLowerCase())) {
          await createCompetence(comp, refModule.id, null);
        }
      }

      // Compétences regroupées par séquence
      for (const seq of mod.sequences ?? []) {
        let sequence = await prisma.sequence.findFirst({
          where: { moduleId: refModule.id, titre: { equals: seq.titre, mode: "insensitive" } },
        });
        if (!sequence) {
          sequence = await prisma.sequence.create({
            data: { titre: seq.titre, code: seq.code ?? null, moduleId: refModule.id },
          });
          sequencesCreated++;
        }
        const existingSeqComps = await prisma.competence.findMany({
          where: { sequenceId: sequence.id },
          select: { titre: true },
        });
        const existingSeqTitles = new Set(existingSeqComps.map((c) => c.titre.toLowerCase()));
        for (const comp of seq.competences ?? []) {
          if (!existingSeqTitles.has(comp.titre.toLowerCase())) {
            await createCompetence(comp, refModule.id, sequence.id);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      secteur: extracted.secteur,
      filiere: extracted.filiere,
      importMode,
      stats: { modulesCreated, sequencesCreated, competencesCreated, objectifsCreated, criteresCreated },
    });
  } catch (err) {
    console.error("Erreur référentiel:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors du traitement" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const mode = req.nextUrl.searchParams.get("mode");

  // Template Excel download — no auth check needed beyond session
  if (mode === "template") {
    const buf = generateTemplateExcel();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modele-referentiel-ofppt.xlsx"',
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
    const secteurs = await prisma.secteur.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        filieres: {
          select: {
            id: true,
            nom: true,
            code: true,
            modules: {
              select: { id: true, nom: true, code: true, mhg: true },
              orderBy: { nom: "asc" },
            },
          },
          orderBy: { nom: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(secteurs);
  }

  const secteurs = await prisma.secteur.findMany({
    include: {
      filieres: {
        include: {
          modules: {
            include: {
              sequences: {
                include: {
                  competences: {
                    include: { objectifs: { include: { criteres: true } } },
                  },
                },
              },
              competences: {
                include: { objectifs: { include: { criteres: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(secteurs);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const secteurId = searchParams.get("secteurId");

  if (secteurId) {
    await prisma.secteur.delete({ where: { id: secteurId } });
  } else {
    await prisma.secteur.deleteMany({});
  }

  return NextResponse.json({ success: true });
}
