# ModulioEstate

Portal ogłoszeń nieruchomości dla **województwa pomorskiego i zachodniopomorskiego**: Trójmiasto, Słupsk, Ustka, Bytów, Miastko, Chojnice, Koszalin, Kołobrzeg, Szczecin i 100+ innych miejscowości.

**Stack:** Node.js 18+ · Express · EJS (renderowanie po stronie serwera – najlepsze dla SEO) · MongoDB (Mongoose) · Passport (e-mail + hasło, Google) · Tailwind CSS (zbudowany, gotowy w `public/css/app.css`).

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

## Model współpracy z biurami

Nie ma publicznych pakietów ani cennika. Biuro wypełnia formularz **Zostań partnerem** → zgłoszenie trafia do `/admin/zgloszenia` → administrator klika **Utwórz biuro z tego zgłoszenia**, ustawia indywidualny plan (limit ogłoszeń, konta, wyróżnienia, podbicia, strona biura, import XML, data ważności) i podaje e-mail właściciela. Właściciel loguje się (Google lub reset hasła) i zaprasza zespół z panelu.

## Reklamy

7 miejsc reklamowych (strona główna, wyniki wyszukiwania, ogłoszenie, strona miasta, poradnik). Kampanie dodajesz w `/admin/reklamy`: grafika (lub baner tekstowy), adres, daty, priorytet, kierowanie na miasta i województwa. Liczymy wyświetlenia i kliknięcia. Wolne miejsce pokazuje zachętę „Twoja reklama w tym miejscu” prowadzącą do `/reklama`.

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
   - `SITE_URL` = adres strony, np. `https://modulioestate.pl` (bez `/` na końcu)
   - `ADMIN_EMAILS` = Twój e-mail (dostaniesz rolę administratora po zalogowaniu)
   - `UPLOAD_DIR` = `/data/uploads`
   - dane firmy: `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_NIP`, kontakt i social media – patrz `.env.example`
5. **Volume:** usługa aplikacji → **+ New Volume**, mount path `/data` – tam zapisują się zdjęcia (bez Volume znikną przy każdym wdrożeniu).
6. **Domena:** Settings → Networking → Generate Domain lub własna domena. Ustaw ją też w `SITE_URL`.
7. Wejdź na stronę, zarejestruj się adresem z `ADMIN_EMAILS` – masz dostęp do `/admin`.
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
