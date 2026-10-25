// Wspólna logika formularza ogłoszenia (panel klienta i panel biura).
const { TYPE_BY_KEY, FEATURE_LABEL } = require('../config/property');
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
    buildingType: s(body.buildingType, 60),
    condition: s(body.condition, 60),
    heating: s(body.heating, 60),
    ownership: s(body.ownership, 60),
    plotType: s(body.plotType, 60),
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

module.exports = { parse, applyImages };
