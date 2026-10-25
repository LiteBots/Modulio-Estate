const { Agency } = require('../models');

function requireLogin(req, res, next) {
  if (req.user) return next();
  req.session.returnTo = req.originalUrl;
  req.flash('info', 'Zaloguj się, aby kontynuować.');
  return res.redirect('/logowanie');
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  if (!req.user) return requireLogin(req, res, next);
  return res.status(403).render('pages/error', { code: 403, message: 'Ta część serwisu jest dostępna tylko dla administratorów.' });
}

// Dostęp do panelu biura: użytkownik musi być członkiem aktywnego biura.
async function requireAgency(req, res, next) {
  if (!req.user) return requireLogin(req, res, next);
  if (!req.user.agency) {
    return res.status(403).render('pages/error', {
      code: 403,
      message: 'Twoje konto nie jest przypisane do biura nieruchomości. Aby zostać partnerem, skontaktuj się z nami przez stronę „Zostań partnerem”.',
      cta: { href: '/zostan-partnerem', label: 'Zostań partnerem' }
    });
  }
  const agency = await Agency.findById(req.user.agency).populate('members.user', 'name email avatar phone');
  if (!agency) return res.redirect('/panel');
  const role = agency.memberRole(req.user._id) || (req.user.role === 'admin' ? 'owner' : null);
  if (!role) return res.redirect('/panel');
  if (agency.status !== 'active' && req.user.role !== 'admin') {
    return res.status(403).render('pages/error', { code: 403, message: 'Konto biura jest zawieszone. Skontaktuj się z opiekunem partnera.', cta: { href: '/kontakt', label: 'Kontakt' } });
  }
  req.agency = agency;
  req.agencyRole = role;
  res.locals.agency = agency;
  res.locals.agencyRole = role;
  res.locals.layout = 'layouts/agency';
  next();
}

function requireAgencyManager(req, res, next) {
  if (['owner', 'manager'].includes(req.agencyRole)) return next();
  req.flash('error', 'Ta sekcja jest dostępna dla właściciela lub managera biura.');
  return res.redirect('/biuro-panel');
}

module.exports = { requireLogin, requireAdmin, requireAgency, requireAgencyManager };
