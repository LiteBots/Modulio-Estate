// Budowanie zapytań wyszukiwarki i adresów URL przyjaznych SEO:
//   /sprzedaz/mieszkania/gdansk?cena_do=800000&pokoje=3
const { Listing } = require('../models');
const { TYPE_BY_SLUG, TYPE_BY_KEY, TRANSACTIONS } = require('../config/property');
const { resolveLocation, AREAS } = require('../config/locations');
const site = require('../config/site');

const NUM_PARAMS = ['cena_od', 'cena_do', 'pow_od', 'pow_do', 'pokoje_od', 'rok_od', 'pietro_do'];

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

function parse({ transaction, typeSlug, locationSlug, query }) {
  const q = query || {};
  const type = TYPE_BY_SLUG[typeSlug || 'nieruchomosci'] || null;
  const location = resolveLocation(locationSlug || q.lokalizacja || '');
  const f = {
    transaction: TRANSACTIONS[transaction] ? transaction : null,
    type,
    location,
    q: (q.q || '').toString().trim().slice(0, 80),
    rynek: ['pierwotny', 'wtorny'].includes(q.rynek) ? q.rynek : '',
    dzielnica: (q.dzielnica || '').toString().trim().slice(0, 60),
    cechy: [].concat(q.cechy || []).filter(Boolean).slice(0, 10),
    bez_prowizji: q.bez_prowizji === '1',
    ze_zdjeciami: q.ze_zdjeciami === '1',
    sort: ['najnowsze', 'cena_rosnaco', 'cena_malejaco', 'cena_m2', 'powierzchnia'].includes(q.sort) ? q.sort : 'najnowsze',
    strona: Math.max(1, parseInt(q.strona || '1', 10) || 1)
  };
  NUM_PARAMS.forEach((k) => (f[k] = toNum(q[k])));
  return f;
}

function mongoFilter(f) {
  const m = { status: 'active' };
  if (f.transaction) m.transaction = f.transaction;
  if (f.type && f.type.key) m.type = f.type.key;
  if (f.location) {
    if (f.location.kind === 'city') m.city = f.location.slug;
    else if (f.location.kind === 'area') m.city = { $in: f.location.cities };
    else if (f.location.kind === 'voivodeship') m.voivodeship = f.location.slug;
  }
  if (f.rynek) m.market = f.rynek;
  if (f.dzielnica) m.district = new RegExp('^' + f.dzielnica.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (f.cena_od !== null || f.cena_do !== null) m.price = {};
  if (f.cena_od !== null) m.price.$gte = f.cena_od;
  if (f.cena_do !== null) m.price.$lte = f.cena_do;
  if (f.pow_od !== null || f.pow_do !== null) m.area = {};
  if (f.pow_od !== null) m.area.$gte = f.pow_od;
  if (f.pow_do !== null) m.area.$lte = f.pow_do;
  if (f.pokoje_od !== null) m.rooms = { $gte: f.pokoje_od };
  if (f.rok_od !== null) m.yearBuilt = { $gte: f.rok_od };
  if (f.pietro_do !== null) m.floor = { $lte: f.pietro_do };
  if (f.cechy.length) m.features = { $all: f.cechy };
  if (f.bez_prowizji) m.noCommission = true;
  if (f.ze_zdjeciami) m['images.0'] = { $exists: true };
  if (f.q) m.$text = { $search: f.q };
  return m;
}

function sortSpec(f) {
  switch (f.sort) {
    case 'cena_rosnaco': return { price: 1 };
    case 'cena_malejaco': return { price: -1 };
    case 'cena_m2': return { pricePerM2: 1 };
    case 'powierzchnia': return { area: -1 };
    default: return { bumpedAt: -1 };
  }
}

async function run(f, { perPage = site.perPage } = {}) {
  const filter = mongoFilter(f);
  const now = new Date();
  const [total, items, featured] = await Promise.all([
    Listing.countDocuments(filter),
    Listing.find(filter).sort(sortSpec(f)).skip((f.strona - 1) * perPage).limit(perPage).populate('agency', 'name slug logo').lean({ virtuals: true }),
    f.strona === 1 ? Listing.find({ ...filter, featuredUntil: { $gt: now } }).sort({ bumpedAt: -1 }).limit(3).populate('agency', 'name slug logo').lean({ virtuals: true }) : []
  ]);
  return { total, items: items.map(withUrl), featured: featured.map(withUrl), pages: Math.max(1, Math.ceil(total / perPage)) };
}

function withUrl(l) {
  if (!l) return l;
  l.url = `/oferta/${l.slug || 'oferta'}-${l.num}`;
  l.isFeatured = !!(l.featuredUntil && new Date(l.featuredUntil) > new Date());
  return l;
}

// Ścieżka przyjazna SEO
function pathFor({ transaction = 'sprzedaz', typeSlug, locationSlug }) {
  let p = '/' + transaction;
  if (typeSlug || locationSlug) p += '/' + (typeSlug || 'nieruchomosci');
  if (locationSlug) p += '/' + locationSlug;
  return p;
}

function queryString(f, override = {}) {
  const params = new URLSearchParams();
  const base = {
    q: f.q, rynek: f.rynek, dzielnica: f.dzielnica, sort: f.sort !== 'najnowsze' ? f.sort : '',
    bez_prowizji: f.bez_prowizji ? '1' : '', ze_zdjeciami: f.ze_zdjeciami ? '1' : ''
  };
  NUM_PARAMS.forEach((k) => (base[k] = f[k] !== null ? f[k] : ''));
  const merged = { ...base, ...override };
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined && !(k === 'strona' && Number(v) === 1)) params.append(k, v);
  });
  (override.cechy || f.cechy || []).forEach((c) => params.append('cechy', c));
  const s = params.toString();
  return s ? '?' + s : '';
}

// Nagłówki i meta dla stron wyników
function headings(f, total) {
  const t = f.type || TYPE_BY_SLUG.nieruchomosci;
  const base = f.transaction === 'wynajem' ? t.rent : f.transaction === 'sprzedaz' ? t.sale : t.plural;
  const where = f.location ? (f.location.kind === 'voivodeship' ? `w ${f.location.loc}` : `w ${f.location.loc}`) : 'na Pomorzu i Pomorzu Zachodnim';
  const short = f.location ? f.location.name : 'Pomorskie i Zachodniopomorskie';
  const h1 = `${base} ${where}`;
  const title = `${base} ${short}${total ? ` – ${total} ofert` : ''}`;
  const description = `${base} ${where}. Aktualne ogłoszenia od właścicieli, biur nieruchomości i deweloperów${f.location && f.location.kind === 'city' ? '' : ' z województwa pomorskiego i zachodniopomorskiego'}. Ceny, zdjęcia, mapa i kalkulator raty.`;
  return { h1, title, description };
}

module.exports = { parse, mongoFilter, sortSpec, run, withUrl, pathFor, queryString, headings, NUM_PARAMS, AREAS, TYPE_BY_KEY };
