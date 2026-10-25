const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { passport, googleEnabled, promoteIfAdmin } = require('../auth/passport');
const { User, Agency } = require('../models');
const seo = require('../services/seo');
const mailer = require('../services/mailer');
const fmt = require('../utils/format');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.' });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

function afterLoginUrl(req) {
  const back = req.session.returnTo;
  delete req.session.returnTo;
  if (back && back.startsWith('/') && !back.startsWith('//')) return back;
  if (req.user.role === 'admin') return '/admin';
  if (req.user.agency) return '/biuro-panel';
  return '/panel';
}

function noindex(res, title, path) {
  seo.setSeo(res, { title, path, robots: 'noindex,follow' });
}

// Akceptacja zaproszenia do biura po zalogowaniu/rejestracji
async function consumeInvite(req, user) {
  const token = req.session.inviteToken;
  if (!token) return;
  delete req.session.inviteToken;
  const agency = await Agency.findOne({ 'invites.token': token });
  if (!agency) return;
  const inv = agency.invites.find((i) => i.token === token);
  if (!inv || inv.email !== user.email) {
    req.flash('error', 'Zaproszenie dotyczy innego adresu e-mail.');
    return;
  }
  const max = agency.plan.maxAgents || 0;
  if (agency.members.length >= max) {
    req.flash('error', 'Biuro osiągnęło limit kont agentów. Poproś właściciela biura o kontakt z opiekunem.');
    return;
  }
  if (!agency.memberRole(user._id)) agency.members.push({ user: user._id, role: inv.role });
  agency.invites = agency.invites.filter((i) => i.token !== token);
  await agency.save();
  user.agency = agency._id;
  if (user.role === 'user') user.role = 'agent';
  await user.save();
  req.flash('success', `Dołączyłeś do biura ${agency.name}.`);
}

router.get('/logowanie', (req, res) => {
  if (req.user) return res.redirect(afterLoginUrl(req));
  noindex(res, 'Logowanie', '/logowanie');
  res.render('auth/login', { googleEnabled, email: '' });
});

router.post('/logowanie', limiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', (info && info.message) || 'Nie udało się zalogować.');
      return res.redirect('/logowanie');
    }
    const returnTo = req.session.returnTo;
    const invite = req.session.inviteToken;
    req.login(user, async (e) => {
      if (e) return next(e);
      if (returnTo) req.session.returnTo = returnTo;
      if (invite) req.session.inviteToken = invite;
      if (req.body.remember) req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
      try {
        await consumeInvite(req, user);
      } catch (x) {
        console.error(x);
      }
      res.redirect(afterLoginUrl(req));
    });
  })(req, res, next);
});

router.get('/rejestracja', (req, res) => {
  if (req.user) return res.redirect('/panel');
  noindex(res, 'Załóż konto', '/rejestracja');
  res.render('auth/register', { googleEnabled, form: {} });
});

router.post(
  '/rejestracja',
  limiter,
  wrap(async (req, res, next) => {
    const { name, email, password, password2, terms, marketing, website } = req.body;
    if (website) return res.redirect('/');
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Podaj imię i nazwisko.');
    if (!isEmail(email)) errors.push('Podaj poprawny adres e-mail.');
    if (!password || password.length < 8) errors.push('Hasło musi mieć co najmniej 8 znaków.');
    if (password && !/[0-9]/.test(password)) errors.push('Hasło musi zawierać co najmniej jedną cyfrę.');
    if (password !== password2) errors.push('Hasła nie są takie same.');
    if (!terms) errors.push('Zaakceptuj regulamin i politykę prywatności.');
    const exists = isEmail(email) && (await User.findOne({ email: email.toLowerCase().trim() }));
    if (exists) errors.push('Konto z tym adresem już istnieje. Zaloguj się lub zresetuj hasło.');
    if (errors.length) {
      noindex(res, 'Załóż konto', '/rejestracja');
      return res.status(400).render('auth/register', { googleEnabled, form: { name, email }, errors });
    }
    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), marketingConsent: !!marketing, acceptedTermsAt: new Date() });
    await user.setPassword(password);
    await user.save();
    await promoteIfAdmin(user);
    mailer.send({ to: user.email, subject: 'Witaj w ModulioEstate', html: mailer.layout('Konto zostało założone', `<p>Cześć ${fmt.escapeHtml(user.name)},</p><p>Twoje konto w ModulioEstate jest gotowe. Możesz zapisywać ulubione oferty, ustawiać powiadomienia i dodawać ogłoszenia.</p>`) });
    const invite = req.session.inviteToken;
    req.login(user, async (e) => {
      if (e) return next(e);
      if (invite) req.session.inviteToken = invite;
      await consumeInvite(req, user).catch(console.error);
      req.flash('success', 'Konto założone. Witamy w ModulioEstate!');
      res.redirect(afterLoginUrl(req));
    });
  })
);

router.post('/wyloguj', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/'));
  });
});

// Google OAuth
router.get('/auth/google', (req, res, next) => {
  if (!googleEnabled) {
    req.flash('error', 'Logowanie przez Google nie jest jeszcze skonfigurowane.');
    return res.redirect('/logowanie');
  }
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
});
router.get('/auth/google/callback', (req, res, next) => {
  if (!googleEnabled) return res.redirect('/logowanie');
  const returnTo = req.session.returnTo;
  const invite = req.session.inviteToken;
  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', (info && info.message) || 'Logowanie przez Google nie powiodło się.');
      return res.redirect('/logowanie');
    }
    req.login(user, async (e) => {
      if (e) return next(e);
      if (returnTo) req.session.returnTo = returnTo;
      if (invite) req.session.inviteToken = invite;
      await consumeInvite(req, user).catch(console.error);
      res.redirect(afterLoginUrl(req));
    });
  })(req, res, next);
});

// Reset hasła
router.get('/zapomnialem-hasla', (req, res) => {
  noindex(res, 'Reset hasła', '/zapomnialem-hasla');
  res.render('auth/forgot', { sent: false });
});
router.post(
  '/zapomnialem-hasla',
  limiter,
  wrap(async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const user = isEmail(email) && (await User.findOne({ email }));
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
      user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const link = seo.abs('/reset-hasla/' + token);
      await mailer.send({ to: user.email, subject: 'Ustaw nowe hasło – ModulioEstate', html: mailer.layout('Reset hasła', `<p>Otrzymaliśmy prośbę o zmianę hasła. Link jest ważny przez godzinę:</p><p><a href="${link}" style="display:inline-block;background:#17221d;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Ustaw nowe hasło</a></p><p style="color:#7a8394;font-size:13px">Jeśli to nie Ty, zignoruj tę wiadomość.</p>`) });
    }
    noindex(res, 'Reset hasła', '/zapomnialem-hasla');
    res.render('auth/forgot', { sent: true });
  })
);
router.get(
  '/reset-hasla/:token',
  wrap(async (req, res) => {
    const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetToken: hash, resetExpires: { $gt: new Date() } });
    noindex(res, 'Nowe hasło', '/reset-hasla');
    res.render('auth/reset', { valid: !!user, token: req.params.token });
  })
);
router.post(
  '/reset-hasla/:token',
  limiter,
  wrap(async (req, res) => {
    const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetToken: hash, resetExpires: { $gt: new Date() } });
    if (!user) {
      req.flash('error', 'Link wygasł. Poproś o nowy.');
      return res.redirect('/zapomnialem-hasla');
    }
    const { password, password2 } = req.body;
    if (!password || password.length < 8 || !/[0-9]/.test(password) || password !== password2) {
      req.flash('error', 'Hasło musi mieć min. 8 znaków, w tym cyfrę, i oba pola muszą być takie same.');
      return res.redirect('/reset-hasla/' + req.params.token);
    }
    await user.setPassword(password);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    req.flash('success', 'Hasło zmienione. Możesz się zalogować.');
    res.redirect('/logowanie');
  })
);

// Zaproszenie do biura
router.get(
  '/zaproszenie/:token',
  wrap(async (req, res) => {
    const agency = await Agency.findOne({ 'invites.token': req.params.token });
    if (!agency) {
      req.flash('error', 'Zaproszenie jest nieważne lub zostało już wykorzystane.');
      return res.redirect('/');
    }
    const inv = agency.invites.find((i) => i.token === req.params.token);
    req.session.inviteToken = req.params.token;
    if (req.user) {
      await consumeInvite(req, req.user);
      return res.redirect('/biuro-panel');
    }
    noindex(res, 'Zaproszenie do biura', '/zaproszenie');
    res.render('auth/invite', { agency, inv });
  })
);

module.exports = router;
