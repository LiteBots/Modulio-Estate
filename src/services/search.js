// Budowanie zapytań wyszukiwarki i adresów URL przyjaznych SEO:
//   /sprzedaz/mieszkania/gdansk?cena_do=800000&pokoje=3
const { Listing } = require('../models');
const { TYPE_BY_SLUG, TYPE_BY_KEY, TRANSACTIONS, OPTIONS, ADVERTISER, RADIUS } = require('../config/property');
const { resolveLocation, AREAS } = require('../config/locations');
const site = require('../config/site');

const NUM_PARAMS = ['cena_od', 'cena_do', 'pow_od', 'pow_do', 'pokoje_od', 'pokoje_do', 'rok_od', 'rok_do', 'pietro_od', 'pietro_do', 'czynsz_do', 'lazienki_od', 'cena_m2_od', 'cena_m2_do', 'dzialka_od'];
const pick = (key, v) => (OPTIONS[key] || []).includes(v) ? v : '';
const picks = (key, v) => [].concat(v || []).filter((x) => (OPTIONS[key] || []).includes(x)).slice(0, 10);

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
    promien: RADIUS.includes(Number(q.promien)) ? Number(q.promien) : 0,
    ogloszeniodawca: ADVERTISER[q.ogloszeniodawca] ? q.ogloszeniodawca : '',
    stan: picks('condition', q.stan),
    zabudowa: picks('buildingType', q.zabudowa),
    ogrzewanie: picks('heating', q.ogrzewanie),
    material: pick('buildingMaterial', q.material),
    parking: pick('parking', q.parking),
    dostepne_od: /^\d{4}-\d{2}-\d{2}$/.test(q.dostepne_od || '') ? q.dostepne_od : '',
    dodane: ['1', '3', '7', '14', '30'].includes(q.dodane) ? q.dodane : '',
    obnizka: q.obnizka === '1',
    z_mapa: q.z_mapa === '1',
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
  if (f.location && f.promien && f.location.lat) {
    // wyszukiwanie w promieniu od miejscowości (km → radiany: / promień Ziemi 6378,1 km)
    m.geo = { $geoWithin: { $centerSphere: [[f.location.lng, f.location.lat], (f.promien + (f.location.kind === 'area' ? 8 : 0)) / 6378.1] } };
  } else if (f.location) {
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
  const range = (field, from, to) => {
    if (from === null && to === null) return;
    m[field] = {};
    if (from !== null) m[field].$gte = from;
    if (to !== null) m[field].$lte = to;
  };
  range('rooms', f.pokoje_od, f.pokoje_do);
  range('yearBuilt', f.rok_od, f.rok_do);
  range('floor', f.pietro_od, f.pietro_do);
  range('pricePerM2', f.cena_m2_od, f.cena_m2_do);
  if (f.czynsz_do !== null) m.rentExtra = { $lte: f.czynsz_do };
  if (f.lazienki_od !== null) m.bathrooms = { $gte: f.lazienki_od };
  if (f.dzialka_od !== null) m.plotArea = { $gte: f.dzialka_od };
  if (f.ogloszeniodawca) m.advertiserType = f.ogloszeniodawca;
  if (f.stan.length) m.condition = { $in: f.stan };
  if (f.zabudowa.length) m.buildingType = { $in: f.zabudowa };
  if (f.ogrzewanie.length) m.heating = { $in: f.ogrzewanie };
  if (f.material) m.buildingMaterial = f.material;
  if (f.parking) m.parking = f.parking;
  if (f.dostepne_od) m.$or = [{ availableFrom: { $lte: new Date(f.dostepne_od) } }, { availableFrom: null }];
  if (f.dodane) m.publishedAt = { $gte: new Date(Date.now() - Number(f.dodane) * 864e5) };
  if (f.obnizka) m['priceHistory.1'] = { $exists: true };
  if (f.z_mapa) m.geoPrecise = true;
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
  const h = l.priceHistory || [];
  const max = h.length > 1 ? Math.max(...h.map((x) => x.price)) : 0;
  l.priceDrop = max > l.price ? Math.round((1 - l.price / max) * 100) : 0;
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
  Object.assign(base, {
    promien: f.promien || '', ogloszeniodawca: f.ogloszeniodawca, material: f.material, parking: f.parking,
    dostepne_od: f.dostepne_od, dodane: f.dodane, obnizka: f.obnizka ? '1' : '', z_mapa: f.z_mapa ? '1' : ''
  });
  const merged = { ...base, ...override };
  Object.entries(merged).forEach(([k, v]) => {
    if (Array.isArray(v)) return;
    if (v !== '' && v !== null && v !== undefined && !(k === 'strona' && Number(v) === 1)) params.append(k, v);
  });
  ['cechy', 'stan', 'zabudowa', 'ogrzewanie'].forEach((k) => (override[k] || f[k] || []).forEach((c) => params.append(k, c)));
  const s = params.toString();
  return s ? '?' + s : '';
}

// Aktywne filtry jako „chipy” z linkiem usuwającym dany filtr
function activeChips(f, basePath) {
  const fmt = require('../utils/format');
  const { FEATURE_LABEL } = require('../config/property');
  const chips = [];
  const add = (label, override) => chips.push({ label, href: basePath + queryString(f, { ...override, strona: '' }) });
  if (f.promien && f.location) add(`+${f.promien} km od: ${f.location.name}`, { promien: '' });
  if (f.cena_od !== null || f.cena_do !== null) add(`Cena: ${f.cena_od !== null ? 'od ' + fmt.shortPrice(f.cena_od) : ''} ${f.cena_do !== null ? 'do ' + fmt.shortPrice(f.cena_do) : ''}`.trim(), { cena_od: '', cena_do: '' });
  if (f.pow_od !== null || f.pow_do !== null) add(`Metraż: ${f.pow_od !== null ? 'od ' + f.pow_od : ''} ${f.pow_do !== null ? 'do ' + f.pow_do : ''} m²`.replace('  ', ' '), { pow_od: '', pow_do: '' });
  if (f.pokoje_od !== null || f.pokoje_do !== null) add(`Pokoje: ${f.pokoje_od !== null ? 'od ' + f.pokoje_od : ''} ${f.pokoje_do !== null ? 'do ' + f.pokoje_do : ''}`.trim(), { pokoje_od: '', pokoje_do: '' });
  if (f.rynek) add(f.rynek === 'pierwotny' ? 'Rynek pierwotny' : 'Rynek wtórny', { rynek: '' });
  if (f.ogloszeniodawca) add(ADVERTISER[f.ogloszeniodawca], { ogloszeniodawca: '' });
  if (f.dzielnica) add(f.dzielnica, { dzielnica: '' });
  f.stan.forEach((x) => add(x, { stan: f.stan.filter((y) => y !== x) }));
  f.zabudowa.forEach((x) => add(x, { zabudowa: f.zabudowa.filter((y) => y !== x) }));
  f.ogrzewanie.forEach((x) => add('Ogrzewanie: ' + x.toLowerCase(), { ogrzewanie: f.ogrzewanie.filter((y) => y !== x) }));
  f.cechy.forEach((x) => add(FEATURE_LABEL[x] || x, { cechy: f.cechy.filter((y) => y !== x) }));
  if (f.czynsz_do !== null) add(`Czynsz do ${fmt.num(f.czynsz_do)} zł`, { czynsz_do: '' });
  if (f.pietro_od !== null || f.pietro_do !== null) add(`Piętro ${f.pietro_od !== null ? 'od ' + f.pietro_od : ''} ${f.pietro_do !== null ? 'do ' + f.pietro_do : ''}`.trim(), { pietro_od: '', pietro_do: '' });
  if (f.rok_od !== null || f.rok_do !== null) add(`Rok budowy ${f.rok_od !== null ? 'od ' + f.rok_od : ''} ${f.rok_do !== null ? 'do ' + f.rok_do : ''}`.trim(), { rok_od: '', rok_do: '' });
  if (f.cena_m2_od !== null || f.cena_m2_do !== null) add(`Cena m² ${f.cena_m2_od !== null ? 'od ' + fmt.num(f.cena_m2_od) : ''} ${f.cena_m2_do !== null ? 'do ' + fmt.num(f.cena_m2_do) : ''}`.trim(), { cena_m2_od: '', cena_m2_do: '' });
  if (f.lazienki_od !== null) add(`Łazienki: ${f.lazienki_od}+`, { lazienki_od: '' });
  if (f.dzialka_od !== null) add(`Działka od ${fmt.num(f.dzialka_od)} m²`, { dzialka_od: '' });
  if (f.material) add(f.material, { material: '' });
  if (f.parking) add('Parking: ' + f.parking.toLowerCase(), { parking: '' });
  if (f.dostepne_od) add('Dostępne od ' + f.dostepne_od.split('-').reverse().join('.'), { dostepne_od: '' });
  if (f.dodane) add(`Dodane w ost. ${f.dodane} ${f.dodane === '1' ? 'dzień' : 'dni'}`, { dodane: '' });
  if (f.obnizka) add('Obniżona cena', { obnizka: '' });
  if (f.z_mapa) add('Z dokładnym adresem', { z_mapa: '' });
  if (f.bez_prowizji) add('Bez prowizji', { bez_prowizji: '' });
  if (f.ze_zdjeciami) add('Ze zdjęciami', { ze_zdjeciami: '' });
  if (f.q) add('„' + f.q + '”', { q: '' });
  return chips;
}

// Punkty na mapę wyników (lekka odpowiedź JSON)
async function mapPins(f, limit = 600) {
  const rows = await Listing.find({ ...mongoFilter(f), geo: mongoFilter(f).geo || { $exists: true } }, 'num slug title price transaction area rooms cityName district geo geoPrecise images featuredUntil').sort({ bumpedAt: -1 }).limit(limit).lean();
  return rows.map((l) => ({
    id: l.num, url: `/oferta/${l.slug}-${l.num}`, title: l.title, price: l.price, tr: l.transaction, area: l.area, rooms: l.rooms,
    city: l.cityName + (l.district ? ', ' + l.district : ''), lat: l.geo.coordinates[1], lng: l.geo.coordinates[0], precise: !!l.geoPrecise,
    img: l.images && l.images[0] ? l.images[0].url : null, featured: !!(l.featuredUntil && new Date(l.featuredUntil) > new Date())
  }));
}

// Nagłówki i meta dla stron wyników
function headings(f, total) {
  const t = f.type || TYPE_BY_SLUG.nieruchomosci;
  const base = f.transaction === 'wynajem' ? t.rent : f.transaction === 'sprzedaz' ? t.sale : t.plural;
  const where = f.location ? `w ${f.location.loc}${f.promien ? ` i okolicy (+${f.promien} km)` : ''}` : 'na Pomorzu i Pomorzu Zachodnim';
  const short = f.location ? f.location.name : 'Pomorskie i Zachodniopomorskie';
  const h1 = `${base} ${where}`;
  const title = `${base} ${short}${total ? ` – ${total} ofert` : ''}`;
  const description = `${base} ${where}. Aktualne ogłoszenia od właścicieli, biur nieruchomości i deweloperów${f.location && f.location.kind === 'city' ? '' : ' z województwa pomorskiego i zachodniopomorskiego'}. Ceny, zdjęcia, mapa i kalkulator raty.`;
  return { h1, title, description };
}

module.exports = { activeChips, mapPins, parse, mongoFilter, sortSpec, run, withUrl, pathFor, queryString, headings, NUM_PARAMS, AREAS, TYPE_BY_KEY };
