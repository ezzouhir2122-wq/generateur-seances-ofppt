import { jsPDF } from "jspdf";

export interface PdfHeaderOptions {
  titre: string;
  type: string;
  logoBase64?: string | null;
}

export interface PdfFormateur {
  name: string;
  matricule?: string | null;
  etablissement?: string | null;
}

let _logoBase64: string | null | undefined = undefined;

export async function getLogoBase64(): Promise<string | null> {
  if (_logoBase64 !== undefined) return _logoBase64;
  try {
    const res = await fetch("/logo-ofppt.jpg");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        _logoBase64 = reader.result as string;
        resolve(_logoBase64!);
      };
      reader.onerror = () => {
        _logoBase64 = null;
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    _logoBase64 = null;
    return null;
  }
}

// Palette OFPPT moderne
const OFPPT_NAVY: [number, number, number] = [0, 48, 135]; // #003087
const OFPPT_BLUE: [number, number, number] = [10, 77, 168]; // #0A4DA8 (primaire)
const OFPPT_ORANGE: [number, number, number] = [232, 101, 26]; // #E8651A (accent)
const TEXT_GRAY: [number, number, number] = [31, 41, 55];

export function pdfHeader(doc: jsPDF, opts: PdfHeaderOptions): void {
  const W = doc.internal.pageSize.getWidth();

  // Bande bleu marine supérieure
  doc.setFillColor(...OFPPT_NAVY);
  doc.rect(0, 0, W, 3, "F");

  // Logo OFPPT (14×14 mm, à gauche)
  if (opts.logoBase64) {
    try {
      doc.addImage(opts.logoBase64, "JPEG", 10, 5, 14, 14);
    } catch {
      // logo optionnel — ignorer si erreur
    }
  }

  // "OFPPT — <Type>" en bleu marine, centré
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...OFPPT_NAVY);
  doc.text(`OFPPT — ${opts.type}`, W / 2, 12, { align: "center" });

  // Titre du document, gris, centré
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const shortTitre = opts.titre.length > 80 ? opts.titre.slice(0, 80) + "…" : opts.titre;
  doc.text(shortTitre, W / 2, 17, { align: "center" });

  // Date à droite
  const dateStr = new Date().toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.setFontSize(7);
  doc.text(dateStr, W - 10, 12, { align: "right" });

  // Ligne séparatrice orange (accent OFPPT)
  doc.setDrawColor(...OFPPT_ORANGE);
  doc.setLineWidth(0.6);
  doc.line(10, 22, W - 10, 22);
}

export function pdfFooter(
  doc: jsPDF,
  formateur: PdfFormateur,
  pageNum: number,
  totalPages: number
): void {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const footerY = H - 12;

  // Ligne séparatrice
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, footerY, W - 10, footerY);

  // Bande orange inférieure (accent OFPPT)
  doc.setFillColor(...OFPPT_ORANGE);
  doc.rect(0, H - 2, W, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);

  const mat = formateur.matricule ?? "—";
  const etab = formateur.etablissement ?? "—";

  doc.text(`Formateur : ${formateur.name}   |   Mat. : ${mat}`, 10, footerY + 5);
  doc.text(`Établissement : ${etab}`, 10, footerY + 9);
  doc.text(`Page ${pageNum} / ${totalPages}`, W - 10, footerY + 7, { align: "right" });
}

export function stampAllPages(
  doc: jsPDF,
  opts: PdfHeaderOptions,
  formateur: PdfFormateur
): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    pdfHeader(doc, opts);
    pdfFooter(doc, formateur, i, total);
  }
}

export interface RenderBodyOptions {
  /** Y de départ du contenu (sous l'en-tête). Défaut 28 mm. */
  contentTop?: number;
  /** Taille de police du corps en pt. Défaut 10. */
  fontSize?: number;
}

/**
 * Rend du markdown (titres, gras, listes, tableaux) en PDF stylé OFPPT,
 * au lieu de vider du texte brut. Gère automatiquement les sauts de page.
 * L'en-tête / pied de page doivent être ajoutés ensuite via stampAllPages.
 */
export function renderMarkdownBody(
  doc: jsPDF,
  contenu: string,
  opts: RenderBodyOptions = {}
): void {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const maxW = W - marginX * 2;
  const top = opts.contentTop ?? 28;
  const bottom = H - 18;
  const baseSize = opts.fontSize ?? 10;
  const lineH = baseSize * 0.5;
  let y = top;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage();
      y = top;
    }
  };

  // "texte **gras**" → segments { text, bold }
  const parseRich = (text: string): { text: string; bold: boolean }[] =>
    text
      .split(/\*\*/)
      .map((t, i) => ({ text: t, bold: i % 2 === 1 }))
      .filter((p) => p.text.length > 0);

  // Texte enrichi (gras inline) avec retour à la ligne automatique
  const drawRich = (
    segments: { text: string; bold: boolean }[],
    x: number,
    width: number,
    color: [number, number, number],
    size: number
  ) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const words: { w: string; bold: boolean }[] = [];
    for (const seg of segments) {
      for (const w of seg.text.split(/(\s+)/)) {
        if (w.length) words.push({ w, bold: seg.bold });
      }
    }
    let line: { w: string; bold: boolean }[] = [];
    let curWidth = 0;
    const flush = () => {
      ensureSpace(lineH);
      let cx = x;
      for (const tok of line) {
        doc.setFont("helvetica", tok.bold ? "bold" : "normal");
        doc.text(tok.w, cx, y);
        cx += doc.getTextWidth(tok.w);
      }
      y += lineH;
      line = [];
      curWidth = 0;
    };
    for (const tok of words) {
      doc.setFont("helvetica", tok.bold ? "bold" : "normal");
      const tw = doc.getTextWidth(tok.w);
      if (curWidth + tw > width && line.length > 0) {
        flush();
        if (/^\s+$/.test(tok.w)) continue; // pas d'espace en début de ligne
      }
      line.push(tok);
      curWidth += tw;
    }
    if (line.length) flush();
  };

  const drawTable = (rows: string[]) => {
    const parsed = rows.map((r) =>
      r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim())
    );
    const isSep = (cells: string[]) => cells.every((c) => /^:?-{2,}:?$/.test(c));
    const header = parsed[0];
    let body = parsed.slice(1);
    if (body.length && isSep(body[0])) body = body.slice(1);
    const nCols = header.length;
    const colW = maxW / nCols;
    const rowH = 6;

    const drawRow = (cells: string[], isHeader: boolean, idx: number) => {
      ensureSpace(rowH);
      if (isHeader) doc.setFillColor(...OFPPT_NAVY);
      else if (idx % 2 === 0) doc.setFillColor(248, 250, 252);
      else doc.setFillColor(240, 242, 245);
      doc.rect(marginX, y - 4, maxW, rowH, "F");
      doc.setFont("helvetica", isHeader ? "bold" : "normal");
      doc.setFontSize(8);
      if (isHeader) doc.setTextColor(255, 255, 255);
      else doc.setTextColor(...TEXT_GRAY);
      cells.forEach((c, ci) => {
        const txt = c.replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(txt, colW - 3) as string[];
        doc.text(wrapped[0] ?? "", marginX + ci * colW + 1.5, y);
      });
      y += rowH;
    };

    y += 2;
    drawRow(header, true, 0);
    body.forEach((r, idx) => {
      while (r.length < nCols) r.push("");
      drawRow(r, false, idx);
    });
    y += 3;
  };

  const rawLines = contenu.replace(/\r/g, "").split("\n");
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();

    // Bloc tableau : lignes consécutives commençant par |
    if (/^\|.*\|/.test(trimmed)) {
      const tbl: string[] = [];
      while (i < rawLines.length && /^\s*\|.*\|/.test(rawLines[i])) {
        tbl.push(rawLines[i].trim());
        i++;
      }
      i--;
      drawTable(tbl);
      continue;
    }

    if (trimmed === "") {
      y += lineH * 0.6;
      continue;
    }

    // ### Sous-titre
    if (trimmed.startsWith("### ")) {
      ensureSpace(lineH + 4);
      y += 2;
      doc.setFillColor(...OFPPT_ORANGE);
      doc.rect(marginX, y - 3, 1.5, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...OFPPT_NAVY);
      doc.text(trimmed.slice(4), marginX + 4, y);
      y += lineH + 2;
      continue;
    }
    // ## Section → bandeau bleu plein
    if (trimmed.startsWith("## ")) {
      ensureSpace(10);
      y += 2;
      doc.setFillColor(...OFPPT_BLUE);
      doc.rect(marginX, y - 4, maxW, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(trimmed.slice(3), marginX + 3, y + 0.8);
      y += 9;
      continue;
    }
    // # Titre
    if (trimmed.startsWith("# ")) {
      ensureSpace(lineH + 4);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...OFPPT_NAVY);
      doc.text(trimmed.slice(2), marginX, y);
      y += lineH + 3;
      continue;
    }

    // Puces
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      ensureSpace(lineH);
      doc.setFillColor(...OFPPT_ORANGE);
      doc.circle(marginX + 1.5, y - 1, 0.9, "F");
      drawRich(parseRich(bullet[1]), marginX + 5, maxW - 5, TEXT_GRAY, baseSize);
      continue;
    }
    // Listes numérotées
    const num = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      ensureSpace(lineH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(baseSize);
      doc.setTextColor(...OFPPT_BLUE);
      doc.text(`${num[1]}.`, marginX, y);
      drawRich(parseRich(num[2]), marginX + 7, maxW - 7, TEXT_GRAY, baseSize);
      continue;
    }

    // Paragraphe normal
    drawRich(parseRich(trimmed), marginX, maxW, TEXT_GRAY, baseSize);
  }
}
