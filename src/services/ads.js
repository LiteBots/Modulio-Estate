// Wybór reklamy dla danego miejsca i lokalizacji + zliczanie wyświetleń.
const { Ad } = require('../models');

async function pick(placement, { city, voivodeship } = {}) {
  try {
    const now = new Date();
    const ads = await Ad.find({
      placement,
      active: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
        { $or: [{ cities: { $size: 0 } }, ...(city ? [{ cities: city }] : [])] },
        { $or: [{ voivodeships: { $size: 0 } }, ...(voivodeship ? [{ voivodeships: voivodeship }] : [])] }
      ]
    }).lean();
    if (!ads.length) return null;
    // losowanie ważone priorytetem
    const total = ads.reduce((s, a) => s + (a.priority || 1), 0);
    let r = Math.random() * total;
    const ad = ads.find((a) => (r -= a.priority || 1) <= 0) || ads[0];
    Ad.updateOne({ _id: ad._id }, { $inc: { impressions: 1 } }).catch(() => {});
    return ad;
  } catch (e) {
    return null;
  }
}

async function pickMany(placements, ctx) {
  const out = {};
  await Promise.all(placements.map(async (p) => (out[p] = await pick(p, ctx))));
  return out;
}

module.exports = { pick, pickMany };
