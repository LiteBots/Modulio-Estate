// Zmienne i helpery dostępne w każdym widoku EJS.
const site = require('../config/site');
const property = require('../config/property');
const locations = require('../config/locations');
const fmt = require('../utils/format');
const { icon } = require('../utils/icons');
const art = require('../services/art');
const seo = require('../services/seo');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Wersja plików statycznych liczona z ich zawartości – po każdej zmianie przeglądarka pobierze nowy plik.
function fileHash(rel) {
  try {
    return crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, '../../public', rel))).digest('hex').slice(0, 10);
  } catch (e) {
    return String(Date.now());
  }
}
const ASSET_V = { css: fileHash('css/app.css'), js: fileHash('js/app.js') };

function flash(req, res, next) {
  req.flash = (type, msg) => {
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ type, msg });
  };
  res.locals.flash = req.session ? req.session.flash || [] : [];
  if (req.session) delete req.session.flash;
  next();
}

function locals(req, res, next) {
  // res.locals.layout (ustawiany przez panele) ma pierwszeństwo przed domyślnym layoutem
  const render = res.render;
  res.render = function (view, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = {};
    }
    options = options || {};
    if (options.layout === undefined && res.locals.layout) options.layout = res.locals.layout;
    return render.call(this, view, options, fn);
  };
  const L = res.locals;
  L.site = site;
  L.assetV = ASSET_V;
  L.P = property;
  L.LOC = locations;
  L.fmt = fmt;
  L.icon = icon;
  L.art = art;
  L.user = req.user || null;
  L.path = req.path;
  L.query = req.query;
  L.layout = L.layout || 'layout';
  L.bodyClass = '';
  L.breadcrumbs = null;
  L.seo = {
    fullTitle: `${site.name} – ${site.tagline}`,
    description: site.description,
    canonical: seo.abs(req.path === '/' ? '/' : req.path),
    image: seo.abs('/img/og-default.jpg'),
    robots: 'index,follow',
    type: 'website',
    jsonld: []
  };
  L.listingImage = (l) => (l.images && l.images[0] ? l.images[0].url : null);
  L.isActive = (prefix) => (prefix === '/' ? req.path === '/' : req.path === prefix || req.path.startsWith(prefix + '/'));
  L.cityName = (slug) => {
    const c = locations.getCity(slug);
    return c ? c.name : slug;
  };
  L.favIds = new Set(((req.user && req.user.favorites) || []).map(String));
  next();
}

module.exports = { flash, locals };
