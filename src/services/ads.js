// Wybór reklamy dla danego miejsca + kierowanie + zliczanie wyświetleń.
//
// ctx (wszystko opcjonalne): city, voivodeship, type, transaction, market, price, lat, lng,
// device ('desktop' | 'mobile'), session (sesja odwiedzającego – do limitu wyświetleń na osobę).
const { Ad } = require('../models');
const { getCity, distanceKm } = require('../config/locations');

const TZ = 'Europe/Warsaw';
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nowInPoland(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  return { day: DAY_INDEX[get('weekday')], hour: Number(get('hour')) % 24, dateKey: `${get('year')}-${get('month')}-${get('day')}` };
}

function has(list) {
  return Array.isArray(list) && list.length > 0;
}

function pointOf(ctx) {
  if (ctx.lat && ctx.lng) return { lat: Number(ctx.lat), lng: Number(ctx.lng) };
  const c = ctx.city && getCity(ctx.city);
  return c && c.lat ? { lat: c.lat, lng: c.lng } : null;
}

// Czy reklama pasuje do kontekstu strony (poza warunkami sprawdzonymi już w zapytaniu do bazy).
function matches(ad, ctx, now) {
  if (has(ad.types) && !(ctx.type && ad.types.includes(ctx.type))) return false;
  if (has(ad.transactions) && !(ctx.transaction && ad.transactions.includes(ctx.transaction))) return false;
  if (has(ad.markets) && !(ctx.market && ad.markets.includes(ctx.market))) return false;
  if (ad.priceMin || ad.priceMax) {
    const p = Number(ctx.price);
    if (!p) return false;
    if (ad.priceMin && p < ad.priceMin) return false;
    if (ad.priceMax && p > ad.priceMax) return false;
  }
  if (ad.area && ad.area.radiusKm && ad.area.lat && ad.area.lng) {
    const pt = pointOf(ctx);
    if (!pt || distanceKm({ lat: ad.area.lat, lng: ad.area.lng }, pt) > ad.area.radiusKm) return false;
  }
  if (has(ad.devices) && !(ctx.device && ad.devices.includes(ctx.device))) return false;
  if (has(ad.days) && !ad.days.includes(now.day)) return false;
  const from = Number.isFinite(ad.hourFrom) ? ad.hourFrom : null;
  const to = Number.isFinite(ad.hourTo) ? ad.hourTo : null;
  if (from !== null && to !== null && from !== to) {
    const inside = from < to ? now.hour >= from && now.hour < to : now.hour >= from || now.hour < to; // np. 22–6
    if (!inside) return false;
  }
  if (ad.maxImpressions && (ad.impressions || 0) >= ad.maxImpressions) return false;
  if (ad.maxPerDayPerVisitor && ctx.session) {
    const seen = (ctx.session.adSeen || {})[String(ad._id)];
    if (seen && seen.d === now.dateKey && seen.n >= ad.maxPerDayPerVisitor) return false;
  }
  return true;
}

function remember(ad, ctx, now) {
  if (!ad.maxPerDayPerVisitor || !ctx.session) return;
  const all = ctx.session.adSeen || {};
  const id = String(ad._id);
  const cur = all[id] && all[id].d === now.dateKey ? all[id] : { d: now.dateKey, n: 0 };
  cur.n += 1;
  all[id] = cur;
  // sprzątanie starych wpisów, żeby sesja nie rosła
  Object.keys(all).forEach((k) => { if (all[k].d !== now.dateKey) delete all[k]; });
  ctx.session.adSeen = all;
}

async function pick(placement, ctx = {}) {
  try {
    const date = new Date();
    const now = nowInPoland(date);
    const ads = await Ad.find({
      active: true,
      $and: [
        { $or: [{ placements: placement }, { placement }] },
        { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: date } }] },
        { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: date } }] },
        { $or: [{ cities: { $size: 0 } }, { cities: { $exists: false } }, ...(ctx.city ? [{ cities: ctx.city }] : [])] },
        { $or: [{ voivodeships: { $size: 0 } }, { voivodeships: { $exists: false } }, ...(ctx.voivodeship ? [{ voivodeships: ctx.voivodeship }] : [])] }
      ]
    }).lean();
    const matching = ads.filter((a) => matches(a, ctx, now));
    if (!matching.length) return null;
    const used = ctx.used || new Set();
    const fresh = matching.filter((a) => !used.has(String(a._id)));
    const fit = fresh.length ? fresh : matching;
    // losowanie ważone priorytetem
    const total = fit.reduce((s, a) => s + (a.priority || 1), 0);
    let r = Math.random() * total;
    const ad = fit.find((a) => (r -= a.priority || 1) <= 0) || fit[0];
    Ad.updateOne({ _id: ad._id }, { $inc: { impressions: 1 } }).catch(() => {});
    remember(ad, ctx, now);
    used.add(String(ad._id));
    ctx.used = used;
    return ad;
  } catch (e) {
    return null;
  }
}

async function pickMany(placements, ctx) {
  const out = {};
  // po kolei: ta sama kampania nie zajmie kilku miejsc na jednej stronie, jeśli są inne pasujące
  const shared = { ...(ctx || {}), used: (ctx && ctx.used) || new Set() };
  for (const p of placements) {
    out[p] = await pick(p, shared);
  }
  return out;
}

// Kontekst z obiektu ogłoszenia.
function listingCtx(l, extra = {}) {
  return { city: l.city, voivodeship: l.voivodeship, type: l.type, transaction: l.transaction, market: l.market, price: l.price, lat: l.lat, lng: l.lng, ...extra };
}

function deviceOf(req) {
  return /Mobi|Android|iPhone|iPod|Opera Mini|IEMobile/i.test(req.get('user-agent') || '') ? 'mobile' : 'desktop';
}

module.exports = { pick, pickMany, listingCtx, deviceOf, matches, nowInPoland };
