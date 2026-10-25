// Panel klienta: ulubione, zapisane wyszukiwania, ogłoszenia prywatne, wiadomości, ustawienia, RODO.
const express = require('express');
const router = express.Router();

const { requireLogin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { User, Listing, Inquiry, SavedSearch, StatDaily, Agency } = require('../models');
const { nextSeq } = require('../models/Counter');
const listingForm = require('../services/listingForm');
const { uploader, publicUrl, removeFile } = require('../services/upload');
const search = require('../services/search');
const statsSvc = require('../services/stats');
const charts = require('../services/charts');
const seo = require('../services/seo');
const fmt = require('../utils/format');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const PRIVATE_LIMIT = Number(process.env.PRIVATE_LISTING_LIMIT || 5);
const PRIVATE_DAYS = 60;

router.use(requireLogin);
router.use((req, res, next) => {
  res.locals.layout = 'layouts/panel';
  seo.setSeo(res, { title: 'Mój panel', robots: 'noindex,nofollow' });
  next();
});

async function unreadCount(user) {
  return Inquiry.countDocuments({ $or: [{ fromUser: user._id, readByClient: false }, { toUser: user._id, readBySeller: false }] });
}
router.use(
  wrap(async (req, res, next) => {
    res.locals.unread = await unreadCount(req.user);
    next();
  })
);

// Start konta: ogłoszenia (jeśli użytkownik je ma) albo obserwowane
router.get(
  '/',
  wrap(async (req, res) => {
    const has = await Listing.exists({ owner: req.user._id, agency: { $exists: false } });
    res.redirect(has ? '/panel/ogloszenia' : '/panel/obserwowane');
  })
);

/* Obserwowane: ogłoszenia + zapisane wyszukiwania */
router.get(
  '/obserwowane',
  wrap(async (req, res) => {
    const tab = req.query.tab === 'wyszukiwania' ? 'wyszukiwania' : 'ogloszenia';
    const [listings, searches] = await Promise.all([
      Listing.find({ _id: { $in: req.user.favorites } }).populate('agency', 'name slug logo').lean(),
      SavedSearch.find({ user: req.user._id }).sort({ createdAt: -1 }).lean()
    ]);
    res.render('panel/watched', { tab, listings: listings.map(search.withUrl), searches });
  })
);
router.get('/ulubione', (req, res) => res.redirect('/panel/obserwowane'));
router.get('/wyszukiwania', (req, res) => res.redirect('/panel/obserwowane?tab=wyszukiwania'));
router.post(
  '/wyszukiwania',
  wrap(async (req, res) => {
    const url = String(req.body.url || '');
    if (!/^\/(sprzedaz|wynajem)/.test(url)) return res.redirect('/panel/obserwowane?tab=wyszukiwania');
    const count = await SavedSearch.countDocuments({ user: req.user._id });
    if (count >= 20) {
      req.flash('error', 'Możesz zapisać maksymalnie 20 wyszukiwań.');
      return res.redirect(url);
    }
    await SavedSearch.create({ user: req.user._id, url, name: String(req.body.name || 'Moje wyszukiwanie').slice(0, 120), notify: 'daily' });
    req.flash('success', 'Zapisano. Powiadomimy Cię e-mailem o nowych ogłoszeniach.');
    res.redirect(url);
  })
);
router.post(
  '/wyszukiwania/:id',
  wrap(async (req, res) => {
    const s = await SavedSearch.findOne({ _id: req.params.id, user: req.user._id });
    if (s) {
      if (req.body.action === 'delete') await s.deleteOne();
      else {
        s.notify = ['off', 'daily', 'instant'].includes(req.body.notify) ? req.body.notify : s.notify;
        if (req.body.name) s.name = String(req.body.name).slice(0, 120);
        await s.save();
      }
    }
    res.redirect('/panel/obserwowane?tab=wyszukiwania');
  })
);

/* Moje ogłoszenia (osoba prywatna) */
router.get(
  '/ogloszenia',
  wrap(async (req, res) => {
    const listings = await Listing.find({ owner: req.user._id, agency: { $exists: false } }).sort({ updatedAt: -1 }).lean();
    res.render('panel/listings', { listings: listings.map(search.withUrl), limit: PRIVATE_LIMIT });
  })
);

async function guardPrivateLimit(req, res) {
  const active = await Listing.countDocuments({ owner: req.user._id, agency: { $exists: false }, status: { $in: ['active', 'reserved', 'draft'] } });
  if (active >= PRIVATE_LIMIT) {
    req.flash('error', `Konto prywatne może mieć maksymalnie ${PRIVATE_LIMIT} aktywne ogłoszenia. Zarchiwizuj starsze lub skontaktuj się z nami w sprawie współpracy.`);
    res.redirect('/panel/ogloszenia');
    return false;
  }
  return true;
}

router.get(
  '/ogloszenia/nowe',
  wrap(async (req, res) => {
    if (!(await guardPrivateLimit(req, res))) return;
    res.render('panel/listing-form', { l: { transaction: 'sprzedaz', type: 'mieszkanie', market: 'wtorny', features: [], images: [], contactName: req.user.name, contactPhone: req.user.phone, contactEmail: req.user.email }, isNew: true, action: '/panel/ogloszenia/nowe', errors: [], mode: 'private' });
  })
);

const upload = uploader('listings', { maxFiles: 30 });

router.post(
  '/ogloszenia/nowe',
  upload.array('images', 30),
  verifyCsrf,
  wrap(async (req, res) => {
    if (!(await guardPrivateLimit(req, res))) return;
    const { data, errors } = listingForm.parse(req.body);
    if (errors.length) {
      (req.files || []).forEach((f) => removeFile(publicUrl('listings', f)));
      return res.status(400).render('panel/listing-form', { l: { ...data, images: [] }, isNew: true, action: '/panel/ogloszenia/nowe', errors, mode: 'private' });
    }
    await listingForm.ensureCoords(data);
    const l = new Listing({ ...data, advertiserType: 'prywatny', owner: req.user._id, num: await nextSeq('listing'), status: req.body.saveAs === 'draft' ? 'draft' : 'active', expiresAt: new Date(Date.now() + PRIVATE_DAYS * 864e5) });
    delete l.agency;
    l.agency = undefined;
    l.refNumber = undefined;
    listingForm.applyImages(l, req.body, req.files);
    await l.save();
    if (!req.user.phone && data.contactPhone) await User.updateOne({ _id: req.user._id }, { phone: data.contactPhone });
    req.flash('success', l.status === 'active' ? 'Ogłoszenie opublikowane.' : 'Szkic zapisany.');
    res.redirect('/panel/ogloszenia');
  })
);

async function ownListing(req, res) {
  const l = await Listing.findOne({ _id: req.params.id, owner: req.user._id, agency: { $exists: false } });
  if (!l) {
    res.status(404).render('pages/error', { code: 404, message: 'Nie znaleziono ogłoszenia.' });
    return null;
  }
  return l;
}

router.get(
  '/ogloszenia/:id/edytuj',
  wrap(async (req, res) => {
    const l = await ownListing(req, res);
    if (!l) return;
    res.render('panel/listing-form', { l, isNew: false, action: `/panel/ogloszenia/${l._id}/edytuj`, errors: [], mode: 'private' });
  })
);
router.post(
  '/ogloszenia/:id/edytuj',
  upload.array('images', 30),
  verifyCsrf,
  wrap(async (req, res) => {
    const l = await ownListing(req, res);
    if (!l) return;
    const { data, errors } = listingForm.parse(req.body);
    if (errors.length) {
      (req.files || []).forEach((f) => removeFile(publicUrl('listings', f)));
      return res.status(400).render('panel/listing-form', { l: Object.assign(l, data), isNew: false, action: `/panel/ogloszenia/${l._id}/edytuj`, errors, mode: 'private' });
    }
    delete data.refNumber;
    data.advertiserType = 'prywatny';
    await listingForm.ensureCoords(data, l);
    l.set(data);
    listingForm.applyImages(l, req.body, req.files);
    if (l.status === 'blocked') {
      req.flash('error', 'Ogłoszenie jest zablokowane przez moderację.');
    }
    await l.save();
    req.flash('success', 'Zmiany zapisane.');
    res.redirect('/panel/ogloszenia');
  })
);
router.post(
  '/ogloszenia/:id/status',
  wrap(async (req, res) => {
    const l = await ownListing(req, res);
    if (!l) return;
    const act = req.body.action;
    if (l.status === 'blocked') req.flash('error', 'Ogłoszenie zablokowane – skontaktuj się z nami.');
    else if (act === 'publish') {
      l.status = 'active';
      l.expiresAt = new Date(Date.now() + PRIVATE_DAYS * 864e5);
    } else if (act === 'extend') {
      l.expiresAt = new Date(Date.now() + PRIVATE_DAYS * 864e5);
      l.bumpedAt = new Date();
      if (l.status === 'archived') l.status = 'active';
    } else if (['reserved', 'sold', 'archived', 'draft'].includes(act)) l.status = act;
    else if (act === 'delete') {
      l.images.forEach((i) => removeFile(i.url));
      await l.deleteOne();
      req.flash('success', 'Ogłoszenie usunięte.');
      return res.redirect('/panel/ogloszenia');
    }
    await l.save();
    req.flash('success', 'Status zaktualizowany.');
    res.redirect('/panel/ogloszenia');
  })
);

/* Wiadomości */
router.get(
  '/wiadomosci',
  wrap(async (req, res) => {
    const box = req.query.skrzynka === 'odebrane' ? 'odebrane' : 'wyslane';
    const q = box === 'odebrane' ? { toUser: req.user._id } : { fromUser: req.user._id };
    const items = await Inquiry.find(q).sort({ updatedAt: -1 }).populate('listing', 'title num slug images type city cityName').populate('agency', 'name slug').lean();
    res.render('panel/messages', { items, box });
  })
);
router.get(
  '/wiadomosci/:id',
  wrap(async (req, res) => {
    const inq = await Inquiry.findOne({ _id: req.params.id, $or: [{ fromUser: req.user._id }, { toUser: req.user._id }] }).populate('listing', 'title num slug images price transaction cityName').populate('agency', 'name slug logo');
    if (!inq) return res.status(404).render('pages/error', { code: 404, message: 'Nie znaleziono wiadomości.' });
    const side = String(inq.toUser) === String(req.user._id) ? 'seller' : 'client';
    if (side === 'seller' && !inq.readBySeller) inq.readBySeller = true;
    if (side === 'client' && !inq.readByClient) inq.readByClient = true;
    await inq.save();
    res.render('panel/message', { inq, side });
  })
);
router.post(
  '/wiadomosci/:id',
  wrap(async (req, res) => {
    const inq = await Inquiry.findOne({ _id: req.params.id, $or: [{ fromUser: req.user._id }, { toUser: req.user._id }] });
    if (!inq) return res.redirect('/panel/wiadomosci');
    const text = String(req.body.text || '').trim().slice(0, 4000);
    if (text) {
      const side = String(inq.toUser) === String(req.user._id) ? 'seller' : 'client';
      inq.replies.push({ author: req.user._id, authorName: req.user.name, side, text });
      if (side === 'seller') {
        inq.readByClient = false;
        if (inq.status === 'nowe') inq.status = 'w_kontakcie';
      } else inq.readBySeller = false;
      await inq.save();
    }
    res.redirect('/panel/wiadomosci/' + inq._id + '#koniec');
  })
);

/* Ustawienia + RODO */
router.get('/ustawienia', (req, res) => res.render('panel/settings', {}));
const avatarUpload = uploader('avatars', { maxFiles: 1, maxMb: 3 });
router.post(
  '/ustawienia/profil',
  avatarUpload.single('avatar'),
  verifyCsrf,
  wrap(async (req, res) => {
    const u = req.user;
    u.name = String(req.body.name || u.name).trim().slice(0, 120);
    u.phone = String(req.body.phone || '').trim().slice(0, 40);
    u.city = req.body.city || undefined;
    u.notifyEmail = req.body.notifyEmail === 'on';
    u.marketingConsent = req.body.marketingConsent === 'on';
    if (req.file) {
      if (u.avatar) removeFile(u.avatar);
      u.avatar = publicUrl('avatars', req.file);
    }
    await u.save();
    req.flash('success', 'Profil zapisany.');
    res.redirect('/panel/ustawienia');
  })
);
router.post(
  '/ustawienia/haslo',
  wrap(async (req, res) => {
    const u = req.user;
    const { current, password, password2 } = req.body;
    if (u.passwordHash && !(await u.checkPassword(current || ''))) {
      req.flash('error', 'Obecne hasło jest nieprawidłowe.');
      return res.redirect('/panel/ustawienia#haslo');
    }
    if (!password || password.length < 8 || !/[0-9]/.test(password) || password !== password2) {
      req.flash('error', 'Nowe hasło: min. 8 znaków, w tym cyfra; oba pola muszą być takie same.');
      return res.redirect('/panel/ustawienia#haslo');
    }
    await u.setPassword(password);
    await u.save();
    req.flash('success', 'Hasło zmienione.');
    res.redirect('/panel/ustawienia');
  })
);
router.get(
  '/ustawienia/eksport',
  wrap(async (req, res) => {
    const u = req.user;
    const [listings, inquiries, searches] = await Promise.all([Listing.find({ owner: u._id }).lean(), Inquiry.find({ fromUser: u._id }).lean(), SavedSearch.find({ user: u._id }).lean()]);
    const data = { exportedAt: new Date(), account: { name: u.name, email: u.email, phone: u.phone, city: u.city, createdAt: u.createdAt, marketingConsent: u.marketingConsent }, favorites: u.favorites, listings, inquiries, savedSearches: searches };
    res.setHeader('Content-Disposition', 'attachment; filename="modulioestate-moje-dane.json"');
    res.json(data);
  })
);
router.post(
  '/ustawienia/usun-konto',
  wrap(async (req, res, next) => {
    const u = req.user;
    if (String(req.body.confirm || '').trim().toUpperCase() !== 'USUŃ') {
      req.flash('error', 'Aby usunąć konto, wpisz słowo USUŃ.');
      return res.redirect('/panel/ustawienia#usun');
    }
    if (u.agency) {
      const ag = await Agency.findById(u.agency);
      if (ag && ag.memberRole(u._id) === 'owner') {
        req.flash('error', 'Jesteś właścicielem biura. Przekaż własność lub skontaktuj się z nami przed usunięciem konta.');
        return res.redirect('/panel/ustawienia#usun');
      }
      if (ag) {
        ag.members = ag.members.filter((m) => String(m.user) !== String(u._id));
        await ag.save();
      }
    }
    const own = await Listing.find({ owner: u._id, agency: { $exists: false } });
    own.forEach((l) => l.images.forEach((i) => removeFile(i.url)));
    await Listing.deleteMany({ owner: u._id, agency: { $exists: false } });
    await Promise.all([SavedSearch.deleteMany({ user: u._id }), Inquiry.updateMany({ fromUser: u._id }, { $unset: { fromUser: 1 } }), StatDaily.deleteMany({ owner: u._id, agency: null })]);
    if (u.avatar) removeFile(u.avatar);
    await User.deleteOne({ _id: u._id });
    req.logout(() => req.session.destroy(() => res.redirect('/?konto=usuniete')));
  })
);

module.exports = router;
