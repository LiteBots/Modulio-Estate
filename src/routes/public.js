const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { Listing, Agency, User, Inquiry, PartnerRequest, Report, Ad } = require('../models');
const site = require('../config/site');
const { TYPES, TYPE_BY_SLUG, TYPE_BY_KEY, TRANSACTIONS, FEATURE_LABEL } = require('../config/property');
const LOC = require('../config/locations');
const search = require('../services/search');
const seo = require('../services/seo');
const ads = require('../services/ads');
const market = require('../services/market');
const stats = require('../services/stats');
const mailer = require('../services/mailer');
const charts = require('../services/charts');
const { introFor, COASTAL_NOTE } = require('../content/cities');
const ARTICLES = require('../content/articles');
const FAQ = require('../content/faq');
const fmt = require('../utils/format');

const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: 'Zbyt wiele zgłoszeń. Spróbuj za kilka minut.' });

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

function notFound(res) {
  return res.status(404).render('pages/error', { code: 404, message: 'Nie znaleźliśmy tej strony. Sprawdź adres albo skorzystaj z wyszukiwarki.' });
}

/* ───────────────────────── STRONA GŁÓWNA ───────────────────────── */
router.get(
  '/',
  wrap(async (req, res) => {
    const now = new Date();
    const active = { status: 'active' };
    const [total, pomorskie, zachodnie, agenciesCount, featured, newest, primary, cityRows, agencies, adSlots, typeCounts] = await Promise.all([
      Listing.countDocuments(active),
      Listing.countDocuments({ ...active, voivodeship: 'pomorskie' }),
      Listing.countDocuments({ ...active, voivodeship: 'zachodniopomorskie' }),
      Agency.countDocuments({ status: 'active' }),
      Listing.find({ ...active, featuredUntil: { $gt: now } }).sort({ bumpedAt: -1 }).limit(8).populate('agency', 'name slug logo').lean(),
      Listing.find(active).sort({ publishedAt: -1, bumpedAt: -1 }).limit(8).populate('agency', 'name slug logo').lean(),
      Listing.find({ ...active, market: 'pierwotny' }).sort({ bumpedAt: -1 }).limit(6).populate('agency', 'name slug logo').lean(),
      market.cityStats(),
      Agency.find({ status: 'active' }).sort({ 'plan.microsite': -1, updatedAt: -1 }).limit(8).lean(),
      ads.pickMany(['home_billboard', 'home_tile']),
      market.typeCounts()
    ]);
    const byCity = Object.fromEntries(cityRows.map((r) => [r._id, r]));
    const coastalRows = LOC.COASTAL.filter((c) => c.major).map((c) => ({ ...c, count: (byCity[c.slug] || {}).count || 0 }));
    const sopotGdyniaGdansk = ['gdansk', 'gdynia', 'sopot'].reduce((s, k) => s + ((byCity[k] || {}).count || 0), 0);
    const bento = [
      { slug: 'trojmiasto', name: 'Trójmiasto', count: sopotGdyniaGdansk, sub: 'Gdańsk · Gdynia · Sopot', scene: ['sea', 'dusk', 11], href: '/miasto/trojmiasto' },
      { slug: 'szczecin', name: 'Szczecin', count: (byCity.szczecin || {}).count || 0, sub: 'Zachodniopomorskie', scene: ['office', 'day', 12] },
      { slug: 'slupsk', name: 'Słupsk', count: (byCity.slupsk || {}).count || 0, sub: 'Pomorze Środkowe', scene: ['loft', 'dawn', 13] },
      { slug: 'koszalin', name: 'Koszalin', count: (byCity.koszalin || {}).count || 0, sub: 'Zachodniopomorskie', scene: ['block', 'teal', 14] },
      { slug: 'kolobrzeg', name: 'Kołobrzeg', count: (byCity.kolobrzeg || {}).count || 0, sub: 'Uzdrowisko nad Bałtykiem', scene: ['sea', 'day', 15] },
      { slug: 'chojnice', name: 'Chojnice', count: (byCity.chojnice || {}).count || 0, sub: 'Bory Tucholskie', scene: ['house', 'day', 16] }
    ].map((b) => ({ ...b, href: b.href || `/miasto/${b.slug}`, avgM2: (byCity[b.slug] || {}).avgM2 }));

    seo.setSeo(res, {
      title: 'ModulioEstate – nieruchomości Pomorskie i Zachodniopomorskie | mieszkania, domy, działki',
      description: site.description,
      path: '/'
    });
    res.locals.seo.fullTitle = 'ModulioEstate – nieruchomości Pomorskie i Zachodniopomorskie | mieszkania, domy, działki';
    seo.addJsonLd(res, seo.organizationLd());
    seo.addJsonLd(res, seo.websiteLd());
    seo.addJsonLd(res, seo.faqLd(FAQ.home));

    const withUrl = (arr) => arr.map(search.withUrl);
    res.render('pages/home', {
      bodyClass: 'is-home',
      counts: { total, pomorskie, zachodnie, agencies: agenciesCount },
      featured: withUrl(featured.length ? featured : newest.slice(0, 8)),
      newest: withUrl(newest),
      primary: withUrl(primary),
      bento,
      coastalRows,
      byCity,
      agencies,
      adSlots,
      typeCounts,
      articles: ARTICLES.slice(0, 3),
      faq: FAQ.home
    });
  })
);

/* ───────────────────────── WYSZUKIWARKA ───────────────────────── */
function searchHandler(transaction) {
  return wrap(async (req, res) => {
    const { typeSlug, locationSlug } = req.params;
    // /sprzedaz/gdansk → /sprzedaz/nieruchomosci/gdansk
    if (typeSlug && !TYPE_BY_SLUG[typeSlug]) {
      if (!locationSlug && LOC.resolveLocation(typeSlug)) return res.redirect(301, `/${transaction}/nieruchomosci/${typeSlug}`);
      return notFound(res);
    }
    if (locationSlug && !LOC.resolveLocation(locationSlug)) return notFound(res);

    const f = search.parse({ transaction, typeSlug, locationSlug, query: req.query });
    const result = await search.run(f);
    const h = search.headings(f, result.total);
    const basePath = search.pathFor({ transaction, typeSlug: typeSlug || (locationSlug ? 'nieruchomosci' : null), locationSlug });
    const hasFilters = Object.keys(req.query).some((k) => k !== 'strona');
    const loc = f.location;

    const crumbs = [{ name: 'Strona główna', url: '/' }, { name: TRANSACTIONS[transaction].label, url: '/' + transaction }];
    if (typeSlug) crumbs.push({ name: f.type.plural, url: `/${transaction}/${typeSlug}` });
    if (loc) {
      if (loc.kind === 'city') crumbs.push({ name: loc.voivodeship === 'pomorskie' ? 'Pomorskie' : 'Zachodniopomorskie', url: `/${transaction}/${typeSlug || 'nieruchomosci'}/${loc.voivodeship}` });
      crumbs.push({ name: loc.name, url: basePath });
    }

    seo.setSeo(res, {
      title: h.title,
      description: h.description,
      path: basePath + (f.strona > 1 ? `?strona=${f.strona}` : ''),
      robots: hasFilters || result.total === 0 ? 'noindex,follow' : 'index,follow',
      breadcrumbs: crumbs
    });
    seo.addJsonLd(res, seo.itemListLd(result.items));

    const ctx = { city: loc && loc.kind === 'city' ? loc.slug : undefined, voivodeship: loc ? loc.voivodeship || loc.slug : undefined };
    const adSlots = await ads.pickMany(['search_top', 'search_inline'], ctx);

    // linkowanie wewnętrzne
    const typeLinks = [search.TYPE_BY_KEY && null].filter(Boolean);
    const cityLinks = (loc && loc.kind === 'city' ? LOC.nearbyCities(loc.slug, 10) : LOC.MAJOR.filter((c) => !loc || c.voivodeship === (loc.voivodeship || loc.slug))).slice(0, 16);

    res.render('pages/search', {
      f,
      transaction,
      typeSlug: typeSlug || 'nieruchomosci',
      locationSlug: locationSlug || '',
      result,
      h,
      basePath,
      adSlots,
      cityLinks,
      typeLinks,
      intro: loc && f.strona === 1 && !hasFilters ? introFor(loc) : '',
      coastalNote: loc && loc.coastal ? COASTAL_NOTE : '',
      qs: (o) => search.queryString(f, o),
      saveUrl: req.originalUrl
    });
  });
}

router.get('/sprzedaz', searchHandler('sprzedaz'));
router.get('/sprzedaz/:typeSlug', searchHandler('sprzedaz'));
router.get('/sprzedaz/:typeSlug/:locationSlug', searchHandler('sprzedaz'));
router.get('/wynajem', searchHandler('wynajem'));
router.get('/wynajem/:typeSlug', searchHandler('wynajem'));
router.get('/wynajem/:typeSlug/:locationSlug', searchHandler('wynajem'));

// Formularz wyszukiwarki (GET) → przekierowanie na adres SEO
router.get('/szukaj', (req, res) => {
  const tr = req.query.transakcja === 'wynajem' ? 'wynajem' : 'sprzedaz';
  const type = TYPE_BY_KEY[req.query.typ] ? TYPE_BY_KEY[req.query.typ].slug : 'nieruchomosci';
  let loc = (req.query.lokalizacja || '').trim();
  let q = (req.query.q || '').trim();
  // dopasuj wpisany tekst do miejscowości, np. "Gdańsk Oliwa" → /gdansk?dzielnica=Oliwa
  let district = '';
  if (!loc && q) {
    const { slugify } = require('../utils/slug');
    const norm = slugify(q);
    if (LOC.resolveLocation(norm)) {
      loc = norm;
      q = '';
    } else {
      const candidates = [...LOC.CITIES, LOC.AREAS.trojmiasto].sort((a, b) => b.slug.length - a.slug.length);
      const hit = candidates.find((c) => norm.startsWith(c.slug + '-'));
      if (hit) {
        loc = hit.slug;
        const words = q.split(/\s+/);
        const nameWords = hit.name.split(/\s+/).length;
        district = words.slice(nameWords).join(' ');
        q = '';
      }
    }
  }
  const params = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (['transakcja', 'typ', 'lokalizacja', 'q'].includes(k)) return;
    [].concat(v).forEach((x) => x !== '' && x !== undefined && params.append(k, x));
  });
  if (district && !params.get('dzielnica')) {
    const city = LOC.getCity(loc);
    const known = city && city.districts.find((d) => require('../utils/slug').slugify(d) === require('../utils/slug').slugify(district));
    if (known) params.set('dzielnica', known);
    else params.set('q', district);
  }
  if (q) params.set('q', q);
  const qs = params.toString();
  const path = search.pathFor({ transaction: tr, typeSlug: type, locationSlug: loc && LOC.resolveLocation(loc) ? loc : null });
  res.redirect(path + (qs ? '?' + qs : ''));
});

router.get('/rynek-pierwotny', (req, res) => res.redirect(301, '/sprzedaz/mieszkania?rynek=pierwotny'));

/* ───────────────────────── OGŁOSZENIE ───────────────────────── */
router.get(
  '/oferta/:slugnum',
  wrap(async (req, res) => {
    const m = req.params.slugnum.match(/-(\d+)$/) || req.params.slugnum.match(/^(\d+)$/);
    if (!m) return notFound(res);
    const listing = await Listing.findOne({ num: Number(m[1]) })
      .populate('agency')
      .populate('agent', 'name email phone avatar')
      .populate('owner', 'name email phone avatar createdAt');
    if (!listing) return notFound(res);

    const u = req.user;
    const canManage = u && (u.role === 'admin' || String(listing.owner && listing.owner._id) === String(u._id) || (listing.agency && String(u.agency) === String(listing.agency._id)));
    if (['draft', 'blocked'].includes(listing.status) && !canManage) return notFound(res);
    if (`${listing.slug}-${listing.num}` !== req.params.slugnum) return res.redirect(301, listing.url);

    if (!canManage) stats.track(listing, 'views');

    const t = TYPE_BY_KEY[listing.type];
    const city = LOC.getCity(listing.city);
    const [similar, adSlots] = await Promise.all([
      Listing.find({ _id: { $ne: listing._id }, status: 'active', city: listing.city, type: listing.type, transaction: listing.transaction }).sort({ bumpedAt: -1 }).limit(4).populate('agency', 'name slug logo').lean(),
      ads.pickMany(['listing_sidebar'], { city: listing.city, voivodeship: listing.voivodeship })
    ]);
    let similarList = similar.map(search.withUrl);
    if (similarList.length < 4) {
      const more = await Listing.find({ _id: { $nin: [listing._id, ...similar.map((x) => x._id)] }, status: 'active', voivodeship: listing.voivodeship, type: listing.type }).sort({ bumpedAt: -1 }).limit(4 - similarList.length).lean();
      similarList = similarList.concat(more.map(search.withUrl));
    }

    const typePath = `/${listing.transaction}/${t.slug}`;
    const crumbs = [
      { name: 'Strona główna', url: '/' },
      { name: TRANSACTIONS[listing.transaction].label, url: '/' + listing.transaction },
      { name: t.plural, url: typePath },
      { name: listing.cityName, url: `${typePath}/${listing.city}` },
      { name: fmt.truncate(listing.title, 50), url: listing.url }
    ];
    const desc = `${t.label} ${listing.transaction === 'wynajem' ? 'do wynajęcia' : 'na sprzedaż'}, ${listing.cityName}${listing.district ? ' ' + listing.district : ''}: ${listing.area ? fmt.num(listing.area) + ' m², ' : ''}${listing.rooms ? listing.rooms + ' pok., ' : ''}${fmt.price(listing.price, listing.transaction)}. ${fmt.truncate(listing.description, 90)}`;
    seo.setSeo(res, {
      title: `${listing.title} – ${listing.cityName}, ${fmt.price(listing.price, listing.transaction)}`,
      description: desc,
      path: listing.url,
      image: listing.images[0] ? seo.abs(listing.images[0].url) : undefined,
      robots: listing.status === 'active' ? 'index,follow' : 'noindex,follow',
      type: 'article',
      breadcrumbs: crumbs
    });
    seo.addJsonLd(res, seo.listingLd(listing, listing.agency));

    const seller = listing.agency
      ? { kind: 'agency', name: listing.agency.name, logo: listing.agency.logo, url: '/biuro/' + listing.agency.slug, phone: listing.contactPhone || (listing.agent && listing.agent.phone) || listing.agency.phone, person: listing.agent ? listing.agent.name : listing.contactName }
      : { kind: 'private', name: listing.contactName || (listing.owner && listing.owner.name) || 'Osoba prywatna', phone: listing.contactPhone || (listing.owner && listing.owner.phone), since: listing.owner && listing.owner.createdAt };

    res.render('pages/listing', {
      l: listing,
      t,
      city,
      seller,
      similar: similarList,
      adSlots,
      canManage,
      isFav: res.locals.favIds.has(String(listing._id)),
      featureLabels: FEATURE_LABEL
    });
  })
);

// Zapytanie do ogłoszenia (działa także bez logowania)
router.post(
  '/oferta/:num/zapytanie',
  formLimiter,
  wrap(async (req, res) => {
    const listing = await Listing.findOne({ num: Number(req.params.num), status: { $in: ['active', 'reserved'] } }).populate('agency', 'name email').populate('owner', 'email name');
    if (!listing) return notFound(res);
    const { name, email, phone, message, topic, website } = req.body;
    if (website) return res.redirect(listing.url); // honeypot
    if (!name || !isEmail(email) || !message || String(message).length < 5 || !req.body.consent) {
      req.flash('error', 'Uzupełnij imię, poprawny e-mail, wiadomość i zaznacz zgodę.');
      return res.redirect(listing.url + '#kontakt');
    }
    const inq = await Inquiry.create({
      listing: listing._id,
      agency: listing.agency ? listing.agency._id : undefined,
      toUser: listing.agency ? undefined : listing.owner && listing.owner._id,
      assignedTo: listing.agent || undefined,
      fromUser: req.user ? req.user._id : undefined,
      name: String(name).slice(0, 120),
      email: String(email).toLowerCase().trim(),
      phone: String(phone || '').slice(0, 40),
      message: String(message).slice(0, 4000),
      topic: topic === 'prezentacja' ? 'prezentacja' : 'oferta'
    });
    stats.track(listing, 'inquiries');
    const to = listing.contactEmail || (listing.agency && listing.agency.email) || (listing.owner && listing.owner.email);
    if (to) {
      mailer.send({
        to,
        replyTo: inq.email,
        subject: `Nowe zapytanie: ${listing.title}`,
        html: mailer.layout('Nowe zapytanie o ofertę', `<p><strong>${fmt.escapeHtml(inq.name)}</strong> (${fmt.escapeHtml(inq.email)}${inq.phone ? ', ' + fmt.escapeHtml(inq.phone) : ''}) pyta o ofertę <a href="${seo.abs(listing.url)}">${fmt.escapeHtml(listing.title)}</a>:</p><blockquote style="border-left:3px solid #37908f;padding-left:12px;color:#334">${fmt.escapeHtml(inq.message)}</blockquote><p><a href="${seo.abs(listing.agency ? '/biuro-panel/zapytania/' + inq._id : '/panel/wiadomosci/' + inq._id)}">Odpowiedz w panelu</a></p>`)
      });
    }
    req.flash('success', 'Wiadomość wysłana. Sprzedający odpowie na podany adres e-mail lub telefonicznie.');
    res.redirect(listing.url + '#kontakt');
  })
);

// Zgłoszenie naruszenia (DSA)
router.post(
  '/oferta/:num/zgloszenie',
  formLimiter,
  wrap(async (req, res) => {
    const listing = await Listing.findOne({ num: Number(req.params.num) });
    if (!listing) return notFound(res);
    const reason = ['oszustwo', 'nieaktualne', 'bledne_dane', 'nielegalne', 'duplikat', 'inne'].includes(req.body.reason) ? req.body.reason : 'inne';
    await Report.create({ listing: listing._id, reason, details: String(req.body.details || '').slice(0, 3000), email: req.body.email || (req.user && req.user.email), user: req.user && req.user._id });
    req.flash('success', 'Dziękujemy. Zgłoszenie trafiło do moderacji.');
    res.redirect(listing.url);
  })
);

// Ulubione (AJAX)
router.post(
  '/api/ulubione/:id',
  wrap(async (req, res) => {
    if (!req.user) return res.status(401).json({ ok: false, login: '/logowanie' });
    const id = req.params.id;
    if (!/^[a-f0-9]{24}$/.test(id)) return res.status(400).json({ ok: false });
    const has = req.user.favorites.map(String).includes(id);
    await User.updateOne({ _id: req.user._id }, has ? { $pull: { favorites: id } } : { $addToSet: { favorites: id } });
    await Listing.updateOne({ _id: id }, { $inc: { favoritesCount: has ? -1 : 1 } });
    res.json({ ok: true, fav: !has, count: req.user.favorites.length + (has ? -1 : 1) });
  })
);

// Odsłonięcie numeru telefonu (statystyka)
router.post(
  '/api/oferta/:id/telefon',
  wrap(async (req, res) => {
    const l = await Listing.findById(req.params.id).populate('agency', 'phone').populate('agent', 'phone').populate('owner', 'phone');
    if (!l) return res.status(404).json({ ok: false });
    stats.track(l, 'phone');
    const phone = l.contactPhone || (l.agent && l.agent.phone) || (l.agency && l.agency.phone) || (l.owner && l.owner.phone) || '';
    res.json({ ok: true, phone });
  })
);

/* ───────────────────────── LOKALIZACJE ───────────────────────── */
router.get(
  '/miasta',
  wrap(async (req, res) => {
    const rows = await market.cityStats();
    const byCity = Object.fromEntries(rows.map((r) => [r._id, r]));
    seo.setSeo(res, {
      title: 'Miasta i miejscowości – nieruchomości Pomorskie i Zachodniopomorskie',
      description: 'Lista wszystkich miast i miejscowości z ogłoszeniami nieruchomości w województwie pomorskim i zachodniopomorskim.',
      path: '/miasta',
      breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Miasta', url: '/miasta' }]
    });
    res.render('pages/cities', { byCity });
  })
);

async function locationPage(req, res, loc) {
  const filter = loc.kind === 'area' ? { city: { $in: loc.cities } } : loc.kind === 'voivodeship' ? { voivodeship: loc.slug } : { city: loc.slug };
  const base = { status: 'active', ...filter };
  const [total, newest, primary, typeCounts, rows, trend, agencies, adSlots] = await Promise.all([
    Listing.countDocuments(base),
    Listing.find(base).sort({ bumpedAt: -1 }).limit(8).populate('agency', 'name slug logo').lean(),
    Listing.find({ ...base, market: 'pierwotny' }).sort({ bumpedAt: -1 }).limit(4).lean(),
    market.typeCounts(filter),
    market.cityStats(loc.kind === 'voivodeship' ? { voivodeship: loc.slug } : filter),
    market.monthlyM2(filter),
    Agency.find({ status: 'active', $or: [{ city: loc.kind === 'city' ? loc.slug : { $in: loc.cities || [] } }, { serviceAreas: loc.slug }, ...(loc.kind === 'voivodeship' ? [{ voivodeship: loc.slug }] : [])] }).limit(6).lean(),
    ads.pickMany(['city_banner'], { city: loc.kind === 'city' ? loc.slug : undefined, voivodeship: loc.voivodeship || loc.slug })
  ]);
  const agg = rows.reduce((a, r) => ({ sale: a.sale + r.sale, rent: a.rent + r.rent, m2: r.avgM2 ? [...a.m2, r.avgM2] : a.m2, rents: r.avgRent ? [...a.rents, r.avgRent] : a.rents }), { sale: 0, rent: 0, m2: [], rents: [] });
  const avgM2 = agg.m2.length ? Math.round(agg.m2.reduce((a, b) => a + b, 0) / agg.m2.length) : null;
  const avgRent = agg.rents.length ? Math.round(agg.rents.reduce((a, b) => a + b, 0) / agg.rents.length) : null;
  const hasTrend = trend.values.some((v) => v);
  const chart = hasTrend ? charts.lineChart({ labels: trend.labels, series: [{ name: 'Śr. cena m²', color: '#37908f', values: trend.values }], minZero: false, height: 230, yFormat: (v) => fmt.num(Math.round(v / 100) * 100) }) : '';

  const path = loc.kind === 'voivodeship' ? `/wojewodztwo/${loc.slug}` : `/miasto/${loc.slug}`;
  const crumbs = [{ name: 'Strona główna', url: '/' }, { name: 'Miasta', url: '/miasta' }];
  if (loc.kind !== 'voivodeship') crumbs.push({ name: loc.voivodeship === 'pomorskie' ? 'Pomorskie' : 'Zachodniopomorskie', url: `/wojewodztwo/${loc.voivodeship}` });
  crumbs.push({ name: loc.kind === 'voivodeship' ? `Województwo ${loc.name.toLowerCase()}` : loc.name, url: path });

  const title = loc.kind === 'voivodeship' ? `Nieruchomości – ${loc.full}: mieszkania, domy, działki` : `Nieruchomości ${loc.name} – mieszkania, domy i działki w ${loc.loc}`;
  seo.setSeo(res, {
    title,
    description: `${total} ${fmt.plural(total, 'aktualne ogłoszenie', 'aktualne ogłoszenia', 'aktualnych ogłoszeń')} nieruchomości w ${loc.loc}: mieszkania i domy na sprzedaż i wynajem, działki, lokale. ${avgM2 ? `Średnia cena m² mieszkań: ${fmt.num(avgM2)} zł.` : ''} Ceny, mapa, biura nieruchomości.`,
    path,
    breadcrumbs: crumbs
  });
  seo.addJsonLd(res, {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url: seo.abs(path),
    about: { '@type': loc.kind === 'voivodeship' ? 'AdministrativeArea' : 'City', name: loc.kind === 'voivodeship' ? loc.full : loc.name, geo: loc.lat ? { '@type': 'GeoCoordinates', latitude: loc.lat, longitude: loc.lng } : undefined }
  });

  const subCities = loc.kind === 'voivodeship' ? LOC.CITIES.filter((c) => c.voivodeship === loc.slug) : loc.kind === 'area' ? loc.cities.map(LOC.getCity) : [];
  const byCity = Object.fromEntries(rows.map((r) => [r._id, r]));
  res.render('pages/location', {
    loc,
    total,
    sale: agg.sale,
    rent: agg.rent,
    avgM2,
    avgRent,
    newest: newest.map(search.withUrl),
    primary: primary.map(search.withUrl),
    typeCounts,
    chart,
    agencies,
    adSlots,
    nearby: loc.kind === 'voivodeship' ? [] : LOC.nearbyCities(loc.slug, 8),
    subCities,
    byCity,
    intro: introFor(loc) || (loc.kind === 'voivodeship' ? `Ogłoszenia nieruchomości z całego województwa ${loc.slug === 'pomorskie' ? 'pomorskiego' : 'zachodniopomorskiego'}: mieszkania, domy, działki i lokale na sprzedaż i wynajem – od właścicieli, biur i deweloperów.` : ''),
    coastalNote: loc.coastal ? COASTAL_NOTE : ''
  });
}

router.get(
  '/miasto/:slug',
  wrap(async (req, res) => {
    const loc = LOC.resolveLocation(req.params.slug);
    if (!loc || loc.kind === 'voivodeship') return notFound(res);
    return locationPage(req, res, loc);
  })
);
router.get('/trojmiasto', (req, res) => res.redirect(301, '/miasto/trojmiasto'));
router.get(
  '/wojewodztwo/:slug',
  wrap(async (req, res) => {
    const loc = LOC.resolveLocation(req.params.slug);
    if (!loc || loc.kind !== 'voivodeship') return notFound(res);
    return locationPage(req, res, loc);
  })
);

/* ───────────────────────── BIURA ───────────────────────── */
router.get(
  '/biura',
  wrap(async (req, res) => {
    const city = LOC.getCity(req.query.miasto);
    const filter = { status: 'active' };
    if (city) filter.$or = [{ city: city.slug }, { serviceAreas: city.slug }];
    const agencies = await Agency.find(filter).sort({ 'plan.microsite': -1, name: 1 }).lean();
    const counts = await Listing.aggregate([{ $match: { status: 'active', agency: { $in: agencies.map((a) => a._id) } } }, { $group: { _id: '$agency', n: { $sum: 1 } } }]);
    const byAgency = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    seo.setSeo(res, {
      title: city ? `Biura nieruchomości ${city.name}` : 'Biura nieruchomości – Pomorskie i Zachodniopomorskie',
      description: `Katalog biur nieruchomości i deweloperów${city ? ' w ' + city.loc : ' z województwa pomorskiego i zachodniopomorskiego'}. Oferty, kontakt i opinie.`,
      path: '/biura' + (city ? '?miasto=' + city.slug : ''),
      robots: city ? 'index,follow' : 'index,follow',
      breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Biura nieruchomości', url: '/biura' }]
    });
    res.render('pages/agencies', { agencies, byAgency, city });
  })
);

router.get(
  '/biuro/:slug',
  wrap(async (req, res) => {
    const agency = await Agency.findOne({ slug: req.params.slug, status: 'active' }).populate('members.user', 'name email phone avatar');
    if (!agency) return notFound(res);
    const tr = ['sprzedaz', 'wynajem'].includes(req.query.t) ? req.query.t : null;
    const filter = { status: 'active', agency: agency._id, ...(tr ? { transaction: tr } : {}) };
    const [listings, counts, sold] = await Promise.all([
      Listing.find(filter).sort({ featuredUntil: -1, bumpedAt: -1 }).limit(60).lean(),
      Listing.aggregate([{ $match: { status: 'active', agency: agency._id } }, { $group: { _id: '$transaction', n: { $sum: 1 }, cities: { $addToSet: '$cityName' } } }]),
      Listing.countDocuments({ agency: agency._id, status: 'sold' })
    ]);
    const c = Object.fromEntries(counts.map((x) => [x._id, x]));
    const city = LOC.getCity(agency.city);
    const microsite = agency.hasMicrosite;
    seo.setSeo(res, {
      title: (microsite && agency.microsite.seoTitle) || `${agency.name} – biuro nieruchomości${city ? ' ' + city.name : ''}`,
      description: (microsite && agency.microsite.seoDescription) || agency.shortDescription || `Oferty biura ${agency.name}${city ? ' w ' + city.loc : ''}: mieszkania, domy i działki na sprzedaż i wynajem.`,
      path: '/biuro/' + agency.slug + (tr ? '?t=' + tr : ''),
      image: agency.cover ? seo.abs(agency.cover) : agency.logo ? seo.abs(agency.logo) : undefined,
      breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Biura nieruchomości', url: '/biura' }, { name: agency.name, url: '/biuro/' + agency.slug }]
    });
    seo.addJsonLd(res, seo.agencyLd(agency, city && city.name));
    res.render(microsite ? 'pages/agency-site' : 'pages/agency-profile', {
      a: agency,
      city,
      listings: listings.map(search.withUrl),
      counts: { sale: (c.sprzedaz || {}).n || 0, rent: (c.wynajem || {}).n || 0, sold, cities: [...new Set([...(c.sprzedaz || {}).cities || [], ...((c.wynajem || {}).cities || [])])] },
      tr,
      team: agency.members.filter((m) => m.showOnSite && m.user),
      bodyClass: microsite ? 'is-microsite' : ''
    });
  })
);

router.post(
  '/biuro/:slug/kontakt',
  formLimiter,
  wrap(async (req, res) => {
    const agency = await Agency.findOne({ slug: req.params.slug, status: 'active' });
    if (!agency) return notFound(res);
    const { name, email, phone, message, topic, website } = req.body;
    if (website) return res.redirect('/biuro/' + agency.slug);
    if (!name || !isEmail(email) || !message || !req.body.consent) {
      req.flash('error', 'Uzupełnij imię, e-mail, wiadomość i zaznacz zgodę.');
      return res.redirect('/biuro/' + agency.slug + '#kontakt');
    }
    await Inquiry.create({ agency: agency._id, fromUser: req.user && req.user._id, name, email, phone, message: String(message).slice(0, 4000), topic: topic === 'wycena' ? 'wycena' : 'kontakt' });
    if (agency.email) mailer.send({ to: agency.email, replyTo: email, subject: `Nowa wiadomość z ModulioEstate od ${name}`, html: mailer.layout('Nowa wiadomość ze strony biura', `<p><strong>${fmt.escapeHtml(name)}</strong> (${fmt.escapeHtml(email)} ${fmt.escapeHtml(phone || '')})</p><p>${fmt.escapeHtml(message)}</p>`) });
    req.flash('success', 'Dziękujemy! Biuro skontaktuje się z Tobą wkrótce.');
    res.redirect('/biuro/' + agency.slug + '#kontakt');
  })
);

/* ───────────────────────── RAPORT CEN, KALKULATOR ───────────────────────── */
router.get(
  '/raport-cen',
  wrap(async (req, res) => {
    const [rows, trendP, trendZ] = await Promise.all([market.cityStats(), market.monthlyM2({ voivodeship: 'pomorskie' }), market.monthlyM2({ voivodeship: 'zachodniopomorskie' })]);
    const chart = charts.lineChart({
      labels: trendP.labels,
      series: [
        { name: 'Pomorskie', color: '#18325a', values: trendP.values },
        { name: 'Zachodniopomorskie', color: '#e9733b', values: trendZ.values }
      ],
      minZero: false,
      yFormat: (v) => fmt.num(Math.round(v / 100) * 100)
    });
    seo.setSeo(res, {
      title: 'Raport cen nieruchomości – Pomorskie i Zachodniopomorskie',
      description: 'Średnie ceny ofertowe za m² mieszkań i stawki najmu w miastach województwa pomorskiego i zachodniopomorskiego, liczone z ogłoszeń w ModulioEstate.',
      path: '/raport-cen',
      breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Raport cen', url: '/raport-cen' }]
    });
    res.render('pages/report', { rows: rows.filter((r) => r.count > 0), chart });
  })
);

router.get('/kalkulator-kredytowy', (req, res) => {
  seo.setSeo(res, {
    title: 'Kalkulator kredytu hipotecznego – rata, odsetki, wkład własny',
    description: 'Policz miesięczną ratę kredytu hipotecznego, sumę odsetek i potrzebny wkład własny. Raty równe i malejące.',
    path: '/kalkulator-kredytowy',
    breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Kalkulator kredytowy', url: '/kalkulator-kredytowy' }]
  });
  res.render('pages/calculator', { price: Number(req.query.cena) || 650000 });
});

/* ───────────────────────── PORADNIK ───────────────────────── */
router.get('/poradnik', (req, res) => {
  seo.setSeo(res, {
    title: 'Poradnik nieruchomości – kupno, sprzedaż, najem na Pomorzu',
    description: 'Praktyczne porady dla kupujących, sprzedających i wynajmujących nieruchomości w województwie pomorskim i zachodniopomorskim.',
    path: '/poradnik',
    breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Poradnik', url: '/poradnik' }]
  });
  res.render('pages/guide', { articles: ARTICLES });
});

router.get(
  '/poradnik/:slug',
  wrap(async (req, res) => {
    const a = ARTICLES.find((x) => x.slug === req.params.slug);
    if (!a) return notFound(res);
    seo.setSeo(res, {
      title: a.title,
      description: a.excerpt,
      path: '/poradnik/' + a.slug,
      type: 'article',
      breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: 'Poradnik', url: '/poradnik' }, { name: a.title, url: '/poradnik/' + a.slug }]
    });
    seo.addJsonLd(res, seo.articleLd(a));
    const adSlots = await ads.pickMany(['guide_sidebar']);
    res.render('pages/article', { a, more: ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3), adSlots });
  })
);

/* ───────────────────────── PARTNERZY, REKLAMA, KONTAKT ───────────────────────── */
function formPage(view, opts) {
  return (req, res) => {
    seo.setSeo(res, { ...opts, breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: opts.crumb, url: opts.path }] });
    res.render(view, { sent: req.query.wyslano === '1' });
  };
}

router.get('/zostan-partnerem', formPage('pages/partner', { title: 'Zostań partnerem – dla biur nieruchomości i deweloperów', description: 'Publikuj oferty biura nieruchomości lub inwestycje deweloperskie na portalu ModulioEstate dla Pomorza i Pomorza Zachodniego. Panel biura, strona firmowa w serwisie, CRM zapytań.', path: '/zostan-partnerem', crumb: 'Zostań partnerem' }));
router.get('/reklama', formPage('pages/advertise', { title: 'Reklama na portalu nieruchomości – Pomorskie i Zachodniopomorskie', description: 'Dotrzyj do osób kupujących i wynajmujących nieruchomości na Pomorzu. Banery na stronie głównej, w wynikach wyszukiwania, na stronach miast i ogłoszeń.', path: '/reklama', crumb: 'Reklama' }));
router.get('/kontakt', formPage('pages/contact', { title: 'Kontakt', description: 'Skontaktuj się z zespołem ModulioEstate – pomoc dla użytkowników, współpraca z biurami i reklama.', path: '/kontakt', crumb: 'Kontakt' }));

async function saveRequest(req, res, kind, back) {
  const b = req.body;
  if (b.website) return res.redirect(back);
  if (!b.name || !isEmail(b.email) || !b.consent) {
    req.flash('error', 'Uzupełnij imię i nazwisko, poprawny e-mail i zaznacz zgodę.');
    return res.redirect(back);
  }
  const pr = await PartnerRequest.create({
    kind: ['biuro', 'deweloper', 'reklama', 'inne'].includes(b.kind) ? b.kind : kind,
    company: b.company,
    name: b.name,
    email: b.email,
    phone: b.phone,
    city: b.city,
    agentsCount: b.agentsCount,
    listingsCount: b.listingsCount,
    interests: [].concat(b.interests || []),
    message: String(b.message || '').slice(0, 4000)
  });
  const to = kind === 'reklama' ? site.contact.adsEmail : kind === 'inne' ? site.contact.email : site.contact.partnersEmail;
  mailer.send({ to, replyTo: pr.email, subject: `[${pr.kind}] Nowe zgłoszenie: ${pr.company || pr.name}`, html: mailer.layout('Nowe zgłoszenie z formularza', `<p><b>${fmt.escapeHtml(pr.name)}</b> ${fmt.escapeHtml(pr.company || '')}<br>${fmt.escapeHtml(pr.email)} ${fmt.escapeHtml(pr.phone || '')}<br>Miasto: ${fmt.escapeHtml(pr.city || '–')}</p><p>${fmt.escapeHtml(pr.message)}</p>`) });
  mailer.send({ to: pr.email, subject: 'Otrzymaliśmy Twoją wiadomość – ModulioEstate', html: mailer.layout('Dziękujemy za kontakt', `<p>Cześć ${fmt.escapeHtml(pr.name)},</p><p>otrzymaliśmy Twoje zgłoszenie. Odezwiemy się w ciągu 1–2 dni roboczych.</p>`) });
  res.redirect(back.split('#')[0] + '?wyslano=1#formularz');
}
router.post('/zostan-partnerem', formLimiter, wrap((req, res) => saveRequest(req, res, 'biuro', '/zostan-partnerem#formularz')));
router.post('/reklama', formLimiter, wrap((req, res) => saveRequest(req, res, 'reklama', '/reklama#formularz')));
router.post('/kontakt', formLimiter, wrap((req, res) => saveRequest(req, res, 'inne', '/kontakt#formularz')));

/* ───────────────────────── STRONY STATYCZNE ───────────────────────── */
const STATIC = {
  'o-nas': { view: 'pages/about', title: 'O nas – portal nieruchomości dla Pomorza', description: 'ModulioEstate to regionalny portal ogłoszeń nieruchomości dla województwa pomorskiego i zachodniopomorskiego.' },
  regulamin: { view: 'pages/terms', title: 'Regulamin serwisu', description: 'Regulamin świadczenia usług drogą elektroniczną w serwisie ModulioEstate.' },
  'polityka-prywatnosci': { view: 'pages/privacy', title: 'Polityka prywatności', description: 'Zasady przetwarzania danych osobowych i plików cookies w serwisie ModulioEstate.' },
  cookies: { view: 'pages/cookies', title: 'Polityka cookies', description: 'Informacje o plikach cookies używanych w serwisie ModulioEstate.' },
  pomoc: { view: 'pages/help', title: 'Pomoc i najczęstsze pytania', description: 'Odpowiedzi na pytania o konto, ogłoszenia, współpracę z biurami i reklamę w ModulioEstate.' },
  'mapa-strony': { view: 'pages/sitemap', title: 'Mapa strony', description: 'Wszystkie kategorie, miasta i podstrony serwisu ModulioEstate.' }
};
Object.entries(STATIC).forEach(([slug, cfg]) => {
  router.get('/' + slug, (req, res) => {
    seo.setSeo(res, { title: cfg.title, description: cfg.description, path: '/' + slug, breadcrumbs: [{ name: 'Strona główna', url: '/' }, { name: cfg.title, url: '/' + slug }] });
    if (slug === 'pomoc') seo.addJsonLd(res, seo.faqLd(FAQ.help));
    res.render(cfg.view, { faq: FAQ.help, articles: ARTICLES });
  });
});

/* ───────────────────────── REKLAMY: KLIKNIĘCIE ───────────────────────── */
router.get(
  '/r/:id',
  wrap(async (req, res) => {
    if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.redirect('/');
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    if (!ad || !ad.url) return res.redirect('/');
    res.redirect(ad.url);
  })
);

module.exports = router;
