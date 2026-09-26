import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Competencia IA <onboarding@resend.dev>";
export const APP_URL = process.env.APP_URL || "https://www.competencia.one";
const REPLY_TO = process.env.EMAIL_REPLY_TO; // adresse réelle et surveillée (optionnel)

// Version texte brut dérivée du HTML : améliore le score anti-spam
// (Gmail pénalise les emails 100 % HTML sans alternative multipart/text).
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function send(to: string | string[], subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY absent, envoi ignoré:", subject, "→", to);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text: htmlToText(html),
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
  });
}

/* ─── Emails ─── */

export async function sendApprovalEmail({
  to,
  name,
  loginUrl,
}: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  await send(
    to,
    "Votre compte Compétencia IA est activé",
    layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Bienvenue, ${name} 👋</h1>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Votre compte formateur a été <strong>approuvé</strong>. Vous pouvez dès maintenant
        accéder à votre espace Compétencia IA et générer vos séances pédagogiques.
      </p>
      ${button(loginUrl, "Accéder à mon espace →")}
      <p style="margin:28px 0 0;color:#9CA3AF;font-size:12px;line-height:1.6;text-align:center;">
        Connectez-vous avec l'email et le mot de passe choisis lors de votre inscription.
      </p>
    `)
  );
}

export async function sendAdminNewRequestEmail({
  adminEmail,
  formateurName,
  formateurEmail,
  adminUrl,
}: {
  adminEmail: string | string[];
  formateurName: string;
  formateurEmail: string;
  adminUrl: string;
}) {
  await send(
    adminEmail,
    "Nouvelle demande d'inscription formateur",
    layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Nouvelle demande d'accès</h1>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        <strong>${formateurName}</strong> (${formateurEmail}) demande l'accès à Compétencia IA.
        Approuvez ou rejetez la demande depuis l'espace d'administration.
      </p>
      ${button(adminUrl, "Voir les demandes →")}
    `)
  );
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  await send(
    to,
    "Réinitialisation de votre mot de passe",
    layout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Réinitialisation du mot de passe</h1>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Bonjour ${name}, cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
        Ce lien expire dans <strong>1 heure</strong>.
      </p>
      ${button(resetUrl, "Réinitialiser mon mot de passe →")}
      <p style="margin:28px 0 0;color:#9CA3AF;font-size:12px;line-height:1.6;text-align:center;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.
      </p>
    `)
  );
}

/* ─── Gabarit HTML (charte Compétencia) ─── */

function button(href: string, label: string) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${href}"
             style="display:inline-block;background:#0A4DA8;color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function layout(inner: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compétencia IA</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0D0D14;padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:12px;">
                <div style="background:#0A4DA8;width:42px;height:42px;border-radius:10px;display:inline-block;line-height:42px;text-align:center;">
                  <span style="color:#ffffff;font-size:22px;font-weight:900;">C</span>
                </div>
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;vertical-align:middle;">Compétencia IA</span>
              </div>
              <p style="color:#6B7280;font-size:12px;margin:10px 0 0;letter-spacing:1px;text-transform:uppercase;">Génération pédagogique · OFPPT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                © ${new Date().getFullYear()} OFPPT — Compétencia IA · Développé par Mr EZZOUIR Elmustapha
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
