// Dostęp do panelu administratora kodem ADMIN_PIN (Railway → Variables).
// Kod sprawdzamy w stałym czasie (skróty SHA-256 + timingSafeEqual), sesja admina wygasa po ADMIN_SESSION_HOURS (domyślnie 12 h).
const crypto = require('crypto');

const MIN_LENGTH = 4;

function sessionHours() {
  const h = Number(process.env.ADMIN_SESSION_HOURS);
  return h > 0 && h <= 24 * 30 ? h : 12;
}

function configuredPin() {
  return String(process.env.ADMIN_PIN || '').trim();
}

function pinConfigured() {
  return configuredPin().length >= MIN_LENGTH;
}

function pinMatches(input) {
  if (!pinConfigured()) return false;
  const a = crypto.createHash('sha256').update(String(input || '').trim()).digest();
  const b = crypto.createHash('sha256').update(configuredPin()).digest();
  return crypto.timingSafeEqual(a, b);
}

// Odcisk aktualnego kodu (z SESSION_SECRET): po zmianie ADMIN_PIN wcześniejsze wejścia do panelu od razu tracą ważność.
function pinFingerprint() {
  return crypto.createHmac('sha256', String(process.env.SESSION_SECRET || 'np')).update(configuredPin()).digest('hex').slice(0, 24);
}

function isAdminSession(req) {
  const s = req.session;
  return !!(s && s.adminPinOk && s.adminPinAt && s.adminPinFp === pinFingerprint() && Date.now() - s.adminPinAt < sessionHours() * 3600 * 1000);
}

function grantAdmin(req) {
  req.session.adminPinOk = true;
  req.session.adminPinAt = Date.now();
  req.session.adminPinFp = pinFingerprint();
  delete req.session.csrf; // nowy token CSRF po zalogowaniu
}

function revokeAdmin(req) {
  if (!req.session) return;
  delete req.session.adminPinOk;
  delete req.session.adminPinAt;
  delete req.session.adminPinFp;
}

function requireAdminPin(req, res, next) {
  if (!pinConfigured()) {
    return res.status(503).render('pages/error', {
      code: 503,
      message: `Panel administratora jest wyłączony. Ustaw zmienną ADMIN_PIN w Railway → Variables (co najmniej ${MIN_LENGTH} znaki) i uruchom ponownie usługę.`
    });
  }
  if (isAdminSession(req)) {
    res.locals.isAdmin = true;
    return next();
  }
  revokeAdmin(req);
  if (req.method === 'GET') req.session.adminReturnTo = req.originalUrl;
  return res.redirect('/admin/logowanie');
}

module.exports = { pinConfigured, pinMatches, isAdminSession, grantAdmin, revokeAdmin, requireAdminPin, MIN_LENGTH };
