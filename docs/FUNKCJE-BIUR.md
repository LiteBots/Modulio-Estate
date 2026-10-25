# Funkcje dla biur nieruchomości – plan

✅ gotowe w tej wersji · 🔜 zaplanowane (kolejne etapy)

Współpraca z biurami nie ma publicznego cennika. Każde biuro dostaje **indywidualny plan** ustawiany przez administratora w `/admin/biura`: limit ogłoszeń, liczba kont, sloty wyróżnień, podbicia na miesiąc, strona biura, import XML, data ważności i notatka.

## 1. Pozyskanie i aktywacja partnera
- ✅ Strona „Zostań partnerem” z opisem funkcji i formularzem (bez cen)
- ✅ Zgłoszenia w panelu admina: statusy (nowe, kontakt, umowa, odrzucone), notatki, e-mail do zespołu i potwierdzenie dla biura
- ✅ „Utwórz biuro z tego zgłoszenia” – formularz uzupełniony danymi ze zgłoszenia
- ✅ Automatyczne konto właściciela + e-mail powitalny
- ✅ Zawieszenie biura (oferty ukryte), usunięcie z archiwizacją ofert
- 🔜 Umowa i faktury w panelu (PDF), przypomnienie przed końcem ważności planu

## 2. Ogłoszenia
- ✅ Formularz w 7 krokach: transakcja, rynek, typ, cena, parametry, 22 udogodnienia, lokalizacja z dzielnicami, do 40 zdjęć, film YouTube, spacer 3D, opis, opiekun, nr referencyjny
- ✅ Pola zależne od typu (działka, dom, garaż…) i transakcji (kaucja przy wynajmie)
- ✅ Statusy: szkic, aktywne, rezerwacja, sprzedane, archiwum; ważność 90 dni i automatyczne wygaszanie
- ✅ Wyróżnienie na 14 dni (sloty z planu) – oferty na górze wyników i na stronie głównej
- ✅ Podbicie na górę wyników (limit miesięczny z planu)
- ✅ Duplikowanie oferty jako szkic
- ✅ Filtry listy: status, agent, tytuł / nr ref.; statystyki przy każdej ofercie
- ✅ Agent edytuje tylko swoje oferty, usuwać może właściciel lub manager
- 🔜 Zmiana kolejności zdjęć przeciąganiem, znak wodny biura, rzut mieszkania jako osobne pole
- 🔜 Masowe akcje (zaznacz kilka → archiwizuj / podbij)
- 🔜 Historia zmian ceny widoczna na ogłoszeniu

## 3. CRM zapytań
- ✅ Zapytania z ogłoszeń i ze strony biura w jednym miejscu
- ✅ Tablica etapów: nowe → w kontakcie → prezentacja → negocjacje → transakcja / zamknięte; widok listy
- ✅ Przypisanie opiekuna, termin prezentacji, notatki wewnętrzne
- ✅ Odpowiedź do klienta z panelu (e-mail + wątek widoczny w panelu klienta)
- ✅ Historia wcześniejszych zapytań tego samego klienta
- ✅ Powiadomienia e-mail o nowym zapytaniu, licznik nowych w menu
- 🔜 Kalendarz prezentacji (widok tygodnia), eksport do .ics
- 🔜 Szablony odpowiedzi, przypomnienia „oddzwoń”
- 🔜 Eksport leadów do CSV

## 4. Zespół
- ✅ Role: właściciel, manager, agent
- ✅ Zaproszenia e-mailem z linkiem (również do skopiowania), limit kont z planu
- ✅ Profil agenta na stronie biura: stanowisko, telefon, opis, widoczność
- ✅ Usunięcie agenta z przepisaniem jego ofert na managera
- 🔜 Ranking agentów (oferty, leady, transakcje)

## 5. Strona biura w serwisie (opcja planu)
- ✅ Adres `/biuro/nazwa`, kolor marki, logo, zdjęcie w tle
- ✅ Nagłówek, podtytuł, wyróżniki, statystyki, zespół, oferty z zakładkami, formularz „pytanie / wycena”
- ✅ Własny tytuł i opis SEO, dane strukturalne RealEstateAgent
- ✅ Bez opcji w planie: podstawowy profil biura + zachęta do kontaktu z opiekunem
- 🔜 Opinie klientów z moderacją
- 🔜 Własna domena biura (CNAME) wskazująca na stronę biura

## 6. Statystyki
- ✅ Wyświetlenia, odsłony telefonu i zapytania dzień po dniu (7/30/90 dni)
- ✅ Konwersja na ofertę, ranking ofert, podział na miasta, źródła zapytań
- ✅ Oferty wygasające w ciągu 7 dni na pulpicie
- 🔜 Raport miesięczny PDF wysyłany e-mailem

## 7. Import i integracje
- ✅ Ekran importu XML w panelu (aktywowany planem, konfiguracja z opiekunem)
- 🔜 Parser XML popularnych systemów CRM dla biur, harmonogram synchronizacji
- 🔜 API dla partnerów (klucze API w panelu)

## 8. Promocja
- ✅ Miejsca reklamowe z kierowaniem na miasta – sprzedawane indywidualnie przez `/reklama`
- ✅ Biuro na stronach obsługiwanych miast i w katalogu biur
- 🔜 Oznaczenie „Partner Premium” w wynikach, newsletter z ofertami biura
