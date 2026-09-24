import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { sendApprovalEmail, APP_URL } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const user = await prisma.user.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
    select: { email: true, name: true },
  });
  sendApprovalEmail({ to: user.email, name: user.name, loginUrl: `${APP_URL}/login` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
