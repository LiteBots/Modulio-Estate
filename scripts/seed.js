// Seed bazy: konto administratora + (opcjonalnie) dane demonstracyjne.
//   npm run seed               → tylko administrator (ADMIN_EMAILS + SEED_ADMIN_PASSWORD)
//   npm run seed -- --demo     → dodatkowo biuro demo i przykładowe ogłoszenia
//   npm run seed -- --wyczysc-demo → usuwa dane demo
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/db');
const { User, Agency, Listing } = require('../src/models');
const { nextSeq } = require('../src/models/Counter');
const { getCity } = require('../src/config/locations');

const DEMO_TAG = '[DEMO]';

async function admin() {
  const email = (process.env.ADMIN_EMAILS || '').split(',')[0].trim().toLowerCase();
  if (!email) return console.log('Pomijam administratora: brak ADMIN_EMAILS.');
  let u = await User.findOne({ email });
  if (!u) u = new User({ email, name: 'Administrator', acceptedTermsAt: new Date() });
  u.role = 'admin';
  if (process.env.SEED_ADMIN_PASSWORD) await u.setPassword(process.env.SEED_ADMIN_PASSWORD);
  await u.save();
  console.log(`Administrator: ${email}${process.env.SEED_ADMIN_PASSWORD ? ' (hasło z SEED_ADMIN_PASSWORD)' : ' (zaloguj się przez Google lub zresetuj hasło)'}`);
}

const DEMO = [
  ['3 pokoje z balkonem, 10 min do plaży', 'sprzedaz', 'mieszkanie', 689000, 61.5, 3, 'ustka', '', ['balkon', 'blisko_morza']],
  ['Dom z ogrodem 1200 m² pod Słupskiem', 'sprzedaz', 'dom', 949000, 156, 5, 'kobylnica', '', ['ogrod', 'garaz']],
  ['Mieszkanie 2-pokojowe na Zatorzu', 'sprzedaz', 'mieszkanie', 389000, 47, 2, 'slupsk', 'Zatorze', ['piwnica']],
  ['Kawalerka do wynajęcia w centrum Słupska', 'wynajem', 'mieszkanie', 1700, 28, 1, 'slupsk', 'Śródmieście', ['umeblowane']],
  ['Apartament z widokiem na morze w Orłowie', 'sprzedaz', 'mieszkanie', 1890000, 78, 3, 'gdynia', 'Orłowo', ['widok_na_morze', 'winda']],
  ['2 pokoje do wynajęcia we Wrzeszczu', 'wynajem', 'mieszkanie', 3300, 44, 2, 'gdansk', 'Wrzeszcz', ['balkon']],
  ['Kamienica po remoncie – 4 pokoje w Oliwie', 'sprzedaz', 'mieszkanie', 1150000, 96, 4, 'gdansk', 'Oliwa', ['piwnica']],
  ['Studio przy molo w Sopocie', 'sprzedaz', 'mieszkanie', 990000, 35, 1, 'sopot', 'Dolny Sopot', ['blisko_morza']],
  ['Nowe 2 pokoje na Warszewie', 'sprzedaz', 'mieszkanie', 512000, 48, 2, 'szczecin', 'Warszewo', ['balkon', 'miejsce_postojowe'], 'pierwotny'],
  ['Biuro 120 m² w centrum Szczecina', 'wynajem', 'biuro', 7800, 120, 4, 'szczecin', 'Śródmieście', ['klimatyzacja', 'winda']],
  ['Mieszkanie 3-pokojowe na Rokosowie', 'sprzedaz', 'mieszkanie', 479000, 63, 3, 'koszalin', 'Rokosowo', ['balkon']],
  ['Lokal usługowy z witryną', 'wynajem', 'lokal', 5400, 92, 2, 'koszalin', 'Śródmieście', []],
  ['Apartament w dzielnicy uzdrowiskowej', 'sprzedaz', 'mieszkanie', 899000, 52, 2, 'kolobrzeg', '', ['blisko_morza', 'winda']],
  ['Działka budowlana 1050 m² z WZ', 'sprzedaz', 'dzialka', 189000, 1050, 0, 'bytow', '', ['media']],
  ['Mieszkanie 3-pokojowe w kamienicy', 'sprzedaz', 'mieszkanie', 459000, 72, 3, 'miastko', '', ['piwnica']],
  ['Segment 118 m² w stanie deweloperskim', 'sprzedaz', 'dom', 749000, 118, 4, 'chojnice', '', ['ogrod'], 'pierwotny'],
  ['Dom letniskowy blisko plaży', 'sprzedaz', 'dom', 620000, 74, 3, 'rowy', '', ['blisko_morza', 'ogrod']],
  ['Apartament w Międzyzdrojach z tarasem', 'sprzedaz', 'mieszkanie', 1090000, 58, 2, 'miedzyzdroje', '', ['taras', 'blisko_morza']],
  ['Hala magazynowa 800 m² przy S6', 'wynajem', 'magazyn', 18000, 800, 0, 'slupsk', '', ['monitoring']],
  ['Garaż murowany z prądem', 'sprzedaz', 'garaz', 59000, 18, 0, 'lebork', '', []]
];

async function demo() {
  const owner = await User.findOne({ role: 'admin' });
  let agency = await Agency.findOne({ slug: 'demo-nadmorskie-nieruchomosci' });
  if (!agency) {
    agency = await Agency.create({
      name: 'Nadmorskie Nieruchomości (demo)', slug: 'demo-nadmorskie-nieruchomosci', city: 'slupsk', voivodeship: 'pomorskie', brandColor: '#1f6f78',
      shortDescription: 'Biuro demonstracyjne – Słupsk, Ustka i okolice.', about: 'To biuro jest przykładem strony partnera w ModulioEstate. Usuń je poleceniem: npm run seed -- --wyczysc-demo',
      phone: '+48 000 000 000', email: 'demo@example.com', serviceAreas: ['slupsk', 'ustka', 'kobylnica'],
      plan: { name: 'Demo', microsite: true, maxListings: 100, maxAgents: 5, featuredSlots: 5, bumpsPerMonth: 20 },
      microsite: { enabled: true, headline: 'Twoje biuro nieruchomości nad morzem', subheadline: 'Słupsk · Ustka · Rowy', highlights: ['Bezpłatna wycena', 'Pomoc w kredycie'] },
      members: owner ? [{ user: owner._id, role: 'owner' }] : []
    });
    if (owner && !owner.agency) await User.updateOne({ _id: owner._id }, { agency: agency._id });
  }
  for (const [i, d] of DEMO.entries()) {
    const c = getCity(d[6]);
    const l = new Listing({
      num: await nextSeq('listing'), title: `${d[0]} ${DEMO_TAG}`, transaction: d[1], type: d[2], price: d[3], area: d[4], rooms: d[5] || undefined, city: c.slug, cityName: c.name, voivodeship: c.voivodeship, district: d[7] || undefined, features: d[8], market: d[9] || 'wtorny',
      description: 'Ogłoszenie demonstracyjne do prezentacji wyglądu serwisu. Zostanie usunięte poleceniem npm run seed -- --wyczysc-demo.\n\nW okolicy:\n- sklep\n- przystanek\n- szkoła',
      status: 'active', agency: i % 2 ? agency._id : undefined, owner: owner ? owner._id : undefined, agent: i % 2 && owner ? owner._id : undefined,
      contactName: 'Demo', contactPhone: '+48 000 000 000', featuredUntil: i < 3 ? new Date(Date.now() + 14 * 864e5) : undefined,
      lat: c.lat || undefined, lng: c.lng || undefined, expiresAt: new Date(Date.now() + 60 * 864e5), views: 40 + i * 7
    });
    await l.save();
  }
  console.log(`Dodano ${DEMO.length} ogłoszeń demo i biuro demo.`);
}

async function wipe() {
  const r = await Listing.deleteMany({ title: { $regex: '\\[DEMO\\]' } });
  const a = await Agency.findOne({ slug: 'demo-nadmorskie-nieruchomosci' });
  if (a) {
    await User.updateMany({ agency: a._id }, { $unset: { agency: 1 } });
    await a.deleteOne();
  }
  console.log(`Usunięto ${r.deletedCount} ogłoszeń demo${a ? ' i biuro demo' : ''}.`);
}

(async () => {
  await connectDB();
  if (process.argv.includes('--wyczysc-demo')) await wipe();
  else {
    await admin();
    if (process.argv.includes('--demo')) await demo();
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
