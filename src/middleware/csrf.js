// Ochrona CSRF: token w sesji, sprawdzany przy każdym POST (pole _csrf lub nagłówek X-CSRF-Token).
const crypto = require('crypto');

function ensureToken(req) {
  if (!req.session) return '';
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}

function csrfLocals(req, res, next) {
  res.locals.csrf = ensureToken(req);
  next();
}

function check(req) {
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  const expected = req.session && req.session.csrf;
  if (!sent || !expected || sent.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
}

// Globalny: pomija multipart (sprawdzany po przetworzeniu przez multer – verifyCsrf)
function csrfGuard(req, res, next) {
  if (req.method !== 'POST' || req.is('multipart/form-data')) return next();
  if (check(req)) return next();
  return reject(req, res);
}

function verifyCsrf(req, res, next) {
  if (check(req)) return next();
  return reject(req, res);
}

function reject(req, res) {
  if (req.xhr || (req.get('accept') || '').includes('application/json')) return res.status(403).json({ ok: false, error: 'Sesja wygasła. Odśwież stronę.' });
  if (req.session) req.session.flash = [{ type: 'error', msg: 'Sesja formularza wygasła. Spróbuj ponownie.' }];
  return res.redirect(req.get('referer') || '/');
}

module.exports = { csrfLocals, csrfGuard, verifyCsrf };
