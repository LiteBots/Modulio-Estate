// Statystyki rynku liczone z ogłoszeń w bazie (raport cen, strony miast, strona główna).
const { Listing } = require('../models');

async function cityStats(match = {}) {
  return Listing.aggregate([
    { $match: { status: 'active', ...match } },
    {
      $group: {
        _id: '$city',
        cityName: { $first: '$cityName' },
        voivodeship: { $first: '$voivodeship' },
        count: { $sum: 1 },
        sale: { $sum: { $cond: [{ $eq: ['$transaction', 'sprzedaz'] }, 1, 0] } },
        rent: { $sum: { $cond: [{ $eq: ['$transaction', 'wynajem'] }, 1, 0] } },
        avgM2: { $avg: { $cond: [{ $and: [{ $eq: ['$transaction', 'sprzedaz'] }, { $eq: ['$type', 'mieszkanie'] }] }, '$pricePerM2', null] } },
        avgRent: { $avg: { $cond: [{ $and: [{ $eq: ['$transaction', 'wynajem'] }, { $eq: ['$type', 'mieszkanie'] }] }, '$price', null] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
}

async function typeCounts(match = {}) {
  const rows = await Listing.aggregate([{ $match: { status: 'active', ...match } }, { $group: { _id: { t: '$type', tr: '$transaction' }, n: { $sum: 1 } } }]);
  const out = {};
  rows.forEach((r) => {
    out[r._id.t] = out[r._id.t] || { sprzedaz: 0, wynajem: 0, all: 0 };
    out[r._id.t][r._id.tr] = r.n;
    out[r._id.t].all += r.n;
  });
  return out;
}

// Średnia cena m² mieszkań na sprzedaż wg miesiąca publikacji (ostatnie 12 mies.)
async function monthlyM2(match = {}) {
  const from = new Date();
  from.setMonth(from.getMonth() - 11, 1);
  from.setHours(0, 0, 0, 0);
  const rows = await Listing.aggregate([
    { $match: { type: 'mieszkanie', transaction: 'sprzedaz', pricePerM2: { $gt: 0 }, createdAt: { $gte: from }, ...match } },
    { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, avg: { $avg: '$pricePerM2' }, n: { $sum: 1 } } }
  ]);
  const labels = [], values = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(from);
    d.setMonth(from.getMonth() + i);
    const r = rows.find((x) => x._id.y === d.getFullYear() && x._id.m === d.getMonth() + 1);
    labels.push(String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getFullYear()).slice(2));
    values.push(r ? Math.round(r.avg) : null);
  }
  // uzupełnij luki poprzednią wartością
  let last = values.find((v) => v) || 0;
  for (let i = 0; i < values.length; i++) values[i] = values[i] || last, (last = values[i]);
  return { labels, values };
}

module.exports = { cityStats, typeCounts, monthlyM2 };
