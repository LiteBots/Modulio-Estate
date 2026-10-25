// Słowniki: typy nieruchomości, transakcje, cechy, statusy.
const TYPES = [
  { key: 'mieszkanie', slug: 'mieszkania', label: 'Mieszkanie', plural: 'Mieszkania', icon: 'building', scene: 'block', sale: 'Mieszkania na sprzedaż', rent: 'Mieszkania do wynajęcia' },
  { key: 'dom', slug: 'domy', label: 'Dom', plural: 'Domy', icon: 'home', scene: 'house', sale: 'Domy na sprzedaż', rent: 'Domy do wynajęcia' },
  { key: 'dzialka', slug: 'dzialki', label: 'Działka', plural: 'Działki', icon: 'trees', scene: 'plot', sale: 'Działki na sprzedaż', rent: 'Działki do dzierżawy' },
  { key: 'lokal', slug: 'lokale-uzytkowe', label: 'Lokal użytkowy', plural: 'Lokale użytkowe', icon: 'store', scene: 'loft', sale: 'Lokale użytkowe na sprzedaż', rent: 'Lokale użytkowe do wynajęcia' },
  { key: 'biuro', slug: 'biura', label: 'Biuro', plural: 'Biura', icon: 'briefcase', scene: 'office', sale: 'Biura na sprzedaż', rent: 'Biura do wynajęcia' },
  { key: 'magazyn', slug: 'magazyny-i-hale', label: 'Magazyn / hala', plural: 'Magazyny i hale', icon: 'warehouse', scene: 'warehouse', sale: 'Magazyny i hale na sprzedaż', rent: 'Magazyny i hale do wynajęcia' },
  { key: 'garaz', slug: 'garaze', label: 'Garaż', plural: 'Garaże', icon: 'car', scene: 'garage', sale: 'Garaże na sprzedaż', rent: 'Garaże do wynajęcia' },
  { key: 'pokoj', slug: 'pokoje', label: 'Pokój', plural: 'Pokoje', icon: 'bed', scene: 'block', sale: 'Pokoje na sprzedaż', rent: 'Pokoje do wynajęcia' }
];
const ALL_TYPE = { key: null, slug: 'nieruchomosci', label: 'Nieruchomość', plural: 'Nieruchomości', icon: 'building', scene: 'block', sale: 'Nieruchomości na sprzedaż', rent: 'Nieruchomości do wynajęcia' };

const TYPE_BY_KEY = Object.fromEntries(TYPES.map((t) => [t.key, t]));
const TYPE_BY_SLUG = Object.fromEntries([...TYPES, ALL_TYPE].map((t) => [t.slug, t]));

const TRANSACTIONS = {
  sprzedaz: { key: 'sprzedaz', label: 'Sprzedaż', path: '/sprzedaz', adj: 'na sprzedaż' },
  wynajem: { key: 'wynajem', label: 'Wynajem', path: '/wynajem', adj: 'do wynajęcia' }
};

const MARKETS = { pierwotny: 'Rynek pierwotny', wtorny: 'Rynek wtórny' };
const ADVERTISER = { prywatny: 'Osoba prywatna', biuro: 'Biuro nieruchomości', deweloper: 'Deweloper' };
// Promień wyszukiwania od miasta (km)
const RADIUS = [0, 5, 10, 15, 25, 50, 75];

const FEATURES = [
  ['balkon', 'Balkon'], ['taras', 'Taras'], ['ogrod', 'Ogród'], ['garaz', 'Garaż'],
  ['miejsce_postojowe', 'Miejsce postojowe'], ['winda', 'Winda'], ['piwnica', 'Piwnica / komórka'],
  ['klimatyzacja', 'Klimatyzacja'], ['umeblowane', 'Umeblowane'], ['zwierzeta', 'Zwierzęta akceptowane'],
  ['widok_na_morze', 'Widok na morze'], ['blisko_morza', 'Blisko morza'], ['blisko_lasu', 'Blisko lasu'],
  ['monitoring', 'Monitoring / ochrona'], ['teren_zamkniety', 'Teren zamknięty'], ['dwupoziomowe', 'Dwupoziomowe'],
  ['kominek', 'Kominek'], ['basen', 'Basen'], ['fotowoltaika', 'Fotowoltaika'], ['pompa_ciepla', 'Pompa ciepła'],
  ['dostep_dla_niepelnosprawnych', 'Dostęp dla osób z niepełnosprawnością'], ['media', 'Media w drodze / na działce'],
  ['oddzielna_kuchnia', 'Oddzielna kuchnia'], ['pom_uzytkowe', 'Pomieszczenie użytkowe'], ['ogrodek', 'Ogródek przy mieszkaniu'],
  ['domofon', 'Domofon / wideofon'], ['drzwi_antywlamaniowe', 'Drzwi antywłamaniowe'], ['rolety', 'Rolety antywłamaniowe'],
  ['alarm', 'System alarmowy'], ['smart_home', 'Inteligentny dom'], ['internet', 'Internet światłowodowy'], ['tv_kablowa', 'Telewizja kablowa'],
  ['zmywarka', 'Zmywarka'], ['pralka', 'Pralka'], ['lodowka', 'Lodówka'], ['kuchenka', 'Kuchenka'], ['piekarnik', 'Piekarnik'], ['telewizor', 'Telewizor'],
  ['dla_studentow', 'Dla studentów'], ['tylko_niepalacy', 'Tylko dla niepalących'], ['rowerownia', 'Rowerownia'], ['plac_zabaw', 'Plac zabaw w pobliżu'],
  ['sauna', 'Sauna'], ['jacuzzi', 'Jacuzzi'], ['klimatyzacja_pompa', 'Rekuperacja'], ['wjazd_dla_tir', 'Wjazd dla TIR'], ['rampa', 'Rampa załadunkowa']
];
// Grupy do formularza i strony ogłoszenia
const FEATURE_GROUPS = [
  ['Pomieszczenia i dodatki', ['balkon', 'taras', 'ogrod', 'ogrodek', 'piwnica', 'pom_uzytkowe', 'oddzielna_kuchnia', 'dwupoziomowe', 'garaz', 'miejsce_postojowe', 'winda', 'rowerownia']],
  ['Wyposażenie', ['umeblowane', 'zmywarka', 'pralka', 'lodowka', 'kuchenka', 'piekarnik', 'telewizor', 'klimatyzacja', 'kominek', 'internet', 'tv_kablowa']],
  ['Bezpieczeństwo', ['domofon', 'drzwi_antywlamaniowe', 'rolety', 'alarm', 'monitoring', 'teren_zamkniety', 'smart_home']],
  ['Energia i technika', ['fotowoltaika', 'pompa_ciepla', 'klimatyzacja_pompa', 'basen', 'sauna', 'jacuzzi', 'media', 'wjazd_dla_tir', 'rampa']],
  ['Okolica i zasady', ['widok_na_morze', 'blisko_morza', 'blisko_lasu', 'plac_zabaw', 'zwierzeta', 'dla_studentow', 'tylko_niepalacy', 'dostep_dla_niepelnosprawnych']]
];
const FEATURE_LABEL = Object.fromEntries(FEATURES);

const OPTIONS = {
  buildingType: ['Blok', 'Kamienica', 'Apartamentowiec', 'Dom wolnostojący', 'Bliźniak', 'Szeregowiec', 'Plomba', 'Loft', 'Inny'],
  condition: ['Do zamieszkania', 'Wysoki standard', 'Po remoncie', 'Do odświeżenia', 'Do wykończenia', 'Stan deweloperski', 'Stan surowy zamknięty', 'Stan surowy otwarty', 'Do remontu'],
  heating: ['Miejskie', 'Gazowe', 'Pompa ciepła', 'Elektryczne', 'Kominkowe', 'Olejowe', 'Węglowe', 'Biomasa', 'Brak', 'Inne'],
  buildingMaterial: ['Cegła', 'Pustak', 'Silikat', 'Beton komórkowy', 'Wielka płyta', 'Żelbet', 'Drewno', 'Szkielet drewniany', 'Inny'],
  windows: ['Plastikowe', 'Drewniane', 'Aluminiowe'],
  kitchen: ['Oddzielna', 'Aneks kuchenny', 'Ciemna', 'Brak'],
  parking: ['Brak', 'Na ulicy', 'Parking strzeżony', 'Miejsce w garażu podziemnym', 'Garaż', 'Miejsce na posesji'],
  energyClass: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'Brak świadectwa'],
  roof: ['Płaski', 'Skośny', 'Dwuspadowy', 'Kopertowy'],
  access: ['Asfaltowy', 'Utwardzony', 'Polny'],
  rentFor: ['Bez ograniczeń', 'Studenci', 'Rodzina', 'Para', 'Osoba pracująca'],
  ownership: ['Pełna własność', 'Spółdzielcze własnościowe', 'Udział', 'Użytkowanie wieczyste'],
  plotType: ['Budowlana', 'Rolna', 'Rekreacyjna', 'Inwestycyjna', 'Leśna', 'Siedliskowa']
};

const LISTING_STATUS = {
  draft: { label: 'Szkic', tone: 'muted' },
  active: { label: 'Aktywne', tone: 'good' },
  reserved: { label: 'Rezerwacja', tone: 'warn' },
  sold: { label: 'Sprzedane / wynajęte', tone: 'info' },
  archived: { label: 'Archiwum', tone: 'muted' },
  blocked: { label: 'Zablokowane', tone: 'bad' }
};

const LEAD_STATUS = {
  nowe: { label: 'Nowe', tone: 'info' },
  w_kontakcie: { label: 'W kontakcie', tone: 'warn' },
  prezentacja: { label: 'Prezentacja', tone: 'teal' },
  negocjacje: { label: 'Negocjacje', tone: 'orange' },
  sukces: { label: 'Transakcja', tone: 'good' },
  zamkniete: { label: 'Zamknięte', tone: 'muted' }
};

// Miejsca reklamowe – rozmiary zalecane dla grafik
const AD_PLACEMENTS = {
  home_billboard: { label: 'Strona główna – billboard', size: '1320 × 260 px' },
  home_tile: { label: 'Strona główna – kafel w ofertach', size: '600 × 800 px' },
  search_top: { label: 'Wyniki wyszukiwania – baner nad listą', size: '1200 × 180 px' },
  search_inline: { label: 'Wyniki wyszukiwania – kafel w liście', size: '600 × 800 px' },
  listing_sidebar: { label: 'Strona ogłoszenia – panel boczny', size: '400 × 500 px' },
  city_banner: { label: 'Strona miasta – baner', size: '1200 × 220 px' },
  top_banner: { label: 'Baner na górze (wszystkie strony)', size: '1280 × 120 px (mobile 640 × 160 px)' },
  guide_sidebar: { label: 'Poradnik – panel boczny', size: '400 × 500 px' }
};

module.exports = {
  TYPES,
  ALL_TYPE,
  TYPE_BY_KEY,
  TYPE_BY_SLUG,
  TRANSACTIONS,
  MARKETS,
  FEATURES,
  FEATURE_LABEL,
  FEATURE_GROUPS,
  ADVERTISER,
  RADIUS,
  OPTIONS,
  LISTING_STATUS,
  LEAD_STATUS,
  AD_PLACEMENTS
};
