import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { extractReferentielFromText } from "@/lib/referentiel-extractor";
import { read, utils } from "xlsx";

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

  throw new Error("Format non supporté. Utilisez PDF, DOCX, Excel ou Markdown.");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.type, file.name);

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: "Le fichier semble vide ou illisible" }, { status: 400 });
    }

    const extracted = await extractReferentielFromText(text);

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
    let competencesCreated = 0;
    let objectifsCreated = 0;
    let criteresCreated = 0;

    for (const mod of extracted.modules ?? []) {
      const refModule = await prisma.refModule.create({
        data: {
          nom: mod.nom,
          code: mod.code ?? null,
          mhg: mod.mhg ?? null,
          filiereId: filiere.id,
        },
      });
      modulesCreated++;

      for (const comp of mod.competences ?? []) {
        const competence = await prisma.competence.create({
          data: { titre: comp.titre, moduleId: refModule.id },
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
    }

    return NextResponse.json({
      success: true,
      secteur: extracted.secteur,
      filiere: extracted.filiere,
      stats: { modulesCreated, competencesCreated, objectifsCreated, criteresCreated },
    });
  } catch (err) {
    console.error("Erreur référentiel:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur lors du traitement" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const secteurs = await prisma.secteur.findMany({
    include: {
      filieres: {
        include: {
          modules: {
            include: {
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
