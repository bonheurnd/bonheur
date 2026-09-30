import nodemailer from 'nodemailer';

/**
 * email.ts
 *
 * Configurable email delivery service for La Lumiere Choir:
 * - Supports SMTP (Render environment variables, Hostinger, Gmail, SendGrid, Mailgun, Brevo, AWS SES)
 * - Safely detects missing configuration without breaking the app
 * - Produces beautiful, brand-aligned HTML templates for password resets
 */

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

export function getEmailConfig(): SmtpConfig {
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
    port,
    secure,
    user: process.env.SMTP_USER || process.env.EMAIL_USER || process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || '"La Lumiere Choir" <noreply@lalumierechoir.rw>',
  };
}

export function isEmailServiceConfigured(): boolean {
  const config = getEmailConfig();
  return Boolean(config.host && config.user && config.pass);
}

export async function sendPasswordResetEmail(options: {
  toEmail: string;
  recipientName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const config = getEmailConfig();
  const minutes = options.expiresInMinutes || 60;

  if (!config.host || !config.user || !config.pass) {
    console.log(`[Placeholder Email Service] Simulating password reset email to ${options.toEmail}:`);
    console.log(`[Placeholder Email Service] Recipient: ${options.recipientName}`);
    console.log(`[Placeholder Email Service] Reset URL: ${options.resetUrl}`);
    console.log(`[Placeholder Email Service] Expires in: ${minutes} minutes`);
    return {
      success: true,
      messageId: `placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const choirName = 'La Lumiere Choir';
    const choirChurch = 'ADEPR Nyanza, Kicukiro District, Kigali, Rwanda';

    const htmlContent = `
<!DOCTYPE html>
<html lang="rw">
<head>
  <meta charset="utf-8">
  <title>Gusubiramo Ijambo ry'Ibanga - ${choirName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #09132b, #172554); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #fde047; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #1e3a8a; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 800; border-radius: 12px; letter-spacing: 0.02em; box-shadow: 0 4px 10px rgba(30, 58, 138, 0.25); }
    .warning { font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 12px 16px; border-radius: 10px; margin-top: 24px; border-left: 4px solid #f59e0b; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    .url-fallback { word-break: break-all; font-family: monospace; font-size: 11px; color: #3b82f6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${choirName}</h1>
      <p>${choirChurch}</p>
    </div>
    <div class="content">
      <div class="greeting">Muraho, ${options.recipientName || 'Mukunzi w\'indirimbo'}!</div>
      <p>
        Twakiriye ubusabe bwo gusubiramo ijambo ry'ibanga rya konti yawe muri <strong>${choirName}</strong>.
      </p>
      <p>
        Kanda kuri iyi buto ikurikira kugira ngo ushyireho ijambo ry'ibanga rishya:
      </p>
      <div class="btn-container">
        <a href="${options.resetUrl}" class="btn" target="_blank">Hindura Ijambo ry'Ibanga</a>
      </div>
      <p style="font-size: 13px; color: #475569;">
        Iyi link irarangira mu minota <strong>${minutes}</strong> (1 hour). Niba atari wowe wasabye guhindura ijambo ry'ibanga, wirengagize iyi baruwa; konti yawe ikomeje gutekana.
      </p>
      <div class="warning">
        Niba buto itari gukora, fungura iyi link muri mushakisha (browser) yawe:<br>
        <span class="url-fallback">${options.resetUrl}</span>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${choirName} • ADEPR Nyanza. Amahoro y'Umwami Yesu abane namwe.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `Muraho ${options.recipientName || ''},\n\nTwakiriye ubusabe bwo guhindura ijambo ry'ibanga rya konti yawe muri ${choirName}.\nKanda hano cyangwa ufungure iyi link:\n${options.resetUrl}\n\nIyi link irarangira mu minota ${minutes}.\nNiba atari wowe wabisabye, wirengagize iyi butumwa.\n\n${choirName} - ADEPR Nyanza`;

    const info = await transporter.sendMail({
      from: config.from,
      to: options.toEmail,
      subject: `[${choirName}] Gusubiramo Ijambo ry'Ibanga (Password Reset)`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email Service] Password reset email successfully delivered to ${options.toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[Email Service Error] Failed to send email via SMTP:', err.message);
    return { success: false, error: err.message };
  }
}
