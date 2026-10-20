// Panel administratora platformy: zgłoszenia partnerów, biura i ich plany, reklamy, moderacja, użytkownicy.
const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { User, Agency, Listing, Inquiry, PartnerRequest, Ad, Report } = require('../models');
const { uploader, publicUrl, removeFile } = require('../services/upload');
const { slugify } = require('../utils/slug');
const { getCity } = require('../config/locations');
const { AD_PLACEMENTS } = require('../config/property');
const seo = require('../services/seo');
const mailer = require('../services/mailer');
const fmt = require('../utils/format');
const search = require('../services/search');
const charts = require('../services/charts');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAdmin);
router.use(
  wrap(async (req, res, next) => {
    res.locals.layout = 'layouts/admin';
    seo.setSeo(res, { title: 'Administracja', robots: 'noindex,nofollow' });
    const [newPartners, newReports] = await Promise.all([PartnerRequest.countDocuments({ status: 'nowe' }), Report.countDocuments({ status: 'nowe' })]);
    res.locals.badges = { partners: newPartners, reports: newReports };
    next();
  })
);

router.get(
  '/',
  wrap(async (req, res) => {
    const since = new Date(Date.now() - 30 * 864e5);
    const [users, usersNew, agencies, listings, listingsNew, inquiries, ads, partners, perDay] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: since } }),
      Agency.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ createdAt: { $gte: since } }),
      Inquiry.countDocuments({ createdAt: { $gte: since } }),
      Ad.find({ active: true }).lean(),
      PartnerRequest.find().sort({ createdAt: -1 }).limit(6).lean(),
      Listing.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    ]);
    const labels = [], values = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const k = fmt.dayKey(d);
      labels.push(k.slice(8) + '.' + k.slice(5, 7));
      const r = perDay.find((x) => x._id === k);
      values.push(r ? r.n : 0);
    }
    res.render('admin/dashboard', {
      k: { users, usersNew, agencies, listings, listingsNew, inquiries, adImpr: ads.reduce((s, a) => s + a.impressions, 0), adClicks: ads.reduce((s, a) => s + a.clicks, 0) },
      partners,
      chart: charts.barChart({ labels, values, color: '#37908f' })
    });
  })
);

/* ─────────── Zgłoszenia partnerów / reklamy / kontakt ─────────── */
router.get(
  '/zgloszenia',
  wrap(async (req, res) => {
    const q = {};
    if (req.query.typ) q.kind = req.query.typ;
    if (req.query.status) q.status = req.query.status;
    const items = await PartnerRequest.find(q).sort({ createdAt: -1 }).limit(300).lean();
    res.render('admin/requests', { items });
  })
);
router.post(
  '/zgloszenia/:id',
  wrap(async (req, res) => {
    const pr = await PartnerRequest.findById(req.params.id);
    if (!pr) return res.redirect('/admin/zgloszenia');
    if (['nowe', 'kontakt', 'umowa', 'odrzucone'].includes(req.body.status)) pr.status = req.body.status;
    if (req.body.adminNotes !== undefined) pr.adminNotes = String(req.body.adminNotes).slice(0, 4000);
    await pr.save();
    if (req.body.action === 'create-agency') return res.redirect('/admin/biura/nowe?zgloszenie=' + pr._id);
    req.flash('success', 'Zapisano.');
    res.redirect('/admin/zgloszenia');
  })
);

/* ─────────── Biura ─────────── */
router.get(
  '/biura',
  wrap(async (req, res) => {
    const agencies = await Agency.find().sort({ createdAt: -1 }).populate('members.user', 'email name').lean();
    const counts = await Listing.aggregate([{ $match: { status: 'active', agency: { $ne: null } } }, { $group: { _id: '$agency', n: { $sum: 1 } } }]);
    res.render('admin/agencies', { agencies, counts: Object.fromEntries(counts.map((c) => [String(c._id), c.n])) });
  })
);

function planFromBody(b, plan = {}) {
  return {
    name: String(b.planName || plan.name || 'Partner').slice(0, 60),
    microsite: b.microsite === 'on',
    maxListings: Math.max(0, Number(b.maxListings) || 0),
    maxAgents: Math.max(1, Number(b.maxAgents) || 1),
    featuredSlots: Math.max(0, Number(b.featuredSlots) || 0),
    bumpsPerMonth: Math.max(0, Number(b.bumpsPerMonth) || 0),
    xmlImport: b.xmlImport === 'on',
    validUntil: b.validUntil ? new Date(b.validUntil) : undefined,
    notes: String(b.planNotes || '').slice(0, 2000)
  };
}

router.get(
  '/biura/nowe',
  wrap(async (req, res) => {
    let pre = { plan: { maxListings: 50, maxAgents: 5, featuredSlots: 3, bumpsPerMonth: 10 }, microsite: {} };
    let ownerEmail = '';
    if (req.query.zgloszenie) {
      const pr = await PartnerRequest.findById(req.query.zgloszenie).lean();
      if (pr) {
        pre = { ...pre, name: pr.company || pr.name, email: pr.email, phone: pr.phone, partnerRequest: pr._id };
        ownerEmail = pr.email;
        const c = getCity(slugify(pr.city || ''));
        if (c) pre.city = c.slug;
      }
    }
    res.render('admin/agency-form', { a: pre, isNew: true, ownerEmail });
  })
);

async function assignOwner(agency, email) {
  if (!email) return null;
  email = email.toLowerCase().trim();
  let user = await User.findOne({ email });
  let created = false;
  if (!user) {
    user = new User({ email, name: agency.name });
    created = true;
  }
  if (user.agency && String(user.agency) !== String(agency._id)) throw new Error('Użytkownik należy już do innego biura.');
  user.agency = agency._id;
  if (user.role === 'user') user.role = 'agent';
  await user.save();
  if (!agency.memberRole(user._id)) agency.members.push({ user: user._id, role: 'owner' });
  else agency.members.forEach((m) => String(m.user) === String(user._id) && (m.role = 'owner'));
  return { user, created };
}

router.post(
  '/biura/nowe',
  wrap(async (req, res) => {
    const b = req.body;
    const c = getCity(b.city);
    let slug = slugify(b.slug || b.name, 60) || 'biuro';
    if (await Agency.exists({ slug })) slug = slug + '-' + Math.random().toString(36).slice(2, 6);
    const a = new Agency({ name: b.name, slug, city: c && c.slug, voivodeship: c && c.voivodeship, email: b.email, phone: b.phone, nip: b.nip, plan: planFromBody(b), partnerRequest: b.partnerRequest || undefined, status: 'active' });
    try {
      const r = await assignOwner(a, b.ownerEmail);
      await a.save();
      if (b.partnerRequest) await PartnerRequest.updateOne({ _id: b.partnerRequest }, { status: 'umowa', agency: a._id });
      if (r) {
        const link = seo.abs(r.created ? '/zapomnialem-hasla' : '/logowanie');
        await mailer.send({ to: r.user.email, subject: 'Panel biura w ModulioEstate jest aktywny', html: mailer.layout('Witamy wśród partnerów!', `<p>Panel biura <strong>${fmt.escapeHtml(a.name)}</strong> został aktywowany.</p><p>${r.created ? 'Ustaw hasło do konta, korzystając z opcji resetu hasła, lub zaloguj się przez Google na ten adres e-mail.' : 'Zaloguj się, aby rozpocząć.'}</p><p><a href="${link}">${link}</a></p>`) });
      }
      req.flash('success', `Biuro ${a.name} utworzone${r ? ', właściciel: ' + r.user.email : ''}.`);
      res.redirect('/admin/biura/' + a._id);
    } catch (e) {
      req.flash('error', e.message);
      res.redirect('/admin/biura/nowe');
    }
  })
);

router.get(
  '/biura/:id',
  wrap(async (req, res) => {
    const a = await Agency.findById(req.params.id).populate('members.user', 'email name');
    if (!a) return res.redirect('/admin/biura');
    const owner = a.members.find((m) => m.role === 'owner');
    res.render('admin/agency-form', { a, isNew: false, ownerEmail: owner && owner.user ? owner.user.email : '' });
  })
);
router.post(
  '/biura/:id',
  wrap(async (req, res) => {
    const a = await Agency.findById(req.params.id);
    if (!a) return res.redirect('/admin/biura');
    const b = req.body;
    if (b.action === 'delete') {
      if (String(b.confirm || '') !== a.slug) {
        req.flash('error', 'Aby usunąć biuro, wpisz jego adres (slug).');
        return res.redirect('/admin/biura/' + a._id);
      }
      await Listing.updateMany({ agency: a._id }, { status: 'archived' });
      await User.updateMany({ agency: a._id }, { $unset: { agency: 1 }, role: 'user' });
      await a.deleteOne();
      req.flash('success', 'Biuro usunięte, oferty zarchiwizowane.');
      return res.redirect('/admin/biura');
    }
    a.name = b.name || a.name;
    const c = getCity(b.city);
    if (c) {
      a.city = c.slug;
      a.voivodeship = c.voivodeship;
    }
    a.email = b.email;
    a.phone = b.phone;
    a.nip = b.nip;
    a.status = b.status === 'suspended' ? 'suspended' : 'active';
    a.verified = b.verified === 'on';
    a.plan = planFromBody(b, a.plan);
    if (!a.plan.microsite) a.microsite.enabled = false;
    const slug = slugify(b.slug || a.slug, 60);
    if (slug !== a.slug && !(await Agency.exists({ slug, _id: { $ne: a._id } }))) a.slug = slug;
    try {
      if (b.ownerEmail) await assignOwner(a, b.ownerEmail);
      await a.save();
      if (a.status === 'suspended') await Listing.updateMany({ agency: a._id, status: 'active' }, { status: 'draft', moderationNote: 'Biuro zawieszone' });
      req.flash('success', 'Zapisano biuro.');
    } catch (e) {
      req.flash('error', e.message);
    }
    res.redirect('/admin/biura/' + a._id);
  })
);

/* ─────────── Reklamy ─────────── */
router.get(
  '/reklamy',
  wrap(async (req, res) => {
    const ads = await Ad.find().sort({ active: -1, createdAt: -1 }).lean();
    res.render('admin/ads', { ads });
  })
);
const adUpload = uploader('ads', { maxFiles: 2, maxMb: 5 });
router.get('/reklamy/nowa', (req, res) => res.render('admin/ad-form', { ad: { active: true, priority: 1, cities: [], voivodeships: [], placement: req.query.miejsce || 'home_billboard' }, isNew: true }));
router.get(
  '/reklamy/:id',
  wrap(async (req, res) => {
    const ad = await Ad.findById(req.params.id).lean();
    if (!ad) return res.redirect('/admin/reklamy');
    res.render('admin/ad-form', { ad, isNew: false });
  })
);
async function saveAd(req, res, ad) {
  const b = req.body;
  if (b.action === 'delete') {
    removeFile(ad.image);
    removeFile(ad.imageMobile);
    await ad.deleteOne();
    req.flash('success', 'Reklama usunięta.');
    return res.redirect('/admin/reklamy');
  }
  ad.name = String(b.name || 'Reklama').slice(0, 120);
  ad.advertiser = String(b.advertiser || '').slice(0, 120);
  ad.placement = AD_PLACEMENTS[b.placement] ? b.placement : 'home_billboard';
  ad.headline = String(b.headline || '').slice(0, 120);
  ad.text = String(b.text || '').slice(0, 300);
  ad.cta = String(b.cta || '').slice(0, 40);
  ad.url = /^https?:\/\//.test(b.url || '') ? b.url : undefined;
  ad.cities = [].concat(b.cities || []).filter((s) => getCity(s));
  ad.voivodeships = [].concat(b.voivodeships || []).filter((v) => ['pomorskie', 'zachodniopomorskie'].includes(v));
  ad.startsAt = b.startsAt ? new Date(b.startsAt) : undefined;
  ad.endsAt = b.endsAt ? new Date(b.endsAt) : undefined;
  ad.active = b.active === 'on';
  ad.priority = Math.min(10, Math.max(1, Number(b.priority) || 1));
  const files = req.files || {};
  if (files.image && files.image[0]) {
    removeFile(ad.image);
    ad.image = publicUrl('ads', files.image[0]);
  } else if (b.imageUrl && /^https:\/\//.test(b.imageUrl)) ad.image = b.imageUrl;
  if (files.imageMobile && files.imageMobile[0]) {
    removeFile(ad.imageMobile);
    ad.imageMobile = publicUrl('ads', files.imageMobile[0]);
  }
  await ad.save();
  req.flash('success', 'Reklama zapisana.');
  res.redirect('/admin/reklamy');
}
router.post('/reklamy/nowa', adUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'imageMobile', maxCount: 1 }]), verifyCsrf, wrap((req, res) => saveAd(req, res, new Ad({ name: 'x', placement: 'home_billboard' }))));
router.post(
  '/reklamy/:id',
  adUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'imageMobile', maxCount: 1 }]),
  verifyCsrf,
  wrap(async (req, res) => {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.redirect('/admin/reklamy');
    return saveAd(req, res, ad);
  })
);

/* ─────────── Ogłoszenia (moderacja) ─────────── */
router.get(
  '/ogloszenia',
  wrap(async (req, res) => {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.q) {
      const n = Number(req.query.q);
      q.$or = [{ title: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, ''), 'i') }, ...(n ? [{ num: n }] : [])];
    }
    const listings = await Listing.find(q).sort({ createdAt: -1 }).limit(200).populate('agency', 'name slug').populate('owner', 'email').lean();
    res.render('admin/listings', { listings: listings.map(search.withUrl) });
  })
);
router.post(
  '/ogloszenia/:id',
  wrap(async (req, res) => {
    const l = await Listing.findById(req.params.id);
    if (!l) return res.redirect('/admin/ogloszenia');
    if (req.body.action === 'block') {
      l.status = 'blocked';
      l.moderationNote = String(req.body.note || 'Naruszenie regulaminu').slice(0, 500);
    } else if (req.body.action === 'unblock') {
      l.status = 'active';
      l.moderationNote = undefined;
    } else if (req.body.action === 'delete') {
      l.images.forEach((i) => removeFile(i.url));
      await l.deleteOne();
      req.flash('success', 'Ogłoszenie usunięte.');
      return res.redirect(req.get('referer') || '/admin/ogloszenia');
    } else if (req.body.action === 'feature') {
      l.featuredUntil = l.featuredUntil && l.featuredUntil > new Date() ? undefined : new Date(Date.now() + 14 * 864e5);
    }
    await l.save();
    req.flash('success', 'Zapisano.');
    res.redirect(req.get('referer') || '/admin/ogloszenia');
  })
);

/* ─────────── Zgłoszenia naruszeń ─────────── */
router.get(
  '/naruszenia',
  wrap(async (req, res) => {
    const reports = await Report.find().sort({ status: 1, createdAt: -1 }).limit(200).populate('listing', 'title num slug status').lean();
    res.render('admin/reports', { reports });
  })
);
router.post(
  '/naruszenia/:id',
  wrap(async (req, res) => {
    const r = await Report.findById(req.params.id);
    if (r) {
      r.status = ['rozpatrzone', 'odrzucone', 'nowe'].includes(req.body.status) ? req.body.status : r.status;
      r.decision = String(req.body.decision || '').slice(0, 1000);
      await r.save();
      if (req.body.block === 'on' && r.listing) await Listing.updateOne({ _id: r.listing }, { status: 'blocked', moderationNote: r.decision || 'Zgłoszenie użytkownika' });
    }
    res.redirect('/admin/naruszenia');
  })
);

/* ─────────── Użytkownicy ─────────── */
router.get(
  '/uzytkownicy',
  wrap(async (req, res) => {
    const q = {};
    if (req.query.q) q.$or = [{ email: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, ''), 'i') }, { name: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, ''), 'i') }];
    if (req.query.rola) q.role = req.query.rola;
    const users = await User.find(q).sort({ createdAt: -1 }).limit(300).populate('agency', 'name slug').lean();
    res.render('admin/users', { users });
  })
);
router.post(
  '/uzytkownicy/:id',
  wrap(async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) return res.redirect('/admin/uzytkownicy');
    if (String(u._id) === String(req.user._id) && req.body.role !== 'admin') {
      req.flash('error', 'Nie możesz odebrać sobie uprawnień administratora.');
      return res.redirect('/admin/uzytkownicy');
    }
    if (['user', 'agent', 'admin'].includes(req.body.role)) u.role = req.body.role;
    u.blocked = req.body.blocked === 'on';
    await u.save();
    req.flash('success', 'Zapisano użytkownika.');
    res.redirect('/admin/uzytkownicy');
  })
);

module.exports = router;
