// Opisy SEO dla najważniejszych lokalizacji. Pozostałe miasta dostają opis generowany z szablonu.
const INTRO = {
  trojmiasto:
    'Trójmiasto to aglomeracja Gdańska, Gdyni i Sopotu – największy rynek nieruchomości na Pomorzu. Znajdziesz tu zarówno apartamenty blisko plaży, jak i mieszkania w dzielnicach z dobrym dojazdem SKM, a także domy na obrzeżach i w gminach sąsiednich.',
  gdansk:
    'Gdańsk jest stolicą województwa pomorskiego i największym miastem regionu. Oferty obejmują kamienice Głównego Miasta i Wrzeszcza, nowe osiedla na południu miasta oraz mieszkania nad morzem w Brzeźnie, Przymorzu i Jelitkowie.',
  gdynia:
    'Gdynia łączy charakter miasta portowego z rozbudowanymi dzielnicami mieszkaniowymi. Szukający spokoju wybierają Orłowo i Redłowo, rodziny często Chwarzno-Wiczlino i Mały Kack, a osoby dojeżdżające do pracy – okolice stacji SKM.',
  sopot:
    'Sopot to nadmorskie uzdrowisko położone między Gdańskiem a Gdynią. Lokalny rynek to głównie mieszkania w kamienicach i apartamentowcach w Dolnym Sopocie oraz domy w spokojniejszych częściach Górnego Sopotu.',
  slupsk:
    'Słupsk jest największym miastem Pomorza Środkowego, około 20 km od Ustki i Bałtyku. W ofertach przeważają mieszkania w kamienicach śródmieścia i w blokach na osiedlach, a w gminach sąsiednich – domy i działki budowlane.',
  ustka:
    'Ustka to nadmorskie uzdrowisko u ujścia Słupi. Mieszkania i apartamenty kupowane są tu zarówno na własne potrzeby, jak i pod wynajem sezonowy, a w okolicy nie brakuje działek rekreacyjnych.',
  bytow:
    'Bytów to miasto na Kaszubach, znane z gotyckiego zamku. Lokalny rynek to głównie mieszkania w blokach, domy jednorodzinne i działki w otoczeniu lasów i jezior.',
  miastko:
    'Miastko leży w powiecie bytowskim, w otoczeniu lasów i jezior Pojezierza Bytowskiego. Ogłoszenia to przede wszystkim mieszkania w przystępnych cenach, domy i działki pod zabudowę.',
  chojnice:
    'Chojnice to ośrodek południowej części województwa pomorskiego, położony w pobliżu Borów Tucholskich. Popytem cieszą się mieszkania w mieście oraz domy i działki w okolicznych miejscowościach.',
  szczecin:
    'Szczecin jest stolicą województwa zachodniopomorskiego, położoną nad Odrą i jeziorem Dąbie. Oferty obejmują kamienice w Śródmieściu, domy na Pogodnie i Gumieńcach oraz nowe osiedla na Warszewie i Prawobrzeżu.',
  koszalin:
    'Koszalin to drugie co do wielkości miasto województwa zachodniopomorskiego, kilkanaście kilometrów od Mielna i morza. Rynek tworzą mieszkania w blokach i nowych inwestycjach oraz domy na obrzeżach miasta.',
  kolobrzeg:
    'Kołobrzeg to jedno z najpopularniejszych uzdrowisk nad Bałtykiem. Apartamenty w dzielnicy uzdrowiskowej kupowane są często pod wynajem, a mieszkania w pozostałych częściach miasta służą mieszkańcom przez cały rok.',
  swinoujscie:
    'Świnoujście to miasto położone na wyspach, z szeroką plażą i promenadą. Rynek to w dużej mierze apartamenty w dzielnicy nadmorskiej oraz mieszkania w centrum miasta.',
  stargard:
    'Stargard leży około 40 km od Szczecina i ma dobre połączenia z aglomeracją. W ofertach dominują mieszkania na osiedlach oraz domy i działki w gminach sąsiednich.',
  szczecinek:
    'Szczecinek leży nad jeziorem Trzesiecko, w otoczeniu lasów Pojezierza Szczecineckiego. Ogłoszenia to głównie mieszkania i domy w spokojnej okolicy.',
  mielno:
    'Mielno to popularna miejscowość wypoczynkowa położona między morzem a jeziorem Jamno. Apartamenty i domy wakacyjne są tu często kupowane z myślą o wynajmie w sezonie.',
  miedzyzdroje:
    'Międzyzdroje to nadmorski kurort na wyspie Wolin, sąsiadujący z Wolińskim Parkiem Narodowym. Rynek to przede wszystkim apartamenty wakacyjne i mieszkania blisko promenady.',
  leba:
    'Łeba to nadmorska miejscowość w pobliżu Słowińskiego Parku Narodowego i ruchomych wydm. Popularne są tu apartamenty i domy pod wynajem turystyczny.',
  darlowo:
    'Darłowo wraz z nadmorskim Darłówkiem tworzy miejscowość łączącą stałe osiedla mieszkaniowe z zabudową wypoczynkową nad Bałtykiem.',
  wejherowo:
    'Wejherowo leży na zachód od Trójmiasta, w zasięgu SKM. Mieszkania i domy są tu tańsze niż w Gdyni, co przyciąga osoby dojeżdżające do pracy w aglomeracji.',
  rumia:
    'Rumia graniczy z Gdynią i ma bezpośrednie połączenie SKM z Trójmiastem. Na rynku przeważają nowe osiedla mieszkaniowe i domy w zabudowie szeregowej.',
  tczew:
    'Tczew położony jest nad Wisłą, na południe od Gdańska, i stanowi ważny węzeł kolejowy. Oferty obejmują mieszkania w mieście oraz domy na obrzeżach.',
  lebork:
    'Lębork leży nad Łebą, w połowie drogi między Słupskiem a Trójmiastem. Ogłoszenia to głównie mieszkania w blokach i kamienicach oraz domy jednorodzinne.',
  kwidzyn: 'Kwidzyn to miasto we wschodniej części województwa pomorskiego, z zespołem zamkowo-katedralnym. Rynek obejmuje mieszkania w blokach i nowe domy na obrzeżach.',
  malbork: 'Malbork, znany z zamku krzyżackiego nad Nogatem, oferuje mieszkania w przystępnych cenach i dobre połączenie kolejowe z Gdańskiem.'
};

const COASTAL_NOTE =
  'W miejscowościach nadmorskich zwróć uwagę na status lokalu (mieszkalny czy usługowy), regulamin wynajmu krótkoterminowego we wspólnocie oraz koszty utrzymania poza sezonem.';

function introFor(loc) {
  if (!loc) return '';
  if (INTRO[loc.slug]) return INTRO[loc.slug];
  const woj = loc.voivodeship === 'pomorskie' ? 'województwie pomorskim' : 'województwie zachodniopomorskim';
  if (loc.kind === 'voivodeship') return '';
  return `${loc.name} to miejscowość w ${woj}. Przeglądaj aktualne ogłoszenia mieszkań, domów, działek i lokali w ${loc.loc} – od właścicieli, biur nieruchomości i deweloperów. Zapisz wyszukiwanie, a powiadomimy Cię o nowych ofertach.`;
}

module.exports = { INTRO, introFor, COASTAL_NOTE };
