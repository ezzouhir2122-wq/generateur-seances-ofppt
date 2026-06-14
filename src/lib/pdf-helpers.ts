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
const OFPPT_NAVY: [number, number, number] = [0, 48, 135];
const OFPPT_BLUE: [number, number, number] = [10, 77, 168];
const OFPPT_GREEN: [number, number, number] = [58, 161, 70];
const TEXT_GRAY: [number, number, number] = [31, 41, 55];

export function pdfHeader(doc: jsPDF, opts: PdfHeaderOptions): void {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...OFPPT_NAVY);
  doc.rect(0, 0, W, 3, "F");

  if (opts.logoBase64) {
    try {
      doc.addImage(opts.logoBase64, "JPEG", 10, 5, 14, 14);
    } catch {
      // logo optionnel
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...OFPPT_NAVY);
  doc.text(`OFPPT — ${opts.type}`, W / 2, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const shortTitre = opts.titre.length > 80 ? opts.titre.slice(0, 80) + "..." : opts.titre;
  doc.text(shortTitre, W / 2, 17, { align: "center" });

  const dateStr = new Date().toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.setFontSize(7);
  doc.text(dateStr, W - 10, 12, { align: "right" });

  doc.setDrawColor(...OFPPT_GREEN);
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

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, footerY, W - 10, footerY);

  doc.setFillColor(...OFPPT_GREEN);
  doc.rect(0, H - 2, W, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);

  const mat = formateur.matricule ?? "-";
  const etab = formateur.etablissement ?? "-";

  doc.text(`Formateur : ${formateur.name}   |   Mat. : ${mat}`, 10, footerY + 5);
  doc.text(`Etablissement : ${etab}`, 10, footerY + 9);
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
  contentTop?: number;
  fontSize?: number;
}

/**
 * Converts unsupported Unicode characters to ASCII equivalents using charCodeAt().
 * This approach is encoding-safe (no regex with literal Unicode chars in source).
 */
function sanitizeForPdf(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // Box-drawing block: U+2500-U+257F
    if (code >= 0x2500 && code <= 0x257F) {
      // Vertical bar characters -> |
      if (
        code === 0x2502 || code === 0x2503 || code === 0x2506 || code === 0x2507 ||
        code === 0x250a || code === 0x250b || code === 0x254e || code === 0x254f ||
        code === 0x2550 || code === 0x2551 || code === 0x2558 || code === 0x2559 ||
        code === 0x255a || code === 0x255b || code === 0x255c || code === 0x255d ||
        code === 0x2561 || code === 0x2562 || code === 0x2563 || code === 0x256b ||
        code === 0x256c
      ) {
        out += "|";
      }
      // Corner / junction characters -> +
      else if (
        (code >= 0x250c && code <= 0x251b) ||
        (code >= 0x251c && code <= 0x254d) ||
        code === 0x2560 || code === 0x2564 || code === 0x2565 ||
        code === 0x2566 || code === 0x2567 || code === 0x2568 || code === 0x2569
      ) {
        out += "+";
      }
      // All other box-drawing (horizontal lines) -> -
      else {
        out += "-";
      }
    }
    // Block elements U+2580-U+259F -> space
    else if (code >= 0x2580 && code <= 0x259f) {
      out += " ";
    }
    // Non-breaking space U+00A0
    else if (code === 0x00a0) {
      out += " ";
    }
    // En dash U+2013, em dash U+2014, minus sign U+2212
    else if (code === 0x2013 || code === 0x2014 || code === 0x2212) {
      out += "-";
    }
    // Ellipsis U+2026
    else if (code === 0x2026) {
      out += "...";
    }
    // Curly single quotes U+2018, U+2019, prime U+2032
    else if (code === 0x2018 || code === 0x2019 || code === 0x2032) {
      out += "'";
    }
    // Curly double quotes U+201C, U+201D, double prime U+2033
    else if (code === 0x201c || code === 0x201d || code === 0x2033) {
      out += '"';
    }
    // Bullet points U+2022, U+2023, U+25E6, U+2043
    else if (code === 0x2022 || code === 0x2023 || code === 0x25e6 || code === 0x2043) {
      out += "-";
    }
    // Arrows
    else if (code === 0x2192) { out += "->"; }
    else if (code === 0x2190) { out += "<-"; }
    else if (code === 0x2194) { out += "<->"; }
    else if (code === 0x2191 || code === 0x2193) { out += "|"; }
    // Geometric shapes that look like bullets
    else if (code === 0x25a0 || code === 0x25aa || code === 0x25cf) { out += "-"; }
    else {
      out += text[i];
    }
  }
  return out;
}

/** Detects if a line is a table border like +---+---+ or ===== */
function isBorderLine(line: string): boolean {
  return /^\+[-+=+]+\+$/.test(line) || /^[=]{3,}$/.test(line) || /^[-]{3,}$/.test(line.replace(/\+/g, ""));
}

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

  const parseRich = (text: string): { text: string; bold: boolean }[] =>
    text
      .split(/\*\*/)
      .map((t, idx) => ({ text: t, bold: idx % 2 === 1 }))
      .filter((p) => p.text.length > 0);

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
        if (/^\s+$/.test(tok.w)) continue;
      }
      line.push(tok);
      curWidth += tw;
    }
    if (line.length) flush();
  };

  const drawTable = (rows: string[]) => {
    // Filter out border/separator rows before parsing
    const pipeRows = rows.filter((r) => /^\|/.test(r.trim()));
    if (pipeRows.length === 0) return;

    const parsed = pipeRows.map((r) =>
      r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim())
    );
    const isSepRow = (cells: string[]) => cells.every((c) => /^[-: ]*$/.test(c));
    const header = parsed[0];
    const body = parsed.slice(1).filter((r) => !isSepRow(r));
    const nCols = Math.max(header.length, 1);
    const colW = maxW / nCols;
    const cellPad = 2;
    const lineSpacing = 4;

    const calcRowH = (cells: string[]): number => {
      let maxLines = 1;
      doc.setFontSize(8);
      cells.forEach((c) => {
        const txt = c.replace(/\*\*/g, "").trim();
        if (!txt) return;
        const wrapped = doc.splitTextToSize(txt, colW - cellPad * 2) as string[];
        maxLines = Math.max(maxLines, wrapped.length);
      });
      return Math.max(7, maxLines * lineSpacing + 4);
    };

    const drawRow = (cells: string[], isHeader: boolean, idx: number) => {
      const rowH = calcRowH(cells);
      ensureSpace(rowH + 1);

      if (isHeader) {
        doc.setFillColor(...OFPPT_NAVY);
      } else if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(marginX, y, maxW, rowH, "F");

      doc.setDrawColor(180, 195, 215);
      doc.setLineWidth(0.25);
      doc.rect(marginX, y, maxW, rowH, "S");
      for (let ci = 1; ci < nCols; ci++) {
        const cx = marginX + ci * colW;
        doc.line(cx, y, cx, y + rowH);
      }

      doc.setFontSize(8);
      cells.forEach((c, ci) => {
        const txt = c.replace(/\*\*/g, "").trim();
        if (!txt) return;
        doc.setFont("helvetica", isHeader ? "bold" : "normal");
        if (isHeader) doc.setTextColor(255, 255, 255);
        else doc.setTextColor(...TEXT_GRAY);
        const wrapped = doc.splitTextToSize(txt, colW - cellPad * 2) as string[];
        wrapped.forEach((ln, li) => {
          const ty = y + 4.5 + li * lineSpacing;
          if (ty < y + rowH - 0.5) {
            doc.text(ln, marginX + ci * colW + cellPad, ty);
          }
        });
      });

      y += rowH;
    };

    y += 2;
    drawRow(header, true, 0);
    body.forEach((r, idx) => {
      while (r.length < nCols) r.push("");
      drawRow(r, false, idx);
    });
    y += 4;
  };

  // Pre-process: sanitize Unicode chars + normalize line endings
  const sanitized = sanitizeForPdf(contenu);
  const rawLines = sanitized.replace(/\r/g, "").split("\n");

  let inCodeBlock = false;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();

    // Toggle code fence (``` or ~~~) — skip the marker line itself
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Inside a code block: collect | rows as table, skip +---+ borders
    if (inCodeBlock) {
      if (!trimmed) { y += lineH * 0.4; continue; }
      // Pure border rows -> skip
      if (isBorderLine(trimmed)) continue;
      // | data | rows -> collect and render as table
      if (/^\|/.test(trimmed)) {
        const tbl: string[] = [];
        while (
          i < rawLines.length &&
          rawLines[i].trim() &&
          !/^(`{3,}|~{3,})/.test(rawLines[i].trim())
        ) {
          const row = rawLines[i].trim();
          if (!isBorderLine(row)) tbl.push(row);
          i++;
        }
        i--; // step back so outer loop re-reads
        if (tbl.length > 0) drawTable(tbl);
        continue;
      }
      // Other code block content -> small gray text
      if (trimmed) {
        ensureSpace(lineH);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(baseSize - 1);
        doc.setTextColor(80, 80, 100);
        const codeWrapped = doc.splitTextToSize(trimmed, maxW - 6) as string[];
        for (const cl of codeWrapped) {
          ensureSpace(lineH);
          doc.text(cl, marginX + 3, y);
          y += lineH;
        }
      }
      continue;
    }

    // Regular markdown table: consecutive lines starting with |
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

    // ### Sub-heading
    if (trimmed.startsWith("### ")) {
      ensureSpace(lineH + 4);
      y += 2;
      doc.setFillColor(...OFPPT_GREEN);
      doc.rect(marginX, y - 3, 1.5, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...OFPPT_NAVY);
      doc.text(trimmed.slice(4), marginX + 4, y);
      y += lineH + 2;
      continue;
    }
    // ## Section -> blue banner
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
    // # Title
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

    // Bullet list
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      ensureSpace(lineH);
      doc.setFillColor(...OFPPT_GREEN);
      doc.circle(marginX + 1.5, y - 1, 0.9, "F");
      drawRich(parseRich(bullet[1]), marginX + 5, maxW - 5, TEXT_GRAY, baseSize);
      continue;
    }
    // Numbered list
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

    // Normal paragraph
    drawRich(parseRich(trimmed), marginX, maxW, TEXT_GRAY, baseSize);
  }
}
