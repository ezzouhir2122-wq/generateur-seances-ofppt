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

  // Prévenir l'admin de la nouvelle demande.
  // On attend l'envoi : en serverless (Vercel) une promesse non-attendue après
  // la réponse peut être tuée avant que la requête HTTP vers Resend n'aboutisse.
  // ADMIN_EMAIL peut contenir plusieurs adresses séparées par des virgules
  // (ex. "admin@ofppt.ma, moi@gmail.com") — tous les admins sont notifiés.
  const adminRecipients = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (adminRecipients.length > 0) {
    try {
      await sendAdminNewRequestEmail({
        adminEmail: adminRecipients,
        formateurName: cleanName,
        formateurEmail: cleanEmail,
        adminUrl: `${APP_URL}/admin`,
      });
      console.log("[register] notif admin envoyée →", adminRecipients.join(", "));
    } catch (e) {
      // Ne bloque pas l'inscription si l'email échoue, mais on trace l'erreur.
      console.error("[register] échec envoi notif admin:", e);
    }
  } else {
    console.warn("[register] ADMIN_EMAIL non défini au runtime — notif admin ignorée");
  }

  return NextResponse.json({ ok: true, pending: true });
}
