// robots.txt i mapy witryny XML (indeks + części), zoptymalizowane pod województwa pomorskie i zachodniopomorskie.
const express = require('express');
const router = express.Router();
const { Listing, Agency } = require('../models');
const site = require('../config/site');
const { TYPES, ALL_TYPE } = require('../config/property');
const LOC = require('../config/locations');
const ARTICLES = require('../content/articles');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function urlset(urls) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    urls
      .map(
        (u) =>
          `<url><loc>${esc(site.url + u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}${u.priority ? `<priority>${u.priority}</priority>` : ''}${(u.images || []).map((i) => `<image:image><image:loc>${esc(i.startsWith('http') ? i : site.url + i)}</image:loc></image:image>`).join('')}</url>`
      )
      .join('\n') +
    '\n</urlset>'
  );
}

function send(res, xml) {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
}

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /panel',
      'Disallow: /biuro-panel',
      'Disallow: /admin',
      'Disallow: /logowanie',
      'Disallow: /rejestracja',
      'Disallow: /zapomnialem-hasla',
      'Disallow: /reset-hasla',
      'Disallow: /zaproszenie',
      'Disallow: /api/',
      'Disallow: /r/',
      'Disallow: /szukaj',
      'Disallow: /*?*sort=',
      '',
      `Sitemap: ${site.url}/sitemap.xml`
    ].join('\n')
  );
});

router.get('/sitemap.xml', (req, res) => {
  const parts = ['strony', 'lokalizacje', 'kategorie', 'ogloszenia', 'biura'];
  const now = new Date().toISOString().slice(0, 10);
  send(
    res,
    '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      parts.map((p) => `<sitemap><loc>${site.url}/sitemap-${p}.xml</loc><lastmod>${now}</lastmod></sitemap>`).join('\n') +
      '\n</sitemapindex>'
  );
});

router.get('/sitemap-strony.xml', (req, res) => {
  const pages = ['/', '/sprzedaz', '/wynajem', '/miasta', '/biura', '/raport-cen', '/kalkulator-kredytowy', '/poradnik', '/zostan-partnerem', '/reklama', '/kontakt', '/o-nas', '/pomoc', '/regulamin', '/polityka-prywatnosci', '/cookies', '/mapa-strony'];
  const urls = pages.map((loc) => ({ loc, changefreq: loc === '/' ? 'daily' : 'weekly', priority: loc === '/' ? '1.0' : '0.6' }));
  ARTICLES.forEach((a) => urls.push({ loc: '/poradnik/' + a.slug, lastmod: a.updated || a.date, priority: '0.5' }));
  send(res, urlset(urls));
});

router.get('/sitemap-lokalizacje.xml', (req, res) => {
  const urls = [
    { loc: '/wojewodztwo/pomorskie', changefreq: 'daily', priority: '0.9' },
    { loc: '/wojewodztwo/zachodniopomorskie', changefreq: 'daily', priority: '0.9' },
    { loc: '/miasto/trojmiasto', changefreq: 'daily', priority: '0.9' }
  ];
  LOC.CITIES.forEach((c) => urls.push({ loc: '/miasto/' + c.slug, changefreq: 'daily', priority: c.major ? '0.8' : '0.5' }));
  send(res, urlset(urls));
});

// Kombinacje transakcja × typ × lokalizacja – tylko tam, gdzie są oferty (unikamy pustych stron).
router.get(
  '/sitemap-kategorie.xml',
  wrap(async (req, res) => {
    const rows = await Listing.aggregate([{ $match: { status: 'active' } }, { $group: { _id: { tr: '$transaction', t: '$type', c: '$city', v: '$voivodeship' }, n: { $sum: 1 } } }]);
    const set = new Set();
    const typeSlug = Object.fromEntries(TYPES.map((t) => [t.key, t.slug]));
    const trojmiasto = LOC.AREAS.trojmiasto.cities;
    rows.forEach(({ _id }) => {
      const t = typeSlug[_id.t];
      [t, ALL_TYPE.slug].forEach((ts) => {
        set.add(`/${_id.tr}/${ts}`);
        set.add(`/${_id.tr}/${ts}/${_id.v}`);
        set.add(`/${_id.tr}/${ts}/${_id.c}`);
        if (trojmiasto.includes(_id.c)) set.add(`/${_id.tr}/${ts}/trojmiasto`);
      });
    });
    // najważniejsze kombinacje dla dużych miast zawsze w mapie
    LOC.MAJOR.forEach((c) => ['mieszkania', 'domy', 'dzialki'].forEach((t) => set.add(`/sprzedaz/${t}/${c.slug}`)));
    LOC.MAJOR.forEach((c) => set.add(`/wynajem/mieszkania/${c.slug}`));
    const urls = [...set].sort().map((loc) => ({ loc, changefreq: 'daily', priority: loc.split('/').length > 3 ? '0.7' : '0.8' }));
    send(res, urlset(urls));
  })
);

router.get(
  '/sitemap-ogloszenia.xml',
  wrap(async (req, res) => {
    const items = await Listing.find({ status: 'active' }, 'num slug updatedAt images').sort({ updatedAt: -1 }).limit(45000).lean();
    send(res, urlset(items.map((l) => ({ loc: `/oferta/${l.slug}-${l.num}`, lastmod: l.updatedAt, changefreq: 'weekly', priority: '0.6', images: (l.images || []).slice(0, 5).map((i) => i.url) }))));
  })
);

router.get(
  '/sitemap-biura.xml',
  wrap(async (req, res) => {
    const items = await Agency.find({ status: 'active' }, 'slug updatedAt').lean();
    send(res, urlset(items.map((a) => ({ loc: '/biuro/' + a.slug, lastmod: a.updatedAt, changefreq: 'weekly', priority: '0.6' }))));
  })
);

module.exports = router;
