import { NextResponse } from "next/server";
import { utils, write } from "xlsx";

export async function GET() {
  const ws = utils.aoa_to_sheet([
    ["Nom", "Prénom", "CNE"],
    ["Exemple", "Prénom Exemple", "ABC123456"],
  ]);
  ws["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Stagiaires");
  const buffer = write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-stagiaires.xlsx"',
    },
  });
}
