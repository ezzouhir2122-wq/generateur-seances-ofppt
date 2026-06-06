import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

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
