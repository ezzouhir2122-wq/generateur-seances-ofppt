import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportToPPT(contenu: string, titre: string): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const prs = new PptxGenJS();
  prs.layout = "LAYOUT_WIDE";

  const GREEN = "84CC16";
  const DARK = "0B0B14";
  const CARD = "12121E";
  const TEXT = "E5E7EB";
  const MUTED = "6B7280";
  const BORDER = "1E1E2C";

  // ── Slide 1 : Page de garde ──
  const cover = prs.addSlide();
  cover.background = { color: DARK };
  cover.addShape("rect" as never, { x: 0, y: 0, w: 10, h: 0.12, fill: { color: GREEN }, line: { color: GREEN } });
  cover.addShape("rect" as never, { x: 0, y: 7.38, w: 10, h: 0.12, fill: { color: GREEN }, line: { color: GREEN } });
  cover.addShape("rect" as never, { x: 1, y: 1.5, w: 8, h: 4.2, fill: { color: CARD }, line: { color: BORDER } });
  cover.addText("OFPPT", { x: 1.2, y: 1.75, w: 7.6, h: 0.45, fontSize: 11, color: GREEN, bold: true, align: "center" });
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
    slide.addShape("rect" as never, { x: 0, y: 0, w: 10, h: 0.09, fill: { color: GREEN }, line: { color: GREEN } });
    slide.addText(sectionTitle, { x: 0.4, y: 0.18, w: 8.5, h: 0.6, fontSize: 17, bold: true, color: GREEN });
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

export async function exportToPDF(contenu: string, titre: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 102, 51); // ofppt green
  doc.text("OFPPT — Fiche de Séance Pédagogique", 15, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);

  const lines = doc.splitTextToSize(contenu.replace(/[#*`|]/g, ""), 180);
  doc.text(lines, 15, 35);

  doc.save(`${titre}.pdf`);
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

export function exportFichePDF(contenu: string, titre: string): void {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const lines = contenu.replace(/#{1,6} /g, "").split("\n").filter(Boolean);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Competencia IA — OFPPT", 20, 20);
    doc.setFontSize(12);
    doc.text(titre, 20, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let y = 42;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, 170);
      if (y + wrapped.length * 5 > 280) { doc.addPage(); y = 20; }
      doc.text(wrapped, 20, y);
      y += wrapped.length * 5 + 2;
    }
    doc.save(`${titre.replace(/\s+/g, "-")}.pdf`);
  });
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
