import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendAdminNewRequestEmail, APP_URL } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json() as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Tous les champs sont obligatoires" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();

  await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      password: hash,
      status: "PENDING",
      role: "FORMATEUR",
    },
  });

  // Prévenir l'admin de la nouvelle demande (non bloquant)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    sendAdminNewRequestEmail({
      adminEmail,
      formateurName: cleanName,
      formateurEmail: cleanEmail,
      adminUrl: `${APP_URL}/admin`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, pending: true });
}
