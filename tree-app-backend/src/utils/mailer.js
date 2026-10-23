const nodemailer = require('nodemailer');

// ─── Email transport (Gmail SMTP with App Password) ────────────────────────
// Required .env keys:
//   SMTP_USER=yourapp@gmail.com
//   SMTP_PASS=16-char Gmail App Password (Google Account → Security → App passwords)
// Optional: SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465), MAIL_FROM
let transporter = null;

const isEmailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const layout = (title, bodyHtml) => `
<div style="background:#020906;padding:32px 12px;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#0b1f14;border:1px solid #1f5135;border-radius:20px;overflow:hidden;">
    <div style="padding:22px 26px;background:linear-gradient(135deg,#14532d,#15803d);">
      <div style="font-size:22px;font-weight:800;color:#ffffff;">🌿 Vriksha Netra</div>
      <div style="font-size:12px;color:#bbf7d0;margin-top:2px;">AI Plant Recognition &amp; Tree Logging</div>
    </div>
    <div style="padding:26px;color:#e8f5e9;font-size:14px;line-height:1.6;">
      <h2 style="margin:0 0 14px;font-size:19px;color:#ffffff;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:14px 26px;border-top:1px solid #1f5135;font-size:11px;color:#6b8f78;">
      This is an automated message from Vriksha Netra. Please do not reply.
    </div>
  </div>
</div>`;

const sendMail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`📧 [email not configured] Would send "${subject}" to ${to}`);
    return { skipped: true };
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `"Vriksha Netra" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Sent "${subject}" to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error(`📧 Failed to send "${subject}" to ${to}:`, err.message);
    return { error: err.message };
  }
};

const formatWhen = (d = new Date()) =>
  d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';

const sendLoginAlert = (user, { ip, device, method }) =>
  sendMail({
    to: user.email,
    subject: '🔐 New sign-in to your Vriksha Netra account',
    html: layout(
      `Hi ${escapeHtml(user.name)}, you just signed in`,
      `<p>We noticed a new sign-in to your account.</p>
       <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;">
         <tr><td style="padding:6px 0;color:#4ade80;">Method</td><td style="color:#fff;">${escapeHtml(method)}</td></tr>
         <tr><td style="padding:6px 0;color:#4ade80;">Time</td><td style="color:#fff;">${formatWhen()}</td></tr>
         <tr><td style="padding:6px 0;color:#4ade80;">Device</td><td style="color:#fff;">${escapeHtml(device || 'Unknown device')}</td></tr>
         <tr><td style="padding:6px 0;color:#4ade80;">IP address</td><td style="color:#fff;">${escapeHtml(ip || 'Unknown')}</td></tr>
       </table>
       <p style="color:#a7c4b2;">If this was you, no action is needed. If you don't recognise this activity,
       reset your password immediately using <b>Forgot Password</b> in the app.</p>`
    ),
  });

const sendWelcomeEmail = (user) =>
  sendMail({
    to: user.email,
    subject: '🌱 Welcome to Vriksha Netra!',
    html: layout(
      `Welcome aboard, ${escapeHtml(user.name)}!`,
      `<p>Your volunteer account has been created. Every tree you scan and log is now tracked,
       tagged with a QR code, and counts toward your certificate and leaderboard rank.</p>
       <p style="color:#a7c4b2;">Happy planting! 🌳</p>`
    ),
  });

const sendPasswordResetCode = (user, code) =>
  sendMail({
    to: user.email,
    subject: `🔑 ${code} is your Vriksha Netra reset code`,
    html: layout(
      'Reset your password',
      `<p>Hi ${escapeHtml(user.name)}, use this code to reset your password:</p>
       <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#4ade80;background:#020906;
                   border:1px dashed #4ade80;border-radius:14px;text-align:center;padding:16px;margin:18px 0;">${code}</div>
       <p style="color:#a7c4b2;">This code expires in <b>10 minutes</b>. If you didn't request this, you can ignore this email.</p>`
    ),
  });

const sendPasswordChangedEmail = (user) =>
  sendMail({
    to: user.email,
    subject: '✅ Your Vriksha Netra password was changed',
    html: layout(
      'Password changed',
      `<p>Hi ${escapeHtml(user.name)}, your password was changed on ${formatWhen()}.</p>
       <p style="color:#a7c4b2;">If you didn't do this, reset your password immediately and contact your admin.</p>`
    ),
  });

module.exports = {
  isEmailConfigured,
  sendLoginAlert,
  sendWelcomeEmail,
  sendPasswordResetCode,
  sendPasswordChangedEmail,
};
