// Ustawienia serwisu z panelu admina: zapis w bazie, nakładane na obiekt `site` (src/config/site.js),
// z którego korzystają wszystkie widoki. Puste pole = wartość domyślna (zmienna z Railway albo wartość w kodzie).
const site = require('../config/site');

const DEFAULTS = JSON.parse(JSON.stringify({ tagline: site.tagline, description: site.description, contact: site.contact, company: site.company, socials: site.socials }));

const FIELDS = [
  { group: 'Marka', items: [['tagline', 'Hasło serwisu', 'text'], ['description', 'Opis serwisu (SEO, stopka)', 'textarea']] },
  { group: 'Kontakt', items: [['contact.email', 'E-mail kontaktowy', 'email'], ['contact.partnersEmail', 'E-mail dla biur (partnerzy)', 'email'], ['contact.adsEmail', 'E-mail w sprawie reklam', 'email'], ['contact.phone', 'Telefon', 'text'], ['contact.hours', 'Godziny pracy', 'text']] },
  { group: 'Dane firmy (regulamin, polityka prywatności, stopka)', items: [['company.name', 'Nazwa firmy', 'text'], ['company.address', 'Adres siedziby', 'text'], ['company.nip', 'NIP', 'text'], ['company.regon', 'REGON', 'text']] },
  { group: 'Media społecznościowe', items: [['socials.facebook', 'Facebook', 'url'], ['socials.instagram', 'Instagram', 'url'], ['socials.linkedin', 'LinkedIn', 'url'], ['socials.tiktok', 'TikTok', 'url'], ['socials.youtube', 'YouTube', 'url']] }
];

function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setPath(obj, p, v) {
  const keys = p.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
  o[keys[keys.length - 1]] = v;
}

let overrides = {};

function apply(data) {
  overrides = data || {};
  FIELDS.forEach((g) => g.items.forEach(([p]) => {
    const v = getPath(overrides, p);
    setPath(site, p, v !== undefined && v !== null && String(v).trim() !== '' ? v : getPath(DEFAULTS, p));
  }));
}

async function load() {
  try {
    const { Setting } = require('../models');
    const doc = await Setting.findOne({ key: 'site' }).lean();
    apply(doc ? doc.data : {});
  } catch (e) {
    console.warn('[ustawienia] Nie udało się wczytać ustawień:', e.message);
  }
}

function clean(p, type, raw) {
  const v = String(raw || '').trim().slice(0, type === 'textarea' ? 600 : 200);
  if (!v) return '';
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return '';
  if (type === 'url' && !/^https:\/\//.test(v)) return '';
  return v;
}

async function save(body) {
  const { Setting } = require('../models');
  const data = {};
  FIELDS.forEach((g) => g.items.forEach(([p, , type]) => {
    const v = clean(p, type, body[p]);
    if (v) setPath(data, p, v);
  }));
  await Setting.findOneAndUpdate({ key: 'site' }, { key: 'site', data }, { upsert: true, new: true, setDefaultsOnInsert: true });
  apply(data);
  return data;
}

function current(p) {
  return getPath(overrides, p) || '';
}
function fallback(p) {
  return getPath(DEFAULTS, p) || '';
}

module.exports = { FIELDS, load, save, current, fallback };
