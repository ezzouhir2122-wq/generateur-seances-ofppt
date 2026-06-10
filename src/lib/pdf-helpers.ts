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

export function pdfHeader(doc: jsPDF, opts: PdfHeaderOptions): void {
  const W = doc.internal.pageSize.getWidth();
  const GREEN: [number, number, number] = [132, 204, 22];

  // Bande verte supérieure
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 3, "F");

  // Logo OFPPT (14×14 mm, à gauche)
  if (opts.logoBase64) {
    try {
      doc.addImage(opts.logoBase64, "JPEG", 10, 5, 14, 14);
    } catch {
      // logo optionnel — ignorer si erreur
    }
  }

  // "OFPPT — <Type>" en vert, centré
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GREEN);
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

  // Ligne séparatrice
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
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
  const GREEN: [number, number, number] = [132, 204, 22];
  const footerY = H - 12;

  // Ligne séparatrice
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, footerY, W - 10, footerY);

  // Bande verte inférieure
  doc.setFillColor(...GREEN);
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
  const total = doc.internal.pages.length;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    pdfHeader(doc, opts);
    pdfFooter(doc, formateur, i, total);
  }
}
