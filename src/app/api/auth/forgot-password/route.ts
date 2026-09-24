import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken } from "@/lib/reset-tokens";
import { sendPasswordResetEmail, APP_URL } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  const clean = (email || "").toLowerCase().trim();
  const user = clean ? await prisma.user.findUnique({ where: { email: clean } }) : null;

  if (user && user.status === "APPROVED") {
    const { token, tokenHash } = generateToken();
    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
    });
    sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: `${APP_URL}/reinitialiser-mot-de-passe?token=${token}`,
    }).catch(() => {});
  }

  // Réponse identique quel que soit le cas : ne pas révéler l'existence du compte
  return NextResponse.json({ ok: true });
}
