import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { getLogoBase64, stampAllPages, PdfFormateur } from "@/lib/pdf-helpers";

export async function exportToPPT(contenu: string, titre: string): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const prs = new PptxGenJS();
  prs.layout = "LAYOUT_WIDE";

  const BRAND = "003087"; // bleu marine OFPPT
  const DARK = "0B0B14";
  const CARD = "12121E";
  const TEXT = "E5E7EB";
  const MUTED = "6B7280";
  const BORDER = "1E1E2C";

  // ── Slide 1 : Page de garde ──
  const cover = prs.addSlide();
  cover.background = { color: DARK };
  cover.addShape("rect" as never, { x: 0, y: 0, w: 10, h: 0.12, fill: { color: BRAND }, line: { color: BRAND } });
  cover.addShape("rect" as never, { x: 0, y: 7.38, w: 10, h: 0.12, fill: { color: BRAND }, line: { color: BRAND } });
  cover.addShape("rect" as never, { x: 1, y: 1.5, w: 8, h: 4.2, fill: { color: CARD }, line: { color: BORDER } });
  cover.addText("OFPPT", { x: 1.2, y: 1.75, w: 7.6, h: 0.45, fontSize: 11, color: BRAND, bold: true, align: "center" });
  cover.addText("Fiche de Séance Pédagogique", { x: 1.2, y: 2.25, w: 7.6, h: 0.38, fontSize: 10, color: MUTED, align: "center" });
  cover.addText(titre, {
    x: 1.2, y: 2.78, w: 7.6, h: 1.8,
    fontSize: 22, bold: true, color: TEXT,
    align: "center", valign: "middle", wrap: true,
  });
  cover.addText(new Date().toLocaleDateString("fr-MA", { day: "numeric", month: "long", year: "numeric" }), {
    x: 1.2, y: 5.0, w: 7.6, h: 0.35, fontSize: 9, color: MUTED, align: "center",
  });

  // ── Helper : frame commun pour chaque diapo ──
  const addFrame = (slide: ReturnType<typeof prs.addSlide>, sectionTitle: string) => {
    slide.background = { color: DARK };
    slide.addShape("rect" as never, { x: 0, y: 0, w: 10, h: 0.09, fill: { color: BRAND }, line: { color: BRAND } });
    slide.addText(sectionTitle, { x: 0.4, y: 0.18, w: 8.5, h: 0.6, fontSize: 17, bold: true, color: BRAND });
    slide.addShape("rect" as never, { x: 0.4, y: 0.85, w: 9.2, h: 0.02, fill: { color: BORDER }, line: { color: BORDER } });
    slide.addText("Compétencia IA — OFPPT", { x: 0.4, y: 7.15, w: 9.2, h: 0.28, fontSize: 8, color: MUTED });
  };

  // ── Conversion markdown → texte propre ──
  const cleanMarkdown = (raw: string): string =>
    raw
      .split("\n")
      .map((l) => {
        if (l.startsWith("### ")) return `\n▸ ${l.replace("### ", "").toUpperCase()}\n`;
        if (l.match(/^[-*]\s/)) return `  • ${l.replace(/^[-*]\s/, "")}`;
        return l.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[#`|]/g, "");
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  // ── Découpe par sections ## ──
  const sections: { title: string; content: string }[] = [];
  let current: { title: string; content: string } | null = null;

  for (const line of contenu.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, "").trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    // Pas de sections ## → une seule diapo de contenu
    const slide = prs.addSlide();
    addFrame(slide, titre);
    slide.addText(cleanMarkdown(contenu), {
      x: 0.4, y: 1.0, w: 9.2, h: 6.0, fontSize: 10, color: TEXT, valign: "top", wrap: true,
    });
  } else {
    for (const s of sections) {
      const slide = prs.addSlide();
      addFrame(slide, s.title);
      slide.addText(cleanMarkdown(s.content) || " ", {
        x: 0.4, y: 1.0, w: 9.2, h: 6.0,
        fontSize: 10.5, color: TEXT, valign: "top", wrap: true, lineSpacingMultiple: 1.35,
      });
    }
  }

  const blob = (await prs.write({ outputType: "blob" })) as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titre.replace(/\s+/g, "-")}.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPDF(
  contenu: string,
  titre: string,
  formateur?: PdfFormateur,
  type = "Séance Pédagogique"
) {
  const logoBase64 = await getLogoBase64();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentTop = 26;
  const contentBottom = pageH - 16;
  const lineH = 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);

  const lines = doc.splitTextToSize(
    contenu.replace(/[#*`|]/g, "").replace(/\n{3,}/g, "\n\n"),
    pageW - 30
  );

  let y = contentTop;
  for (const line of lines) {
    if (y + lineH > contentBottom) {
      doc.addPage();
      y = contentTop;
    }
    doc.text(line, 15, y);
    y += lineH;
  }

  if (formateur) {
    stampAllPages(doc, { titre, type, logoBase64 }, formateur);
  }

  doc.save(`${titre.replace(/\s+/g, "-")}.pdf`);
}

export async function exportToWord(contenu: string, titre: string) {
  const lines = contenu.split("\n");
  const children = lines.map((line) => {
    if (line.startsWith("# ")) {
      return new Paragraph({
        text: line.replace("# ", ""),
        heading: HeadingLevel.HEADING_1,
      });
    }
    if (line.startsWith("## ")) {
      return new Paragraph({
        text: line.replace("## ", ""),
        heading: HeadingLevel.HEADING_2,
      });
    }
    return new Paragraph({
      children: [new TextRun(line.replace(/[*`]/g, ""))],
    });
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titre}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportFichePDF(
  contenu: string,
  titre: string,
  formateur?: PdfFormateur
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const logoBase64 = await getLogoBase64();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentTop = 26;
  const contentBottom = pageH - 16;
  const lineH = 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);

  const lines = contenu
    .replace(/#{1,6} /g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .split("\n")
    .filter(Boolean);

  let y = contentTop;
  for (const rawLine of lines) {
    const wrapped = doc.splitTextToSize(rawLine, pageW - 30);
    if (y + wrapped.length * lineH > contentBottom) {
      doc.addPage();
      y = contentTop;
    }
    doc.text(wrapped, 15, y);
    y += wrapped.length * lineH + 2;
  }

  if (formateur) {
    stampAllPages(doc, { titre, type: "Fiche Pédagogique", logoBase64 }, formateur);
  }

  doc.save(`${titre.replace(/\s+/g, "-")}.pdf`);
}

export async function exportFicheWord(contenu: string, titre: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const lines = contenu.split("\n").filter(Boolean);
  const children = lines.map((line) => {
    if (line.startsWith("### ")) return new Paragraph({ text: line.replace("### ", ""), heading: HeadingLevel.HEADING_3 });
    if (line.startsWith("## ")) return new Paragraph({ text: line.replace("## ", ""), heading: HeadingLevel.HEADING_2 });
    if (line.startsWith("# ")) return new Paragraph({ text: line.replace("# ", ""), heading: HeadingLevel.HEADING_1 });
    return new Paragraph({ children: [new TextRun({ text: line.replace(/\*\*(.*?)\*\*/g, "$1"), size: 22 })] });
  });
  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titre.replace(/\s+/g, "-")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProgressionExcel(
  groupeNom: string,
  competences: { id: string; titre: string }[],
  stagiaires: { nom: string; prenom: string; progressions: { competenceId: string; pourcentage: number }[] }[]
): void {
  import("xlsx").then((XLSX) => {
    const headers = ["Stagiaire", ...competences.map((c) => c.titre)];
    const rows = stagiaires.map((s) => {
      const row: (string | number)[] = [`${s.prenom} ${s.nom}`];
      for (const c of competences) {
        const p = s.progressions.find((p) => p.competenceId === c.id);
        row.push(p ? p.pourcentage : "");
      }
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 20 }, ...competences.map(() => ({ wch: 15 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Progression");

    // Feuille moyennes
    const moyenneHeaders = ["Compétence", "Moyenne (%)"];
    const moyenneRows = competences.map((c) => {
      const vals = stagiaires
        .map((s) => s.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? null)
        .filter((v): v is number => v !== null);
      const moy = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "";
      return [c.titre, moy];
    });
    const wsMoy = XLSX.utils.aoa_to_sheet([moyenneHeaders, ...moyenneRows]);
    XLSX.utils.book_append_sheet(wb, wsMoy, "Moyennes");

    XLSX.writeFile(wb, `${groupeNom.replace(/\s+/g, "-")}-progression.xlsx`);
  });
}

export function exportProgressionPDF(
  groupeNom: string,
  filiere: string,
  annee: string,
  competences: { id: string; titre: string }[],
  stagiaires: { nom: string; prenom: string; progressions: { competenceId: string; pourcentage: number }[] }[],
  formateur?: PdfFormateur
): void {
  import("jspdf").then(async ({ default: jsPDF }) => {
    const logoBase64 = await getLogoBase64();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const titre = `Suivi — ${groupeNom} | ${filiere} | ${annee}`;
    const colWidth = Math.min(30, Math.floor((W - 60) / Math.max(competences.length, 1)));
    const startX = 14;
    let y = 28;

    // En-tête tableau (charte OFPPT : navy + texte blanc)
    doc.setFillColor(0, 48, 135);
    doc.rect(startX, y, 40, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("Stagiaire", startX + 1, y + 5);

    competences.forEach((c, i) => {
      const x = startX + 40 + i * colWidth;
      doc.setFillColor(0, 48, 135);
      doc.rect(x, y, colWidth, 7, "F");
      const label = c.titre.length > 12 ? c.titre.slice(0, 12) + "…" : c.titre;
      doc.text(label, x + 1, y + 5);
    });
    y += 7;

    // Lignes stagiaires
    doc.setFont("helvetica", "normal");
    stagiaires.forEach((s, idx) => {
      if (y > pageH - 20) {
        doc.addPage();
        y = 28;
      }
      const bg: [number, number, number] = idx % 2 === 0 ? [248, 250, 252] : [240, 242, 245];
      doc.setFillColor(...bg);
      doc.rect(startX, y, 40 + competences.length * colWidth, 6, "F");
      doc.setTextColor(31, 41, 55);
      doc.text(`${s.prenom} ${s.nom}`, startX + 1, y + 4.5);

      competences.forEach((c, i) => {
        const val = s.progressions.find((p) => p.competenceId === c.id)?.pourcentage;
        const x = startX + 40 + i * colWidth;
        if (val !== undefined) {
          const color: [number, number, number] =
            val >= 75 ? [57, 200, 74] : val >= 50 ? [245, 158, 11] : [239, 68, 68];
          doc.setTextColor(...color);
          doc.text(`${val}%`, x + 1, y + 4.5);
        } else {
          doc.setTextColor(75, 85, 99);
          doc.text("—", x + 1, y + 4.5);
        }
      });
      y += 6;
    });

    if (formateur) {
      stampAllPages(doc, { titre, type: "Suivi des Compétences", logoBase64 }, formateur);
    }

    doc.save(`${groupeNom.replace(/\s+/g, "-")}-progression.pdf`);
  });
}
