// Jednorazowo przy starcie: ogłoszenia bez punktu na mapie dostają środek swojej miejscowości
// (potrzebne do wyszukiwania w promieniu i kierowania reklam na obszar).
const { Listing } = require('../models');
const { getCity } = require('../config/locations');

async function run() {
  try {
    const missing = await Listing.find({ $or: [{ geo: { $exists: false } }, { 'geo.coordinates': { $size: 0 } }] }).select('city lat lng').lean();
    let fixed = 0;
    for (const l of missing) {
      const c = getCity(l.city);
      const lat = l.lat || (c && c.lat);
      const lng = l.lng || (c && c.lng);
      if (!lat || !lng) continue;
      await Listing.updateOne({ _id: l._id }, { $set: { geo: { type: 'Point', coordinates: [lng, lat] } } });
      fixed++;
    }
    if (fixed) console.log(`[geo] uzupełniono punkt na mapie w ${fixed} ogłoszeniach`);
  } catch (e) {
    console.warn('[geo] pominięto uzupełnianie współrzędnych:', e.message);
  }
}

module.exports = { run };
