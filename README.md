# NieruchomosciPomorza.pl

Portal ogłoszeń nieruchomości **całego polskiego wybrzeża i okolic** – województwo pomorskie i zachodniopomorskie: od Świnoujścia po Krynicę Morską, z Trójmiastem, Słupskiem, Koszalinem, Szczecinem i 100+ innymi miejscowościami. Zbudowany na silniku Modulio Estate.

**Stack:** Node.js 18+ · Express · EJS (renderowanie po stronie serwera – najlepsze dla SEO) · MongoDB (Mongoose) · Passport (e-mail + hasło, Google) · Tailwind CSS (budowany przy wdrożeniu, gotowy też w `public/css/app.css`).

## Marka i styl

- Nazwa i domena: **NieruchomosciPomorza.pl** (`src/config/site.js`, dane kontaktowe i firmy także w panelu: *Ustawienia serwisu*).
- Logo: znak „dach + fale” – `public/img/logo-mark.svg` (wektor), `logo-mark.png`, `logo.png` (z napisem), `favicon-64.png`, `apple-touch-icon.png`, obraz udostępniania `og-default.jpg` (1200 × 630).
- Kolory: kremowe tło `#f7f6f2`, ciemna zieleń `#17221d`, koral `#ff7b1c`, szałwia `#4f7560`; fonty Manrope + DM Sans z akcentem Georgia italic. Tokeny w `tailwind.config.js`, komponenty w `src/styles/input.css`.

## Panel administratora – dostęp kodem ADMIN_PIN

- Adres: `/admin` → strona `/admin/logowanie`, na której wpisujesz kod ze zmiennej **`ADMIN_PIN`** (Railway → Variables). Konto użytkownika nie jest potrzebne.
- Kod sprawdzany jest w stałym czasie (SHA-256 + `timingSafeEqual`), maks. 10 prób na 15 minut z jednego adresu IP.
- Sesja administratora wygasa po `ADMIN_SESSION_HOURS` (domyślnie 12 h) albo po kliknięciu **Zamknij panel**.
- Bez `ADMIN_PIN` (lub gdy ma mniej niż 4 znaki) panel jest wyłączony i pokazuje komunikat, co ustawić.
- Zmiana kodu: zmień `ADMIN_PIN` w Railway – usługa uruchomi się ponownie, a wszystkie wcześniejsze wejścia do panelu od razu tracą ważność.

## Co jest w środku

| Część | Adres | Opis |
|---|---|---|
| Strona publiczna | `/` | hero z wyszukiwarką, kategorie, oferty, miasta, wybrzeże, poradnik, FAQ, reklamy |
| Wyszukiwarka SEO | `/sprzedaz/mieszkania/slupsk` | transakcja / typ / lokalizacja w adresie, filtry, sortowanie, wyróżnione, paginacja |
| Ogłoszenie | `/oferta/tytul-10234` | galeria, parametry, mapa, kalkulator raty, zapytanie, zgłoszenie (DSA), podobne |
| Miasta | `/miasta`, `/miasto/gdansk`, `/miasto/trojmiasto`, `/wojewodztwo/pomorskie` | statystyki, ceny m², trend, dzielnice, okolica, biura |
| Biura | `/biura`, `/biuro/nazwa` | katalog; strona biura (mikrostrona) dla biur z tą opcją w planie |
| Narzędzia | `/raport-cen`, `/kalkulator-kredytowy`, `/poradnik` | |
| Formularze | `/zostan-partnerem`, `/reklama`, `/kontakt` | trafiają do panelu admina i na e-mail |
| Prawne | `/regulamin`, `/polityka-prywatnosci`, `/cookies`, `/pomoc`, `/mapa-strony` | szablony – uzupełnij dane firmy |
| Konto | `/logowanie`, `/rejestracja`, `/zapomnialem-hasla` | e-mail + hasło lub Google |
| Moje konto (klient) | `/panel` | 4 zakładki: Moje ogłoszenia, Obserwowane (ogłoszenia + zapisane wyszukiwania z powiadomieniami), Wiadomości, Ustawienia konta (w tym eksport i usunięcie danych – RODO) |
| Panel biura | `/biuro-panel` | ogłoszenia, CRM zapytań, zespół i role, profil, strona biura, statystyki, limity planu |
| Administracja | `/admin` | zgłoszenia partnerów, biura i indywidualne plany, reklamy, moderacja, naruszenia, użytkownicy |

Pełna lista funkcji dla biur (zrobione i planowane): [`docs/FUNKCJE-BIUR.md`](docs/FUNKCJE-BIUR.md).

## Mapa, promień i pinezki

- **Wybór miasta na mapie** – przycisk „Mapa” przy wyszukiwarce otwiera mapę regionu; klikasz miejscowość, ustawiasz promień (+5…+75 km) i rodzaj nieruchomości.
- **Wyszukiwanie w promieniu** – parametr `?promien=25` przy adresie miasta (np. `/sprzedaz/mieszkania/slupsk?promien=25`); działa na indeksie geo w MongoDB.
- **Widok mapy wyników** – przełącznik Lista/Mapa nad wynikami; pinezki z cenami, podgląd oferty po kliknięciu.
- **Pinezka adresu** – w formularzu ogłoszenia: „Znajdź na mapie” (geokodowanie adresu) albo kliknięcie na mapie. Pod ogłoszeniem mapa z pinezką i link „Wyznacz trasę”. Ogłoszeniodawca może pokazać tylko okolicę.
- Mapa jest własna (`public/js/map.js`, bez zewnętrznych bibliotek) i korzysta z kafelków OpenStreetMap. Przy dużym ruchu ustaw `MAP_TILES_URL` z kluczem dostawcy (np. MapTiler) – zasady OSM nie pozwalają na intensywne użycie ich serwerów.

## Model współpracy z biurami

Nie ma publicznych pakietów ani cennika. Biuro wypełnia formularz **Zostań partnerem** → zgłoszenie trafia do `/admin/zgloszenia` → administrator klika **Utwórz biuro z tego zgłoszenia**, ustawia indywidualny plan (limit ogłoszeń, konta, wyróżnienia, podbicia, strona biura, import XML, data ważności) i podaje e-mail właściciela. Właściciel loguje się (Google lub reset hasła) i zaprasza zespół z panelu.

## Reklamy (panel admina → Kampanie reklamowe)

**13 miejsc reklamowych** w 5 grupach:

| Grupa | Miejsca |
|---|---|
| Cały serwis | baner górny (wszystkie strony), pasek przypięty na dole ekranu telefonu (można zamknąć) |
| Strona główna | billboard, baner między sekcjami, kafel wśród ofert |
| Wyniki wyszukiwania | baner nad listą, kafel w liście |
| Ogłoszenie | obok galerii (góra panelu bocznego), **pod opisem**, **przy racie kredytu**, pod formularzem kontaktu |
| Pozostałe | strona miasta, poradnik |

Jedna kampania może działać w kilku miejscach naraz. **Kierowanie** (puste = bez ograniczeń):

- **obszar z mapy** – klikasz środek (albo wybierasz miasto) i ustawiasz promień w km; reklama pokazuje się tylko przy ofertach i na stronach z tego obszaru,
- województwa i konkretne miasta,
- rodzaj nieruchomości, transakcja (sprzedaż / wynajem), rynek, przedział ceny oferty,
- urządzenie (komputer / telefon), dni tygodnia i godziny emisji (czas polski).

**Limity:** maks. wyświetleń na osobę dziennie, limit wyświetleń całej kampanii, priorytet w rotacji 1–10. **Rozliczenie:** stała kwota miesięcznie, za 1000 wyświetleń, za kliknięcie lub bezpłatnie – panel liczy szacowany przychód. Lista kampanii pokazuje zajętość każdego miejsca, statusy (aktywna, zaplanowana, wstrzymana, limit, zakończona), CTR i przełącznik włącz / wstrzymaj. Kliknięcia liczone są przez `/r/:id`.

## Ustawienia serwisu (panel admina)

Hasło i opis serwisu, e-maile, telefon, godziny, dane firmy (regulamin, polityka prywatności, stopka) i linki do mediów społecznościowych – zmiany działają od razu, bez wdrożenia. Puste pole = wartość z Railway albo domyślna.

## Odległość do plaży

Pole **„Odległość do plaży (m)”** w formularzu ogłoszenia (klient i biuro), filtr **„Do plaży”** w wyszukiwarce (do 300 m / 500 m / 1 km / 2 km / 5 km, parametr `?do_plazy=500`) i oznaczenie „350 m do plaży” na kartach i stronie oferty.

## SEO

- Adresy przyjazne: `/sprzedaz/{typ}/{miasto}`, `/wynajem/...`, `/miasto/{miasto}`, `/oferta/{tytul}-{nr}`
- Tytuły i opisy z odmianą miejscowników („Mieszkania na sprzedaż w Słupsku”) dla wszystkich miejscowości
- `canonical`, `noindex` dla stron z filtrami i pustych wyników, Open Graph
- JSON-LD: Organization, WebSite + SearchAction, BreadcrumbList, RealEstateListing/Offer, RealEstateAgent, ItemList, FAQPage, Article, CollectionPage
- `/sitemap.xml` (indeks) → strony, lokalizacje, kombinacje kategoria × miasto (tylko z ofertami + najważniejsze miasta), ogłoszenia ze zdjęciami, biura
- `/robots.txt` blokuje panele, API i warianty sortowania
- Linkowanie wewnętrzne: miasta w pobliżu (odległość w km), dzielnice, mapa strony HTML, chmury linków
- Lista miejscowości i dzielnic: `src/config/locations.js`, opisy miast: `src/content/cities.js`

## Wdrożenie na Railway (GitHub → Railway)

1. Rozpakuj ZIP, wrzuć zawartość do nowego repozytorium na GitHubie.
2. Railway → **New Project → Deploy from GitHub repo** → wybierz repozytorium.
3. W projekcie **+ New → Database → MongoDB**.
4. W usłudze aplikacji → **Variables** dodaj:
   - `MONGODB_URI` = `${{MongoDB.MONGO_URL}}` (referencja do bazy)
   - `SESSION_SECRET` = długi losowy ciąg
   - `SITE_URL` = adres strony, np. `https://nieruchomoscipomorza.pl` (bez `/` na końcu)
   - **`ADMIN_PIN`** = kod do panelu administratora (najlepiej 12+ losowych znaków)
   - `ADMIN_EMAILS` = (opcjonalnie) e-maile kont z rolą administratora w serwisie
   - `UPLOAD_DIR` = `/data/uploads`
   - dane firmy: `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_NIP`, kontakt i social media – pełna lista w `.env.example` (te dane można też zmienić później w panelu: *Ustawienia serwisu*)
5. **Volume:** usługa aplikacji → **+ New Volume**, mount path `/data` – tam zapisują się zdjęcia (bez Volume znikną przy każdym wdrożeniu).
6. **Domena:** Settings → Networking → Generate Domain lub własna domena. Ustaw ją też w `SITE_URL`.
7. Wejdź na `https://twojadomena.pl/admin` i wpisz kod z `ADMIN_PIN`.
8. (Opcjonalnie) dane demo: na swoim komputerze ustaw w `.env` publiczny adres bazy (Railway → MongoDB → Connect → Public URL) i uruchom `npm run seed -- --demo`. Usunięcie: `npm run seed -- --wyczysc-demo`.

### Logowanie przez Google

Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web application):
- Authorized JavaScript origins: `https://twojadomena.pl`
- Authorized redirect URIs: `https://twojadomena.pl/auth/google/callback`

Wpisz `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` w Variables. Bez nich przycisk Google się nie wyświetla.

### E-mail

Ustaw `SMTP_*` (np. skrzynka w hostingu poczty, Brevo, Mailgun). Bez SMTP wiadomości (reset hasła, zapytania, powiadomienia) tylko trafiają do logów – reset hasła nie zadziała dla użytkowników.

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env   # uzupełnij MONGODB_URI i SESSION_SECRET
npm run dev            # http://localhost:3000
```

Zmieniasz klasy Tailwind w widokach? Przebuduj CSS: `npm run build:css` (albo `npm run watch:css` w trakcie pracy) i commituj `public/css/app.css`.

## Struktura

```
server.js                 start aplikacji, bezpieczeństwo, sesje, trasy
src/config/               marka i kontakt, miejscowości, słowniki nieruchomości
src/models/               User, Agency, Listing, Inquiry, PartnerRequest, Ad, SavedSearch, Report, StatDaily
src/routes/               public, auth, panel (klient), agency (biuro), admin, seo (sitemap, robots)
src/services/             wyszukiwarka, SEO/JSON-LD, reklamy, statystyki, wykresy SVG, ilustracje, upload, e-mail, zadania cykliczne
src/content/              poradnik, opisy miast, FAQ
views/                    szablony EJS (layouty, strony, panele, partiale)
public/                   CSS, JS, logo, favicon, obraz Open Graph
scripts/seed.js           administrator + dane demo
```

## Bezpieczeństwo

Hasła bcrypt, sesje w MongoDB (httpOnly, secure, sameSite), CSRF na wszystkich formularzach, Helmet z CSP, limity prób logowania i formularzy, honeypot antyspamowy, walidacja uploadu (tylko obrazy, 10 MB), role i uprawnienia w panelach.

## Uwagi

- Regulamin i polityka prywatności to szablony – uzupełnij dane i daj do sprawdzenia prawnikowi.
- Ogłoszenia bez zdjęć pokazują generowaną ilustrację SVG w stylu marki.
- Statystyki cen liczone są z ogłoszeń w bazie (ceny ofertowe).
