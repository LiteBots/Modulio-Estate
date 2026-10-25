// Panel biura nieruchomości: ogłoszenia, CRM zapytań, zespół, profil, strona biura, statystyki, współpraca.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { requireAgency, requireAgencyManager } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { Listing, Inquiry, User, StatDaily } = require('../models');
const { nextSeq } = require('../models/Counter');
const listingForm = require('../services/listingForm');
const { uploader, publicUrl, removeFile } = require('../services/upload');
const search = require('../services/search');
const statsSvc = require('../services/stats');
const charts = require('../services/charts');
const mailer = require('../services/mailer');
const seo = require('../services/seo');
const fmt = require('../utils/format');
const { slugify } = require('../utils/slug');
const { getCity } = require('../config/locations');
const { LEAD_STATUS } = require('../config/property');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(wrap(requireAgency));
router.use(
  wrap(async (req, res, next) => {
    seo.setSeo(res, { title: 'Panel biura', robots: 'noindex,nofollow' });
    res.locals.newLeads = await Inquiry.countDocuments({ agency: req.agency._id, status: 'nowe' });
    res.locals.isManager = ['owner', 'manager'].includes(req.agencyRole);
    next();
  })
);

const ACTIVE = ['active', 'reserved', 'draft'];
const monthKey = () => new Date().toISOString().slice(0, 7);

async function usage(agency) {
  const now = new Date();
  const [listings, featured] = await Promise.all([
    Listing.countDocuments({ agency: agency._id, status: { $in: ACTIVE } }),
    Listing.countDocuments({ agency: agency._id, status: 'active', featuredUntil: { $gt: now } })
  ]);
  const bumpsUsed = agency.usage.bumpsMonth === monthKey() ? agency.usage.bumpsUsed : 0;
  return { listings, featured, bumpsUsed };
}

/* ─────────── Pulpit ─────────── */
router.get(
  '/',
  wrap(async (req, res) => {
    const a = req.agency;
    const [u, series, leads, top, expiring, byStatus] = await Promise.all([
      usage(a),
      statsSvc.series({ agency: a._id }, 30),
      Inquiry.find({ agency: a._id }).sort({ createdAt: -1 }).limit(6).populate('listing', 'title num slug').lean(),
      Listing.find({ agency: a._id, status: 'active' }).sort({ views: -1 }).limit(5).lean(),
      Listing.find({ agency: a._id, status: 'active', expiresAt: { $lt: new Date(Date.now() + 7 * 864e5) } }).limit(5).lean(),
      Inquiry.aggregate([{ $match: { agency: a._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }])
    ]);
    const chart = charts.lineChart({
      labels: series.labels,
      series: [
        { name: 'Wyświetlenia', color: '#4f7560', values: series.views },
        { name: 'Telefony', color: '#ff7b1c', values: series.phone },
        { name: 'Zapytania', color: '#17221d', values: series.inquiries }
      ],
      height: 240
    });
    const sum = (arr) => arr.reduce((x, y) => x + y, 0);
    res.render('agency/dashboard', {
      u,
      chart,
      kpi: { views: sum(series.views), phone: sum(series.phone), inquiries: sum(series.inquiries) },
      sparks: { views: charts.sparkline(series.views.slice(-14), '#4f7560'), phone: charts.sparkline(series.phone.slice(-14), '#ff7b1c'), inquiries: charts.sparkline(series.inquiries.slice(-14), '#17221d') },
      leads,
      top: top.map(search.withUrl),
      expiring: expiring.map(search.withUrl),
      pipeline: Object.fromEntries(byStatus.map((x) => [x._id, x.n]))
    });
  })
);

/* ─────────── Ogłoszenia ─────────── */
router.get(
  '/ogloszenia',
  wrap(async (req, res) => {
    const a = req.agency;
    const q = { agency: a._id };
    const st = req.query.status;
    if (st && st !== 'wszystkie') q.status = st;
    else q.status = { $ne: 'archived' };
    if (req.query.agent && /^[a-f0-9]{24}$/.test(req.query.agent)) q.agent = req.query.agent;
    if (req.query.q) q.$or = [{ title: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, ''), 'i') }, { refNumber: String(req.query.q) }];
    const [listings, u, counts] = await Promise.all([
      Listing.find(q).sort({ updatedAt: -1 }).limit(200).populate('agent', 'name').lean(),
      usage(a),
      Listing.aggregate([{ $match: { agency: a._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }])
    ]);
    res.render('agency/listings', { listings: listings.map(search.withUrl), u, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), st: st || '' });
  })
);

const upload = uploader('listings', { maxFiles: 40 });

function agentsOf(agency) {
  return agency.members.filter((m) => m.user).map((m) => ({ id: String(m.user._id), name: m.user.name || m.user.email }));
}

router.get(
  '/ogloszenia/nowe',
  wrap(async (req, res) => {
    const u = await usage(req.agency);
    if (u.listings >= req.agency.plan.maxListings) {
      req.flash('error', `Osiągnięto limit ${req.agency.plan.maxListings} ogłoszeń. Skontaktuj się z opiekunem, aby go zwiększyć.`);
      return res.redirect('/biuro-panel/ogloszenia');
    }
    const a = req.agency;
    res.render('agency/listing-form', { l: { transaction: 'sprzedaz', type: 'mieszkanie', market: 'wtorny', features: [], images: [], city: a.city, agent: req.user._id, contactPhone: '', contactEmail: '' }, isNew: true, action: '/biuro-panel/ogloszenia/nowe', errors: [], mode: 'agency', agents: agentsOf(a) });
  })
);

function pickAgent(req) {
  const id = req.body.agent;
  const ok = req.agency.members.some((m) => m.user && String(m.user._id) === String(id));
  return ok ? id : req.user._id;
}

router.post(
  '/ogloszenia/nowe',
  upload.array('images', 40),
  verifyCsrf,
  wrap(async (req, res) => {
    const a = req.agency;
    const u = await usage(a);
    if (u.listings >= a.plan.maxListings) {
      (req.files || []).forEach((f) => removeFile(publicUrl('listings', f)));
      req.flash('error', 'Osiągnięto limit ogłoszeń w planie biura.');
      return res.redirect('/biuro-panel/ogloszenia');
    }
    const { data, errors } = listingForm.parse(req.body);
    if (errors.length) {
      (req.files || []).forEach((f) => removeFile(publicUrl('listings', f)));
      return res.status(400).render('agency/listing-form', { l: { ...data, images: [], agent: req.body.agent }, isNew: true, action: '/biuro-panel/ogloszenia/nowe', errors, mode: 'agency', agents: agentsOf(a) });
    }
    const l = new Listing({ ...data, agency: a._id, owner: req.user._id, agent: pickAgent(req), num: await nextSeq('listing'), status: req.body.saveAs === 'draft' ? 'draft' : 'active', expiresAt: new Date(Date.now() + 90 * 864e5) });
    listingForm.applyImages(l, req.body, req.files);
    await l.save();
    req.flash('success', l.status === 'active' ? `Ogłoszenie opublikowane (nr ${l.num}).` : 'Szkic zapisany.');
    res.redirect('/biuro-panel/ogloszenia');
  })
);

async function agencyListing(req, res) {
  const l = await Listing.findOne({ _id: req.params.id, agency: req.agency._id });
  if (!l) {
    res.status(404).render('pages/error', { code: 404, message: 'Nie znaleziono ogłoszenia biura.' });
    return null;
  }
  // agent może edytować tylko swoje oferty
  if (req.agencyRole === 'agent' && String(l.agent) !== String(req.user._id) && String(l.owner) !== String(req.user._id)) {
    req.flash('error', 'Możesz edytować tylko swoje oferty.');
    res.redirect('/biuro-panel/ogloszenia');
    return null;
  }
  return l;
}

router.get(
  '/ogloszenia/:id/edytuj',
  wrap(async (req, res) => {
    const l = await agencyListing(req, res);
    if (!l) return;
    res.render('agency/listing-form', { l, isNew: false, action: `/biuro-panel/ogloszenia/${l._id}/edytuj`, errors: [], mode: 'agency', agents: agentsOf(req.agency) });
  })
);
router.post(
  '/ogloszenia/:id/edytuj',
  upload.array('images', 40),
  verifyCsrf,
  wrap(async (req, res) => {
    const l = await agencyListing(req, res);
    if (!l) return;
    const { data, errors } = listingForm.parse(req.body);
    if (errors.length) {
      (req.files || []).forEach((f) => removeFile(publicUrl('listings', f)));
      return res.status(400).render('agency/listing-form', { l: Object.assign(l, data), isNew: false, action: `/biuro-panel/ogloszenia/${l._id}/edytuj`, errors, mode: 'agency', agents: agentsOf(req.agency) });
    }
    l.set(data);
    l.agent = pickAgent(req);
    listingForm.applyImages(l, req.body, req.files);
    await l.save();
    req.flash('success', 'Zmiany zapisane.');
    res.redirect('/biuro-panel/ogloszenia');
  })
);

router.post(
  '/ogloszenia/:id/akcja',
  wrap(async (req, res) => {
    const l = await agencyListing(req, res);
    if (!l) return;
    const a = req.agency;
    const act = req.body.action;
    const back = req.get('referer') && req.get('referer').includes('/biuro-panel') ? req.get('referer') : '/biuro-panel/ogloszenia';
    if (l.status === 'blocked') {
      req.flash('error', 'Ogłoszenie zablokowane przez moderację: ' + (l.moderationNote || 'skontaktuj się z opiekunem.'));
      return res.redirect(back);
    }
    if (['active', 'reserved', 'sold', 'archived', 'draft'].includes(act)) {
      if (act === 'active' && !['active', 'reserved'].includes(l.status)) {
        const u = await usage(a);
        if (u.listings >= a.plan.maxListings && l.status === 'archived') {
          req.flash('error', 'Limit aktywnych ogłoszeń wyczerpany.');
          return res.redirect(back);
        }
        l.expiresAt = new Date(Date.now() + 90 * 864e5);
      }
      l.status = act;
      if (act !== 'active') l.featuredUntil = undefined;
      req.flash('success', 'Status zmieniony.');
    } else if (act === 'feature') {
      if (l.featuredUntil && l.featuredUntil > new Date()) {
        l.featuredUntil = undefined;
        req.flash('success', 'Wyróżnienie zdjęte – slot jest wolny.');
      } else {
        const u = await usage(a);
        if (u.featured >= a.plan.featuredSlots) {
          req.flash('error', `Wykorzystano wszystkie sloty wyróżnień (${a.plan.featuredSlots}). Zdejmij wyróżnienie z innej oferty.`);
          return res.redirect(back);
        }
        l.featuredUntil = new Date(Date.now() + 14 * 864e5);
        req.flash('success', 'Oferta wyróżniona na 14 dni.');
      }
    } else if (act === 'bump') {
      const mk = monthKey();
      if (a.usage.bumpsMonth !== mk) {
        a.usage.bumpsMonth = mk;
        a.usage.bumpsUsed = 0;
      }
      if (a.usage.bumpsUsed >= a.plan.bumpsPerMonth) {
        req.flash('error', 'Wykorzystano limit podbić w tym miesiącu.');
        return res.redirect(back);
      }
      a.usage.bumpsUsed += 1;
      await a.save();
      l.bumpedAt = new Date();
      req.flash('success', 'Oferta podbita na górę wyników.');
    } else if (act === 'duplicate') {
      const u = await usage(a);
      if (u.listings >= a.plan.maxListings) {
        req.flash('error', 'Limit ogłoszeń wyczerpany.');
        return res.redirect(back);
      }
      const obj = l.toObject();
      ['_id', 'num', 'createdAt', 'updatedAt', 'views', 'phoneReveals', 'inquiriesCount', 'favoritesCount', 'featuredUntil', 'publishedAt'].forEach((k) => delete obj[k]);
      const copy = new Listing({ ...obj, title: (obj.title + ' (kopia)').slice(0, 140), status: 'draft', num: await nextSeq('listing'), images: [] });
      await copy.save();
      req.flash('success', 'Utworzono kopię jako szkic (bez zdjęć).');
      return res.redirect(`/biuro-panel/ogloszenia/${copy._id}/edytuj`);
    } else if (act === 'delete') {
      if (!res.locals.isManager) {
        req.flash('error', 'Usuwać ogłoszenia może właściciel lub manager. Możesz przenieść ofertę do archiwum.');
        return res.redirect(back);
      }
      l.images.forEach((i) => removeFile(i.url));
      await StatDaily.deleteMany({ listing: l._id });
      await l.deleteOne();
      req.flash('success', 'Ogłoszenie usunięte.');
      return res.redirect('/biuro-panel/ogloszenia');
    }
    await l.save();
    res.redirect(back);
  })
);

/* ─────────── CRM zapytań ─────────── */
router.get(
  '/zapytania',
  wrap(async (req, res) => {
    const q = { agency: req.agency._id };
    if (req.agencyRole === 'agent' || req.query.moje === '1') q.$or = [{ assignedTo: req.user._id }, { assignedTo: { $exists: false } }];
    const leads = await Inquiry.find(q).sort({ updatedAt: -1 }).limit(400).populate('listing', 'title num slug price transaction cityName').populate('assignedTo', 'name').lean();
    const columns = Object.keys(LEAD_STATUS).map((k) => ({ key: k, ...LEAD_STATUS[k], items: leads.filter((l) => l.status === k) }));
    res.render('agency/leads', { columns, view: req.query.widok === 'lista' ? 'lista' : 'tablica', leads });
  })
);
router.get(
  '/zapytania/:id',
  wrap(async (req, res) => {
    const lead = await Inquiry.findOne({ _id: req.params.id, agency: req.agency._id }).populate('listing', 'title num slug price transaction cityName images type').populate('assignedTo', 'name').populate('notes.author', 'name');
    if (!lead) return res.status(404).render('pages/error', { code: 404, message: 'Nie znaleziono zapytania.' });
    if (!lead.readBySeller) {
      lead.readBySeller = true;
      await lead.save();
    }
    const history = await Inquiry.find({ agency: req.agency._id, email: lead.email, _id: { $ne: lead._id } }).sort({ createdAt: -1 }).limit(10).populate('listing', 'title num slug').lean();
    res.render('agency/lead', { lead, history, agents: agentsOf(req.agency) });
  })
);
router.post(
  '/zapytania/:id',
  wrap(async (req, res) => {
    const lead = await Inquiry.findOne({ _id: req.params.id, agency: req.agency._id }).populate('listing', 'title num slug');
    if (!lead) return res.redirect('/biuro-panel/zapytania');
    const b = req.body;
    if (b.status && LEAD_STATUS[b.status]) lead.status = b.status;
    if (b.assignedTo !== undefined) lead.assignedTo = req.agency.members.some((m) => m.user && String(m.user._id) === b.assignedTo) ? b.assignedTo : undefined;
    if (b.presentationAt !== undefined) lead.presentationAt = b.presentationAt ? new Date(b.presentationAt) : undefined;
    if (b.note && b.note.trim()) lead.notes.push({ author: req.user._id, authorName: req.user.name, text: b.note.trim().slice(0, 2000) });
    if (b.reply && b.reply.trim()) {
      const text = b.reply.trim().slice(0, 4000);
      lead.replies.push({ author: req.user._id, authorName: `${req.user.name} (${req.agency.name})`, side: 'seller', text });
      lead.readByClient = false;
      if (lead.status === 'nowe') lead.status = 'w_kontakcie';
      await mailer.send({
        to: lead.email,
        replyTo: req.user.email,
        subject: `Odpowiedź od ${req.agency.name}${lead.listing ? ': ' + lead.listing.title : ''}`,
        html: mailer.layout(`Odpowiedź od ${fmt.escapeHtml(req.agency.name)}`, `<p>${fmt.escapeHtml(text).replace(/\n/g, '<br>')}</p><p style="color:#7a8394">${fmt.escapeHtml(req.user.name)} · ${fmt.escapeHtml(req.agency.phone || '')}</p>${lead.fromUser ? `<p><a href="${seo.abs('/panel/wiadomosci/' + lead._id)}">Zobacz rozmowę w ModulioEstate</a></p>` : ''}`)
      });
      req.flash('success', 'Odpowiedź wysłana do klienta.');
    } else req.flash('success', 'Zapisano.');
    await lead.save();
    res.redirect('/biuro-panel/zapytania/' + lead._id);
  })
);

/* ─────────── Zespół ─────────── */
router.get('/zespol', (req, res) => res.render('agency/team', { inviteLink: req.query.link || '' }));
router.post(
  '/zespol/zapros',
  requireAgencyManager,
  wrap(async (req, res) => {
    const a = req.agency;
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      req.flash('error', 'Podaj poprawny e-mail.');
      return res.redirect('/biuro-panel/zespol');
    }
    if (a.members.length + a.invites.length >= a.plan.maxAgents) {
      req.flash('error', `Limit kont w planie biura: ${a.plan.maxAgents}. Skontaktuj się z opiekunem, aby go zwiększyć.`);
      return res.redirect('/biuro-panel/zespol');
    }
    const existing = await User.findOne({ email });
    if (existing && existing.agency && String(existing.agency) !== String(a._id)) {
      req.flash('error', 'Ten użytkownik należy już do innego biura.');
      return res.redirect('/biuro-panel/zespol');
    }
    const token = crypto.randomBytes(20).toString('hex');
    a.invites = a.invites.filter((i) => i.email !== email);
    a.invites.push({ email, role: req.body.role === 'manager' && req.agencyRole === 'owner' ? 'manager' : 'agent', token });
    await a.save();
    const link = seo.abs('/zaproszenie/' + token);
    await mailer.send({ to: email, subject: `Zaproszenie do zespołu ${a.name} w ModulioEstate`, html: mailer.layout('Zaproszenie do biura', `<p>${fmt.escapeHtml(req.user.name)} zaprasza Cię do zespołu <strong>${fmt.escapeHtml(a.name)}</strong>.</p><p><a href="${link}" style="display:inline-block;background:#17221d;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Przyjmij zaproszenie</a></p>`) });
    req.flash('success', `Zaproszenie wysłane na ${email}.`);
    res.redirect('/biuro-panel/zespol?link=' + encodeURIComponent(link));
  })
);
router.post(
  '/zespol/:userId',
  requireAgencyManager,
  wrap(async (req, res) => {
    const a = req.agency;
    const m = a.members.find((x) => x.user && String(x.user._id) === req.params.userId);
    if (req.body.action === 'cancel-invite') {
      a.invites = a.invites.filter((i) => String(i._id) !== req.params.userId);
      await a.save();
      return res.redirect('/biuro-panel/zespol');
    }
    if (!m) return res.redirect('/biuro-panel/zespol');
    if (req.body.action === 'remove') {
      if (m.role === 'owner') {
        req.flash('error', 'Nie można usunąć właściciela biura.');
        return res.redirect('/biuro-panel/zespol');
      }
      a.members = a.members.filter((x) => x !== m);
      await User.updateOne({ _id: m.user._id }, { $unset: { agency: 1 }, role: 'user' });
      await Listing.updateMany({ agency: a._id, agent: m.user._id }, { agent: req.user._id });
      req.flash('success', 'Użytkownik usunięty z zespołu. Jego oferty przypisano do Ciebie.');
    } else {
      m.title = String(req.body.title || '').slice(0, 80);
      m.phone = String(req.body.phone || '').slice(0, 40);
      m.bio = String(req.body.bio || '').slice(0, 600);
      m.showOnSite = req.body.showOnSite === 'on';
      if (req.agencyRole === 'owner' && m.role !== 'owner' && ['manager', 'agent'].includes(req.body.role)) m.role = req.body.role;
      req.flash('success', 'Zapisano.');
    }
    await a.save();
    res.redirect('/biuro-panel/zespol');
  })
);

/* ─────────── Profil biura ─────────── */
const brandUpload = uploader('agencies', { maxFiles: 2, maxMb: 6 });
router.get('/profil', requireAgencyManager, (req, res) => res.render('agency/profile', {}));
router.post(
  '/profil',
  requireAgencyManager,
  brandUpload.fields([{ name: 'logo', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  verifyCsrf,
  wrap(async (req, res) => {
    const a = req.agency;
    const b = req.body;
    const str = (v, n) => String(v || '').trim().slice(0, n) || undefined;
    a.name = str(b.name, 120) || a.name;
    a.shortDescription = str(b.shortDescription, 240);
    a.about = str(b.about, 8000);
    a.address = str(b.address, 200);
    const c = getCity(b.city);
    if (c) {
      a.city = c.slug;
      a.voivodeship = c.voivodeship;
    }
    a.serviceAreas = [].concat(b.serviceAreas || []).filter((s) => getCity(s)).slice(0, 40);
    a.phone = str(b.phone, 40);
    a.email = str(b.email, 120);
    a.website = /^https?:\/\//.test(b.website || '') ? str(b.website, 200) : undefined;
    a.nip = str(b.nip, 20);
    a.licenseInfo = str(b.licenseInfo, 300);
    a.openingHours = str(b.openingHours, 200);
    a.brandColor = /^#[0-9a-f]{6}$/i.test(b.brandColor || '') ? b.brandColor : a.brandColor;
    a.socials = {};
    ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'].forEach((k) => {
      if (/^https:\/\//.test(b[k] || '')) a.socials[k] = str(b[k], 200);
    });
    const files = req.files || {};
    if (files.logo && files.logo[0]) {
      if (a.logo) removeFile(a.logo);
      a.logo = publicUrl('agencies', files.logo[0]);
    }
    if (files.cover && files.cover[0]) {
      if (a.cover) removeFile(a.cover);
      a.cover = publicUrl('agencies', files.cover[0]);
    }
    if (b.removeCover === 'on' && a.cover) {
      removeFile(a.cover);
      a.cover = undefined;
    }
    await a.save();
    req.flash('success', 'Profil biura zapisany.');
    res.redirect('/biuro-panel/profil');
  })
);

/* ─────────── Strona biura (mikrostrona) ─────────── */
router.get('/strona', requireAgencyManager, (req, res) => res.render('agency/microsite', {}));
router.post(
  '/strona',
  requireAgencyManager,
  wrap(async (req, res) => {
    const a = req.agency;
    if (!a.plan.microsite) {
      req.flash('error', 'Strona biura nie jest aktywna w Twoim planie. Skontaktuj się z opiekunem.');
      return res.redirect('/biuro-panel/strona');
    }
    const b = req.body;
    a.microsite.enabled = b.enabled === 'on';
    a.microsite.headline = String(b.headline || '').slice(0, 120);
    a.microsite.subheadline = String(b.subheadline || '').slice(0, 300);
    a.microsite.showTeam = b.showTeam === 'on';
    a.microsite.showStats = b.showStats === 'on';
    a.microsite.showContact = b.showContact === 'on';
    a.microsite.highlights = String(b.highlights || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6);
    a.microsite.seoTitle = String(b.seoTitle || '').slice(0, 70);
    a.microsite.seoDescription = String(b.seoDescription || '').slice(0, 170);
    const slug = slugify(b.slug || a.slug, 60);
    if (slug && slug !== a.slug) {
      const taken = await a.constructor.exists({ slug, _id: { $ne: a._id } });
      if (taken) req.flash('error', 'Ten adres strony jest zajęty.');
      else a.slug = slug;
    }
    await a.save();
    req.flash('success', a.microsite.enabled ? 'Strona biura opublikowana.' : 'Ustawienia zapisane (strona ukryta).');
    res.redirect('/biuro-panel/strona');
  })
);

/* ─────────── Statystyki ─────────── */
router.get(
  '/statystyki',
  wrap(async (req, res) => {
    const a = req.agency;
    const days = [7, 30, 90].includes(Number(req.query.dni)) ? Number(req.query.dni) : 30;
    const [series, listings, leadSources] = await Promise.all([
      statsSvc.series({ agency: a._id }, days),
      Listing.find({ agency: a._id, status: { $in: ['active', 'reserved', 'sold'] } }).sort({ views: -1 }).limit(100).populate('agent', 'name').lean(),
      Inquiry.aggregate([{ $match: { agency: a._id } }, { $group: { _id: { $cond: [{ $ifNull: ['$listing', false] }, 'oferta', 'strona biura'] }, n: { $sum: 1 } } }])
    ]);
    const chart = charts.lineChart({ labels: series.labels, series: [{ name: 'Wyświetlenia', color: '#4f7560', values: series.views }, { name: 'Telefony', color: '#ff7b1c', values: series.phone }, { name: 'Zapytania', color: '#17221d', values: series.inquiries }] });
    const byCity = {};
    listings.forEach((l) => {
      byCity[l.cityName] = byCity[l.cityName] || { n: 0, views: 0 };
      byCity[l.cityName].n += 1;
      byCity[l.cityName].views += l.views;
    });
    res.render('agency/stats', { days, chart, listings: listings.map(search.withUrl), byCity, leadSources, totals: { views: series.views.reduce((x, y) => x + y, 0), phone: series.phone.reduce((x, y) => x + y, 0), inquiries: series.inquiries.reduce((x, y) => x + y, 0) } });
  })
);

/* ─────────── Współpraca i import ─────────── */
router.get(
  '/wspolpraca',
  wrap(async (req, res) => {
    res.render('agency/plan', { u: await usage(req.agency) });
  })
);
router.get('/import', (req, res) => res.render('agency/import', {}));

module.exports = router;
