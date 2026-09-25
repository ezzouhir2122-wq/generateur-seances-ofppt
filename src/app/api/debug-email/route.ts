import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// ⚠️ ENDPOINT DE DIAGNOSTIC TEMPORAIRE — à supprimer après usage.
// Protégé par un secret en query (?key=). Ne renvoie jamais les valeurs des clés.
const SECRET = "diag-competencia-2026";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: (process.env.RESEND_API_KEY || "").slice(0, 3), // "re_" attendu
    EMAIL_FROM: process.env.EMAIL_FROM || "(non défini → onboarding@resend.dev)",
    APP_URL: process.env.APP_URL || "(non défini)",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "(non défini)",
  };

  const to = url.searchParams.get("to");
  let sendResult: unknown = "(pas de test d'envoi : ajoute &to=email)";
  if (to) {
    if (!process.env.RESEND_API_KEY) {
      sendResult = { error: "RESEND_API_KEY absent en prod" };
    } else {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const r = await resend.emails.send({
          from: process.env.EMAIL_FROM || "Competencia IA <onboarding@resend.dev>",
          to,
          subject: "Test diagnostic Compétencia",
          html: "<p>Ceci est un test de diagnostic d'envoi.</p>",
        });
        sendResult = r; // contient { data, error } de Resend
      } catch (e) {
        sendResult = { thrown: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  return NextResponse.json({ env, sendResult });
}
