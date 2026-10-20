// Poradnik – artykuły evergreen z lokalnym kontekstem (Pomorze i Pomorze Zachodnie).
// Treść w HTML. Przed publikacją warto, by przejrzał ją ekspert lub prawnik.
module.exports = [
  {
    slug: 'jak-sprawdzic-ksiege-wieczysta',
    title: 'Jak sprawdzić księgę wieczystą przed zakupem mieszkania',
    category: 'Kupujący',
    date: '2026-09-01',
    readMin: 8,
    scene: ['block', 'day', 301],
    excerpt: 'Numer księgi znajdziesz w akcie notarialnym lub zapytasz o niego sprzedającego. Podpowiadamy, co sprawdzić w każdym z czterech działów.',
    body: `
<p>Księga wieczysta to publiczny rejestr, z którego dowiesz się, kto jest właścicielem nieruchomości i jakie obciążenia na niej ciążą. Możesz ją bezpłatnie przejrzeć w przeglądarce ksiąg wieczystych Ministerstwa Sprawiedliwości (ekw.ms.gov.pl), znając jej numer.</p>
<h2>Skąd wziąć numer księgi</h2>
<p>Poproś o niego sprzedającego lub biuro nieruchomości. Numer ma format <strong>XXXX/00000000/0</strong>, gdzie pierwszy człon to kod wydziału sądu – na przykład GD1G dla Gdańska, SL1S dla Słupska czy SZ1S dla Szczecina.</p>
<h2>Co sprawdzić w poszczególnych działach</h2>
<ul>
<li><strong>Dział I-O</strong> – oznaczenie nieruchomości: adres, powierzchnia, liczba izb. Porównaj z ogłoszeniem.</li>
<li><strong>Dział I-Sp</strong> – prawa związane z własnością, np. udział w nieruchomości wspólnej.</li>
<li><strong>Dział II</strong> – właściciel lub użytkownik wieczysty. Upewnij się, że to osoba, która podpisze umowę.</li>
<li><strong>Dział III</strong> – ograniczone prawa rzeczowe, roszczenia i ostrzeżenia: służebności, prawo pierwokupu, wzmianki o egzekucji.</li>
<li><strong>Dział IV</strong> – hipoteki. Kredyt sprzedającego nie przekreśla zakupu, ale umowa musi określać, jak zostanie spłacony.</li>
</ul>
<h2>Wzmianki – na co uważać</h2>
<p>Wzmianka oznacza, że do sądu wpłynął wniosek, którego jeszcze nie rozpatrzono. Może dotyczyć sprzedaży, hipoteki albo zajęcia komorniczego. Zanim wpłacisz zadatek, dowiedz się, czego dotyczy.</p>
<h2>Gdy księga nie istnieje</h2>
<p>Część mieszkań spółdzielczych nie ma założonej księgi. Wtedy poproś o zaświadczenie ze spółdzielni o przysługującym prawie i braku zaległości w opłatach.</p>`
  },
  {
    slug: 'koszty-zakupu-mieszkania-rynek-wtorny',
    title: 'Koszty zakupu mieszkania z rynku wtórnego: PCC, notariusz, opłaty sądowe',
    category: 'Koszty',
    date: '2026-08-18',
    readMin: 6,
    scene: ['house', 'dawn', 302],
    excerpt: 'Do ceny mieszkania doliczysz podatek od czynności cywilnoprawnych, taksę notarialną, opłaty sądowe i ewentualną prowizję pośrednika.',
    body: `
<p>Planując budżet, uwzględnij koszty transakcyjne. Przy zakupie z rynku wtórnego zwykle wynoszą one kilka procent ceny.</p>
<h2>Podatek od czynności cywilnoprawnych (PCC)</h2>
<p>Kupujący płaci <strong>2% wartości rynkowej</strong> nieruchomości. Podatek pobiera i odprowadza notariusz w dniu podpisania aktu. Przepisy przewidują zwolnienie z PCC przy zakupie pierwszego mieszkania lub domu – sprawdź aktualne warunki u notariusza.</p>
<h2>Taksa notarialna</h2>
<p>Maksymalne stawki określa rozporządzenie i zależą one od wartości nieruchomości. Do taksy doliczany jest VAT oraz koszt wypisów aktu.</p>
<h2>Opłaty sądowe</h2>
<p>Za wpis prawa własności i wpis hipoteki do księgi wieczystej pobierane są stałe opłaty sądowe. Jeśli księga nie istnieje, dochodzi opłata za jej założenie.</p>
<h2>Pozostałe koszty</h2>
<ul>
<li>prowizja biura nieruchomości (jeśli kupujesz przez pośrednika – sprawdź umowę),</li>
<li>koszty kredytu: wycena, ubezpieczenia, ewentualna prowizja banku,</li>
<li>przeprowadzka i drobny remont.</li>
</ul>
<p>Oferty oznaczone etykietą <strong>Bez prowizji</strong> pozwalają zaoszczędzić na wynagrodzeniu pośrednika – filtr znajdziesz w wyszukiwarce.</p>`
  },
  {
    slug: 'najem-okazjonalny-krok-po-kroku',
    title: 'Najem okazjonalny krok po kroku – bezpieczna umowa dla właściciela',
    category: 'Wynajmujący',
    date: '2026-07-30',
    readMin: 7,
    scene: ['block', 'teal', 303],
    excerpt: 'Najem okazjonalny ułatwia odzyskanie lokalu, gdy najemca nie płaci. Wymaga jednak kilku formalności, o których łatwo zapomnieć.',
    body: `
<p>Najem okazjonalny to forma umowy dostępna dla osób fizycznych, które nie prowadzą działalności w zakresie wynajmu lokali. Jej największą zaletą jest uproszczona procedura opróżnienia lokalu.</p>
<h2>Wymagane załączniki</h2>
<ul>
<li>oświadczenie najemcy w formie aktu notarialnego o poddaniu się egzekucji i zobowiązaniu do opróżnienia lokalu,</li>
<li>wskazanie przez najemcę innego lokalu, w którym będzie mógł zamieszkać,</li>
<li>oświadczenie właściciela tego lokalu o zgodzie na zamieszkanie najemcy.</li>
</ul>
<h2>Zgłoszenie do urzędu skarbowego</h2>
<p>Właściciel ma <strong>14 dni od rozpoczęcia najmu</strong> na zgłoszenie umowy we właściwym urzędzie skarbowym. Bez tego zgłoszenia umowa nie korzysta z ochrony najmu okazjonalnego.</p>
<h2>Kaucja i protokół</h2>
<p>Ustal kaucję i sporządź protokół zdawczo-odbiorczy ze zdjęciami oraz stanem liczników. To podstawa rozliczenia przy zakończeniu najmu.</p>`
  },
  {
    slug: 'dzialka-budowlana-mpzp-warunki-zabudowy',
    title: 'Działka budowlana: MPZP, warunki zabudowy i media',
    category: 'Działki',
    date: '2026-07-12',
    readMin: 7,
    scene: ['plot', 'day', 304],
    excerpt: 'Zanim kupisz działkę pod dom na Kaszubach czy pod Koszalinem, sprawdź plan miejscowy, dostęp do drogi i możliwość podłączenia mediów.',
    body: `
<p>To, czy postawisz na działce dom, zależy od przeznaczenia terenu, a nie od nazwy w ogłoszeniu. Sprawdź dokumenty przed podpisaniem umowy przedwstępnej.</p>
<h2>Miejscowy plan zagospodarowania przestrzennego</h2>
<p>Jeśli dla terenu obowiązuje MPZP, znajdziesz w nim przeznaczenie działki, maksymalną wysokość zabudowy, wymagany udział powierzchni biologicznie czynnej i linie zabudowy. Wypis i wyrys z planu wydaje urząd gminy.</p>
<h2>Decyzja o warunkach zabudowy</h2>
<p>Gdy planu nie ma, podstawą jest decyzja o warunkach zabudowy (WZ). Możesz o nią wystąpić, nie będąc właścicielem działki – to dobry sposób, by sprawdzić możliwości przed zakupem.</p>
<h2>Dostęp do drogi i media</h2>
<ul>
<li>działka musi mieć dostęp do drogi publicznej – bezpośrednio lub przez służebność,</li>
<li>zapytaj gestorów sieci o warunki przyłączenia prądu, wody i kanalizacji,</li>
<li>na terenach bez kanalizacji sprawdź możliwość budowy szamba lub przydomowej oczyszczalni.</li>
</ul>
<h2>Teren rolny</h2>
<p>Zakup gruntu rolnego podlega dodatkowym ograniczeniom wynikającym z przepisów o kształtowaniu ustroju rolnego. Skonsultuj transakcję z notariuszem.</p>`
  },
  {
    slug: 'apartament-nad-morzem-pod-wynajem',
    title: 'Apartament nad morzem pod wynajem – o czym pamiętać przed zakupem',
    category: 'Inwestycje',
    date: '2026-06-20',
    readMin: 6,
    scene: ['sea', 'dawn', 305],
    excerpt: 'Ustka, Łeba, Kołobrzeg, Mielno czy Międzyzdroje – zanim kupisz apartament na wynajem krótkoterminowy, sprawdź status lokalu i zasady wspólnoty.',
    body: `
<p>Nadmorskie apartamenty na Pomorzu i Pomorzu Zachodnim przyciągają inwestorów, ale opłacalność zależy od wielu szczegółów.</p>
<h2>Lokal mieszkalny czy usługowy</h2>
<p>Część inwestycji w kurortach powstaje jako lokale usługowe (aparthotele). Wiąże się to z inną stawką VAT, wyższym podatkiem od nieruchomości i często z obowiązkiem współpracy z operatorem.</p>
<h2>Zasady we wspólnocie</h2>
<p>Zapytaj o regulamin budynku i uchwały wspólnoty dotyczące najmu krótkoterminowego, recepcji, parkingu i opłat za części wspólne.</p>
<h2>Sezonowość</h2>
<p>Policz przychód realnie: wysokie obłożenie latem i znacznie niższe poza sezonem. Uwzględnij sprzątanie, prowizje platform rezerwacyjnych, media i podatek od przychodu z najmu.</p>
<h2>Lokalizacja</h2>
<p>Odległość od plaży, widok na morze, parking i dostęp do komunikacji to czynniki, które najmocniej wpływają na cenę za noc.</p>`
  },
  {
    slug: 'jak-przygotowac-mieszkanie-do-sprzedazy',
    title: 'Jak przygotować mieszkanie do sprzedaży i dobrze je opisać',
    category: 'Sprzedający',
    date: '2026-06-02',
    readMin: 5,
    scene: ['block', 'dawn', 306],
    excerpt: 'Dobre zdjęcia, rzetelny opis i komplet dokumentów skracają czas sprzedaży. Lista rzeczy do zrobienia przed publikacją ogłoszenia.',
    body: `
<p>Kupujący porównują dziesiątki ofert w kilka minut. Twoje ogłoszenie musi od razu odpowiedzieć na najważniejsze pytania.</p>
<h2>Zdjęcia</h2>
<ul>
<li>rób zdjęcia w dzień, przy zapalonym świetle i odsłoniętych oknach,</li>
<li>usuń drobiazgi z blatów i podłogi,</li>
<li>pierwsze zdjęcie powinno pokazywać najładniejsze pomieszczenie lub widok.</li>
</ul>
<h2>Opis</h2>
<p>Podaj metraż, piętro, rok budowy, wysokość czynszu, sposób ogrzewania i stan prawny. Napisz, co jest w okolicy: szkoła, przystanek, sklep, park, odległość od morza.</p>
<h2>Dokumenty</h2>
<p>Przygotuj numer księgi wieczystej, zaświadczenie o braku zaległości w opłatach i – jeśli jest wymagane – świadectwo charakterystyki energetycznej.</p>
<h2>Cena</h2>
<p>Sprawdź ceny podobnych mieszkań w raporcie cen ModulioEstate dla swojego miasta. Zbyt wysoka cena na starcie wydłuża sprzedaż.</p>`
  }
];
