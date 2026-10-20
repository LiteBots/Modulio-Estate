// Wysyłka e-maili przez SMTP (opcjonalnie). Bez konfiguracji wiadomości trafiają do logów serwera.
const nodemailer = require('nodemailer');
const site = require('../config/site');

let transport = null;
function getTransport() {
  if (transport !== null) return transport;
  if (!process.env.SMTP_HOST) {
    transport = false;
    return transport;
  }
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '') === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transport;
}

function layout(title, body) {
  return `<!doctype html><html lang="pl"><body style="margin:0;background:#f7f6f2;font-family:Arial,sans-serif;color:#18325a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-size:20px;font-weight:700;margin:0 0 24px">Modulio<span style="color:#37908f">esta</span><span style="color:#e9733b">te</span></p>
<div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e7e4dc">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>${body}</div>
<p style="font-size:12px;color:#7a8394;margin-top:20px">${site.name} · ${site.tagline}<br>${site.url}</p></div></body></html>`;
}

async function send({ to, subject, html, text, replyTo }) {
  const t = getTransport();
  if (!t) {
    console.log(`[mail] (SMTP nieskonfigurowane) do: ${to} | ${subject}\n${text || html.replace(/<[^>]+>/g, ' ').slice(0, 600)}`);
    return { skipped: true };
  }
  try {
    return await t.sendMail({ from: process.env.MAIL_FROM || `${site.name} <${site.contact.email}>`, to, subject, html, text, replyTo });
  } catch (e) {
    console.error('[mail] błąd wysyłki:', e.message);
    return { error: e.message };
  }
}

module.exports = { send, layout, enabled: () => !!getTransport() };
