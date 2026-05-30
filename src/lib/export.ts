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
