// Geokodowanie adresów (OpenStreetMap Nominatim) – używane przy zapisie ogłoszenia i przycisku „Znajdź na mapie”.
// Zasady Nominatim: maks. 1 zapytanie/s, własny User-Agent. Można podać własny serwer w GEOCODER_URL.
const site = require('../config/site');

const BASE = (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const cache = new Map();
let lastCall = 0;

async function geocode({ street, district, cityName, voivodeship }) {
  if (process.env.GEOCODER_DISABLED === 'true' || !cityName) return null;
  const q = [street, district, cityName, voivodeship ? 'województwo ' + voivodeship : '', 'Polska'].filter(Boolean).join(', ');
  if (cache.has(q)) return cache.get(q);
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  try {
    const url = `${BASE}/search?format=jsonv2&limit=1&countrycodes=pl&accept-language=pl&q=${encodeURIComponent(q)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { headers: { 'User-Agent': `${site.name} (${site.contact.email})` }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const [hit] = await r.json();
    const out = hit ? { lat: Number(Number(hit.lat).toFixed(6)), lng: Number(Number(hit.lon).toFixed(6)), label: hit.display_name } : null;
    cache.set(q, out);
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
    return out;
  } catch (e) {
    return null;
  }
}

module.exports = { geocode };
