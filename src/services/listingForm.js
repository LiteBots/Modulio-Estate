// Wspólna logika formularza ogłoszenia (panel klienta i panel biura).
const { TYPE_BY_KEY, FEATURE_LABEL, OPTIONS, ADVERTISER } = require('../config/property');
const { geocode } = require('./geocode');
const { getCity } = require('../config/locations');
const { publicUrl, removeFile } = require('./upload');

function n(v) {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const x = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(x) ? x : undefined;
}
function s(v, max = 200) {
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim().slice(0, max);
  return t || undefined;
}

function opt(key, v) {
  return OPTIONS[key] && OPTIONS[key].includes(v) ? v : undefined;
}

function parse(body) {
  const errors = [];
  const city = getCity(body.city);
  const data = {
    title: s(body.title, 140),
    description: s(body.description, 12000),
    transaction: body.transaction === 'wynajem' ? 'wynajem' : 'sprzedaz',
    type: TYPE_BY_KEY[body.type] ? body.type : null,
    market: body.market === 'pierwotny' ? 'pierwotny' : 'wtorny',
    price: n(body.price),
    negotiable: body.negotiable === 'on',
    rentExtra: n(body.rentExtra),
    deposit: n(body.deposit),
    area: n(body.area),
    plotArea: n(body.plotArea),
    rooms: n(body.rooms),
    floor: n(body.floor),
    floorsTotal: n(body.floorsTotal),
    yearBuilt: n(body.yearBuilt),
    bathrooms: n(body.bathrooms),
    buildingType: opt('buildingType', body.buildingType),
    buildingMaterial: opt('buildingMaterial', body.buildingMaterial),
    condition: opt('condition', body.condition),
    heating: opt('heating', body.heating),
    ownership: opt('ownership', body.ownership),
    plotType: opt('plotType', body.plotType),
    windows: opt('windows', body.windows),
    kitchen: opt('kitchen', body.kitchen),
    parking: opt('parking', body.parking),
    energyClass: opt('energyClass', body.energyClass),
    energyKwh: n(body.energyKwh),
    balconyArea: n(body.balconyArea),
    roof: opt('roof', body.roof),
    access: opt('access', body.access),
    plotWidth: n(body.plotWidth),
    plotLength: n(body.plotLength),
    rentFor: opt('rentFor', body.rentFor),
    minRentMonths: n(body.minRentMonths),
    advertiserType: ADVERTISER[body.advertiserType] ? body.advertiserType : 'prywatny',
    availableFrom: body.availableFrom ? new Date(body.availableFrom) : undefined,
    features: [].concat(body.features || []).filter((f) => FEATURE_LABEL[f]),
    city: city ? city.slug : null,
    cityName: city ? city.name : undefined,
    voivodeship: city ? city.voivodeship : undefined,
    district: s(body.district, 80),
    street: s(body.street, 120),
    showExactAddress: body.showExactAddress === 'on',
    lat: n(body.lat),
    lng: n(body.lng),
    videoUrl: s(body.videoUrl, 300),
    virtualTourUrl: s(body.virtualTourUrl, 300),
    contactName: s(body.contactName, 120),
    contactPhone: s(body.contactPhone, 40),
    contactEmail: s(body.contactEmail, 120),
    noCommission: body.noCommission === 'on',
    refNumber: s(body.refNumber, 40)
  };
  if (!data.title || data.title.length < 10) errors.push('Tytuł musi mieć co najmniej 10 znaków.');
  if (!data.type) errors.push('Wybierz rodzaj nieruchomości.');
  if (!data.city) errors.push('Wybierz miejscowość z listy (pomorskie lub zachodniopomorskie).');
  if (!data.price || data.price <= 0) errors.push('Podaj cenę.');
  if (data.type !== 'dzialka' && (!data.area || data.area <= 0)) errors.push('Podaj powierzchnię.');
  if (data.type === 'dzialka' && !data.area && data.plotArea) data.area = data.plotArea;
  if (!data.description || data.description.length < 40) errors.push('Opis musi mieć co najmniej 40 znaków.');
  if (data.videoUrl && !/^https:\/\//.test(data.videoUrl)) data.videoUrl = undefined;
  if (data.virtualTourUrl && !/^https:\/\//.test(data.virtualTourUrl)) data.virtualTourUrl = undefined;
  if (data.lat && (data.lat < 52.5 || data.lat > 55.1 || data.lng < 13.9 || data.lng > 19.8)) {
    errors.push('Pinezka na mapie musi być w województwie pomorskim lub zachodniopomorskim.');
    data.lat = data.lng = undefined;
  }
  if (data.availableFrom && isNaN(data.availableFrom)) data.availableFrom = undefined;
  return { data, errors };
}

// Zdjęcia: zachowane (keep[] w kolejności), nowe pliki, zdjęcie główne (cover)
function applyImages(listing, body, files) {
  const existing = listing.images || [];
  const keep = [].concat(body.keepImages || []);
  const kept = keep.map((u) => existing.find((i) => i.url === u)).filter(Boolean);
  existing.filter((i) => !keep.includes(i.url)).forEach((i) => removeFile(i.url));
  const added = (files || []).map((f) => ({ url: publicUrl('listings', f), alt: listing.title }));
  let images = [...kept, ...added].slice(0, 30);
  if (body.cover) {
    const idx = images.findIndex((i) => i.url === body.cover);
    if (idx > 0) images = [images[idx], ...images.slice(0, idx), ...images.slice(idx + 1)];
  }
  listing.images = images.map((i) => ({ url: i.url, alt: listing.title }));
}

// Jeśli użytkownik nie postawił pinezki, a podał ulicę – spróbuj ustalić współrzędne adresu.
async function ensureCoords(data, prev) {
  if (data.lat && data.lng) return data;
  const sameAddress = prev && prev.street === data.street && prev.city === data.city && prev.lat;
  if (sameAddress) {
    data.lat = prev.lat;
    data.lng = prev.lng;
    return data;
  }
  if (data.street) {
    const hit = await geocode(data);
    if (hit) {
      data.lat = hit.lat;
      data.lng = hit.lng;
    }
  }
  return data;
}

module.exports = { parse, applyImages, ensureCoords };
