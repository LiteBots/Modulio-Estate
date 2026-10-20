const { StatDaily, Listing } = require('../models');
const { dayKey } = require('../utils/format');

async function track(listing, field) {
  try {
    const inc = { [field]: 1 };
    await StatDaily.updateOne(
      { listing: listing._id, day: dayKey() },
      { $inc: inc, $setOnInsert: { agency: listing.agency || null, owner: listing.owner || null } },
      { upsert: true }
    );
    const map = { views: 'views', phone: 'phoneReveals', inquiries: 'inquiriesCount' };
    await Listing.updateOne({ _id: listing._id }, { $inc: { [map[field]]: 1 } });
  } catch (e) {
    console.error('[stats]', e.message);
  }
}

// Seria dzienna dla wykresu (ostatnie N dni)
async function series(match, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    keys.push(dayKey(d));
  }
  const rows = await StatDaily.aggregate([
    { $match: { ...match, day: { $gte: keys[0] } } },
    { $group: { _id: '$day', views: { $sum: '$views' }, phone: { $sum: '$phone' }, inquiries: { $sum: '$inquiries' } } }
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r]));
  return {
    labels: keys.map((k) => k.slice(8, 10) + '.' + k.slice(5, 7)),
    views: keys.map((k) => (by[k] ? by[k].views : 0)),
    phone: keys.map((k) => (by[k] ? by[k].phone : 0)),
    inquiries: keys.map((k) => (by[k] ? by[k].inquiries : 0))
  };
}

module.exports = { track, series };
