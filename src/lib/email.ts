import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail({
  to,
  name,
  password,
}: {
  to: string;
  name: string;
  password: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: "Competencia IA <noreply@competencia-ia.com>",
    to,
    subject: "Bienvenue sur Competencia IA — vos accès",
    html: buildEmailHtml({ name, email: to, password }),
  });
}

function buildEmailHtml({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue sur Competencia IA</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
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

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Bienvenue, ${name} 👋</h1>
              <p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.6;">
                Votre compte formateur a été créé avec succès sur <strong>Compétencia IA</strong>.
                Voici vos informations de connexion :
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:16px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;">Email</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #E2E8F0;padding-top:16px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;">Mot de passe</p>
                          <p style="margin:0;font-size:18px;font-weight:700;color:#0A4DA8;letter-spacing:2px;font-family:monospace;">${password}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://generateur-seances-ofppt.vercel.app/login"
                       style="display:inline-block;background:#0A4DA8;color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
                      Accéder à l'application →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#9CA3AF;font-size:12px;line-height:1.6;text-align:center;">
                Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.<br/>
                Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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
