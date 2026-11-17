// Zasięg serwisu: województwo pomorskie i zachodniopomorskie.
// [nazwa, miejscownik ("w ..."), województwo p/z, ważne dla SEO (1/0), nad morzem (1/0), lat, lng]
const { slugify } = require('../utils/slug');

const VOIVODESHIPS = {
  pomorskie: {
    slug: 'pomorskie',
    name: 'Pomorskie',
    full: 'województwo pomorskie',
    loc: 'województwie pomorskim',
    capital: 'gdansk',
    center: [54.25, 18.0]
  },
  zachodniopomorskie: {
    slug: 'zachodniopomorskie',
    name: 'Zachodniopomorskie',
    full: 'województwo zachodniopomorskie',
    loc: 'województwie zachodniopomorskim',
    capital: 'szczecin',
    center: [53.65, 15.5]
  }
};

const RAW = [
  // ——— pomorskie ———
  ['Gdańsk', 'Gdańsku', 'p', 1, 1, 54.352, 18.646],
  ['Gdynia', 'Gdyni', 'p', 1, 1, 54.518, 18.531],
  ['Sopot', 'Sopocie', 'p', 1, 1, 54.441, 18.56],
  ['Słupsk', 'Słupsku', 'p', 1, 0, 54.464, 17.028],
  ['Ustka', 'Ustce', 'p', 1, 1, 54.58, 16.862],
  ['Bytów', 'Bytowie', 'p', 1, 0, 54.17, 17.492],
  ['Miastko', 'Miastku', 'p', 1, 0, 54.003, 16.983],
  ['Chojnice', 'Chojnicach', 'p', 1, 0, 53.697, 17.557],
  ['Lębork', 'Lęborku', 'p', 1, 0, 54.54, 17.75],
  ['Wejherowo', 'Wejherowie', 'p', 1, 0, 54.606, 18.235],
  ['Rumia', 'Rumi', 'p', 1, 0, 54.571, 18.388],
  ['Reda', 'Redzie', 'p', 0, 0, 54.605, 18.348],
  ['Tczew', 'Tczewie', 'p', 1, 0, 54.092, 18.778],
  ['Starogard Gdański', 'Starogardzie Gdańskim', 'p', 1, 0, 53.966, 18.531],
  ['Malbork', 'Malborku', 'p', 1, 0, 54.036, 19.038],
  ['Kwidzyn', 'Kwidzynie', 'p', 1, 0, 53.731, 18.931],
  ['Pruszcz Gdański', 'Pruszczu Gdańskim', 'p', 1, 0, 54.262, 18.636],
  ['Kartuzy', 'Kartuzach', 'p', 0, 0, 54.334, 18.197],
  ['Kościerzyna', 'Kościerzynie', 'p', 0, 0, 54.122, 17.981],
  ['Człuchów', 'Człuchowie', 'p', 0, 0, 53.664, 17.358],
  ['Puck', 'Pucku', 'p', 0, 1, 54.718, 18.408],
  ['Władysławowo', 'Władysławowie', 'p', 1, 1, 54.791, 18.402],
  ['Łeba', 'Łebie', 'p', 1, 1, 54.76, 17.556],
  ['Hel', 'Helu', 'p', 0, 1, 54.608, 18.8],
  ['Jastarnia', 'Jastarni', 'p', 0, 1, 54.696, 18.676],
  ['Krynica Morska', 'Krynicy Morskiej', 'p', 0, 1, 54.38, 19.444],
  ['Jastrzębia Góra', 'Jastrzębiej Górze', 'p', 0, 1, 54.83, 18.304],
  ['Rowy', 'Rowach', 'p', 0, 1, 54.665, 17.052],
  ['Dębki', 'Dębkach', 'p', 0, 1, 54.829, 18.089],
  ['Kobylnica', 'Kobylnicy', 'p', 0, 0, 54.44, 16.997],
  ['Żukowo', 'Żukowie', 'p', 0, 0, 54.342, 18.364],
  ['Czersk', 'Czersku', 'p', 0, 0, 53.796, 17.977],
  ['Brusy', 'Brusach', 'p', 0, 0, 53.886, 17.719],
  ['Czarna Woda', 'Czarnej Wodzie', 'p', 0, 0, 53.844, 18.098],
  ['Czarne', 'Czarnem', 'p', 0, 0, 53.684, 16.942],
  ['Debrzno', 'Debrznie', 'p', 0, 0, 53.539, 17.234],
  ['Dzierzgoń', 'Dzierzgoniu', 'p', 0, 0, 53.924, 19.348],
  ['Gniew', 'Gniewie', 'p', 0, 0, 53.834, 18.825],
  ['Kępice', 'Kępicach', 'p', 0, 0, 54.243, 16.89],
  ['Nowy Dwór Gdański', 'Nowym Dworze Gdańskim', 'p', 0, 0, 54.215, 19.115],
  ['Nowy Staw', 'Nowym Stawie', 'p', 0, 0, 54.134, 19.009],
  ['Pelplin', 'Pelplinie', 'p', 0, 0, 53.928, 18.698],
  ['Prabuty', 'Prabutach', 'p', 0, 0, 53.756, 19.204],
  ['Skarszewy', 'Skarszewach', 'p', 0, 0, 54.072, 18.446],
  ['Skórcz', 'Skórczu', 'p', 0, 0, 53.795, 18.524],
  ['Sztum', 'Sztumie', 'p', 0, 0, 53.92, 19.031],
  // ——— zachodniopomorskie ———
  ['Szczecin', 'Szczecinie', 'z', 1, 0, 53.428, 14.553],
  ['Koszalin', 'Koszalinie', 'z', 1, 0, 54.194, 16.172],
  ['Kołobrzeg', 'Kołobrzegu', 'z', 1, 1, 54.176, 15.583],
  ['Świnoujście', 'Świnoujściu', 'z', 1, 1, 53.91, 14.247],
  ['Stargard', 'Stargardzie', 'z', 1, 0, 53.336, 15.05],
  ['Szczecinek', 'Szczecinku', 'z', 1, 0, 53.708, 16.699],
  ['Police', 'Policach', 'z', 1, 0, 53.552, 14.571],
  ['Białogard', 'Białogardzie', 'z', 1, 0, 54.007, 15.988],
  ['Wałcz', 'Wałczu', 'z', 1, 0, 53.272, 16.471],
  ['Darłowo', 'Darłowie', 'z', 1, 1, 54.421, 16.41],
  ['Międzyzdroje', 'Międzyzdrojach', 'z', 1, 1, 53.928, 14.45],
  ['Mielno', 'Mielnie', 'z', 1, 1, 54.26, 16.059],
  ['Goleniów', 'Goleniowie', 'z', 0, 0, 53.564, 14.828],
  ['Gryfino', 'Gryfinie', 'z', 0, 0, 53.252, 14.488],
  ['Kamień Pomorski', 'Kamieniu Pomorskim', 'z', 0, 0, 53.969, 14.773],
  ['Sianów', 'Sianowie', 'z', 0, 0, 54.223, 16.29],
  ['Świdwin', 'Świdwinie', 'z', 0, 0, 53.775, 15.776],
  ['Gryfice', 'Gryficach', 'z', 0, 0, 53.916, 15.2],
  ['Nowogard', 'Nowogardzie', 'z', 0, 0, 53.674, 15.116],
  ['Choszczno', 'Choszcznie', 'z', 0, 0, 53.168, 15.418],
  ['Pyrzyce', 'Pyrzycach', 'z', 0, 0, 53.146, 14.893],
  ['Myślibórz', 'Myśliborzu', 'z', 0, 0, 52.924, 14.866],
  ['Drawsko Pomorskie', 'Drawsku Pomorskim', 'z', 0, 0, 53.533, 15.808],
  ['Łobez', 'Łobzie', 'z', 0, 0, 53.639, 15.622],
  ['Dziwnów', 'Dziwnowie', 'z', 0, 1, 54.028, 14.76],
  ['Ustronie Morskie', 'Ustroniu Morskim', 'z', 0, 1, 54.213, 15.755],
  ['Rewal', 'Rewalu', 'z', 0, 1, 54.082, 15.014],
  ['Pobierowo', 'Pobierowie', 'z', 0, 1, 54.057, 14.933],
  ['Dźwirzyno', 'Dźwirzynie', 'z', 0, 1, 54.157, 15.403],
  ['Sarbinowo', 'Sarbinowie', 'z', 0, 1, 54.247, 15.956],
  ['Złocieniec', 'Złocieńcu', 'z', 0, 0, 53.531, 16.011],
  ['Czaplinek', 'Czaplinku', 'z', 0, 0, 53.561, 16.232],
  ['Połczyn-Zdrój', 'Połczynie-Zdroju', 'z', 0, 0, 53.765, 16.095],
  ['Barlinek', 'Barlinku', 'z', 0, 0, 52.992, 15.217],
  ['Dębno', 'Dębnie', 'z', 0, 0, 52.74, 14.701],
  ['Trzebiatów', 'Trzebiatowie', 'z', 0, 0, 54.063, 15.266],
  ['Wolin', 'Wolinie', 'z', 0, 0, 53.844, 14.616],
  ['Karlino', 'Karlinie', 'z', 0, 0, 54.041, 15.879],
  ['Bobolice', 'Bobolicach', 'z', 0, 0, 53.955, 16.588],
  ['Polanów', 'Polanowie', 'z', 0, 0, 54.119, 16.687],
  ['Borne Sulinowo', 'Bornem Sulinowie', 'z', 0, 0, 53.581, 16.538],
  ['Barwice', 'Barwicach', 'z', 0, 0, 53.745, 16.355],
  ['Biały Bór', 'Białym Borze', 'z', 0, 0, 53.899, 16.838],
  ['Cedynia', 'Cedyni', 'z', 0, 0, 52.878, 14.203],
  ['Chojna', 'Chojnie', 'z', 0, 0, 52.963, 14.431],
  ['Dobra', 'Dobrej', 'z', 0, 0, 53.585, 15.307],
  ['Dobrzany', 'Dobrzanach', 'z', 0, 0, 53.358, 15.43],
  ['Drawno', 'Drawnie', 'z', 0, 0, 53.219, 15.758],
  ['Golczewo', 'Golczewie', 'z', 0, 0, 53.824, 14.977],
  ['Gościno', 'Gościnie', 'z', 0, 0, 54.052, 15.653],
  ['Ińsko', 'Ińsku', 'z', 0, 0, 53.436, 15.548],
  ['Kalisz Pomorski', 'Kaliszu Pomorskim', 'z', 0, 0, 53.298, 15.906],
  ['Lipiany', 'Lipianach', 'z', 0, 0, 53.003, 14.971],
  ['Maszewo', 'Maszewie', 'z', 0, 0, 53.496, 15.061],
  ['Mieszkowice', 'Mieszkowicach', 'z', 0, 0, 52.785, 14.495],
  ['Mirosławiec', 'Mirosławcu', 'z', 0, 0, 53.342, 16.088],
  ['Moryń', 'Moryniu', 'z', 0, 0, 52.856, 14.397],
  ['Nowe Warpno', 'Nowym Warpnie', 'z', 0, 0, 53.725, 14.281],
  ['Pełczyce', 'Pełczycach', 'z', 0, 0, 53.042, 15.306],
  ['Płoty', 'Płotach', 'z', 0, 0, 53.804, 15.268],
  ['Recz', 'Reczu', 'z', 0, 0, 53.26, 15.547],
  ['Resko', 'Resku', 'z', 0, 0, 53.773, 15.406],
  ['Suchań', 'Suchaniu', 'z', 0, 0, 53.28, 15.319],
  ['Trzcińsko-Zdrój', 'Trzcińsku-Zdroju', 'z', 0, 0, 52.966, 14.608],
  ['Tuczno', 'Tucznie', 'z', 0, 0, 53.194, 16.155],
  ['Tychowo', 'Tychowie', 'z', 0, 0, 53.929, 16.257],
  ['Węgorzyno', 'Węgorzynie', 'z', 0, 0, 53.541, 15.56]
];

// Dzielnice / osiedla – podpowiedzi w formularzu i linki na stronach miast.
const DISTRICTS = {
  gdansk: ['Śródmieście', 'Wrzeszcz', 'Oliwa', 'Przymorze', 'Zaspa', 'Jasień', 'Chełm', 'Orunia', 'Brzeźno', 'Letnica', 'Piecki-Migowo', 'Ujeścisko', 'Osowa', 'Stogi'],
  gdynia: ['Śródmieście', 'Orłowo', 'Redłowo', 'Mały Kack', 'Wielki Kack', 'Karwiny', 'Witomino', 'Chwarzno-Wiczlino', 'Dąbrowa', 'Obłuże', 'Oksywie', 'Chylonia', 'Grabówek'],
  sopot: ['Dolny Sopot', 'Górny Sopot', 'Kamienny Potok', 'Karlikowo', 'Brodwino'],
  szczecin: ['Śródmieście', 'Pogodno', 'Niebuszewo', 'Gumieńce', 'Pomorzany', 'Warszewo', 'Dąbie', 'Bukowo', 'Turzyn', 'Zdroje', 'Prawobrzeże', 'Książąt Pomorskich'],
  slupsk: ['Śródmieście', 'Stare Miasto', 'Zatorze', 'Nadrzecze', 'Westerplatte', 'Niepodległości', 'Ryczewo'],
  koszalin: ['Śródmieście', 'Rokosowo', 'Lubiatowo', 'Jedliny', 'Nowobramskie', 'Na Skarpie', 'Tysiąclecia']
};

const CITIES = RAW.map(([name, loc, v, major, coastal, lat, lng]) => {
  const slug = slugify(name);
  return {
    name,
    slug,
    loc,
    voivodeship: v === 'p' ? 'pomorskie' : 'zachodniopomorskie',
    major: !!major,
    coastal: !!coastal,
    lat: lat || null,
    lng: lng || null,
    districts: DISTRICTS[slug] || []
  };
});

const BY_SLUG = Object.fromEntries(CITIES.map((c) => [c.slug, c]));

// Obszary wirtualne (kilka miast pod jednym adresem)
const AREAS = {
  trojmiasto: {
    slug: 'trojmiasto',
    name: 'Trójmiasto',
    loc: 'Trójmieście',
    voivodeship: 'pomorskie',
    cities: ['gdansk', 'gdynia', 'sopot'],
    lat: 54.44,
    lng: 18.57,
    area: true
  }
};

function getCity(slug) {
  return BY_SLUG[slug] || null;
}

// Rozpoznaje slug lokalizacji: miasto, obszar (Trójmiasto) lub województwo.
function resolveLocation(slug) {
  if (!slug) return null;
  if (BY_SLUG[slug]) return { kind: 'city', ...BY_SLUG[slug] };
  if (AREAS[slug]) return { kind: 'area', ...AREAS[slug] };
  if (VOIVODESHIPS[slug]) return { kind: 'voivodeship', ...VOIVODESHIPS[slug], loc: VOIVODESHIPS[slug].loc };
  return null;
}

function inLocation(loc) {
  if (!loc) return 'na Pomorzu i Pomorzu Zachodnim';
  return 'w ' + loc.loc;
}

function distanceKm(a, b) {
  if (!a.lat || !b.lat) return Infinity;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearbyCities(slug, count = 6) {
  const c = BY_SLUG[slug] || AREAS[slug];
  if (!c || !c.lat) return CITIES.filter((x) => x.major && x.slug !== slug && x.voivodeship === (c && c.voivodeship)).slice(0, count);
  return CITIES.filter((x) => x.slug !== slug && x.lat && !(c.cities || []).includes(x.slug))
    .map((x) => ({ ...x, km: Math.round(distanceKm(c, x)) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

const MAJOR = CITIES.filter((c) => c.major);
const COASTAL = CITIES.filter((c) => c.coastal);

module.exports = {
  VOIVODESHIPS,
  CITIES,
  MAJOR,
  COASTAL,
  AREAS,
  DISTRICTS,
  getCity,
  resolveLocation,
  inLocation,
  nearbyCities,
  distanceKm
};
