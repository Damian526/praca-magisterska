# Podział zmian na commity

Kolejność ma znaczenie — commity 1–5 są niezależne, 6 musi wejść w całości,
7–10 znowu niezależne.

⚠️ Trzy pliki zawierają zmiany należące do **dwóch różnych commitów**. Zaznaczone
niżej jako `git add -p`.

---

## 1. `fix: łączność z backendem przez adb reverse zamiast IP w Wi-Fi`

Sztywne IP komputera przestawało działać po każdej zmianie adresu z DHCP.

```
shop-react-native/src/core/config.ts   <- git add -p, TYLKO hunk z API_URL
shop-ionic/src/core/config.ts          <- git add -p, TYLKO hunk z API_URL
```

## 2. `fix(rn): przycisk zamówienia wchodził w strefę gestu nawigacyjnego`

Ekran koszyka nie respektował dolnego marginesu bezpieczeństwa, przez co
dotknięcie „Przejdź do zamówienia" bywało przechwytywane przez systemowy gest
powrotu do ekranu głównego. Wykryte podczas przebiegu S3.

```
shop-react-native/src/screens/CartScreen.tsx
```

## 3. `fix(ionic): brakujący tytuł ekranu katalogu`

Bez `<IonTitle>` scenariusze padały na pierwszej asercji i nie zapisywały
ani jednego pomiaru dla Ionica.

```
shop-ionic/src/screens/CatalogScreen.tsx   <- git add -p, TYLKO hunki z IonTitle
```

## 4. `fix(maestro): poprawki scenariusza S3`

Kliknięcie w element przewinięty poza ekran oraz zbyt płytkie cofanie
(stos ma 4 ekrany, bo Checkout jest zastępowany przez Orders, a nie odkładany).

```
maestro/s3_full_path.yaml
maestro/S1_startup.yaml    <- UWAGA: ta zmiana leżała niezacommitowana już
                              wcześniej, nie pochodzi z tej sesji. Sprawdź,
                              czy chcesz ją tu dołożyć.
```

## 5. `refactor(api): typy Prismy z generowanego klienta`

W v7 pakiet `@prisma/client` niesie nieaktualne typy; projekt miał już nowszy
wzorzec w `src/db/prisma.ts`. Bez tego nowe kolumny nie były widoczne dla TS.

```
services-shop-api/src/plugins/prisma.ts
services-shop-api/src/modules/auth/auth.service.ts
services-shop-api/src/modules/catalog/catalog.service.ts
services-shop-api/src/modules/orders/orders.service.ts
```

---

## 6. `feat: scenariusz jako własność serii pomiarowej`

**Ten commit musi wejść w całości** — zmienia kontrakt między aplikacjami
a backendem. Rozbicie go zostawiłoby pośredni stan, w którym aplikacja wysyła
format, którego serwer nie przyjmuje.

Co naprawia:
- pomiary trafiały pod scenariusz zaszyty w ekranie, więc S3 zasilało dane „S2"
- trzy różne ekrany zapisywały się pod jedną nazwą `render_ms`
- `ui_response_ms` w S3 mierzyło budowę obiektu żądania (~0 ms)
- `iteration` zawsze wynosiło 1 w S1, bo każdy start generował nowy `runId`
- kolumna `recordedAt` zapisywała moment przesunięty o offset strefy

```
services-shop-api/prisma/schema.prisma
services-shop-api/prisma/migrations/20260906204300_scenariusz_jako_wlasnosc_serii/
services-shop-api/prisma/migrations/20260906205232_usun_kolumne_recordedat/
services-shop-api/src/modules/metrics/metrics.schema.ts
services-shop-api/src/modules/metrics/metrics.routes.ts

shop-react-native/src/core/config.ts    <- reszta hunków (SESSION_ID/SCENARIO/RUN_ID)
shop-react-native/src/core/measure.ts
shop-react-native/App.tsx
shop-react-native/src/screens/CatalogScreen.tsx
shop-react-native/src/screens/ServiceDetailScreen.tsx
shop-react-native/src/screens/CheckoutScreen.tsx
shop-react-native/src/screens/OrdersScreen.tsx
shop-react-native/src/screens/SearchScreen.tsx
shop-react-native/src/platform/device.ts

shop-ionic/src/core/config.ts           <- reszta hunków
shop-ionic/src/core/measure.ts
shop-ionic/src/App.tsx
shop-ionic/src/screens/CatalogScreen.tsx   <- reszta hunków (record bez scenariusza)
shop-ionic/src/screens/ServiceDetailsScreen.tsx
shop-ionic/src/screens/CheckoutScreen.tsx
shop-ionic/src/screens/OrdersScreen.tsx
shop-ionic/src/screens/SearchScreen.tsx
shop-ionic/src/platform/device.ts
shop-ionic/package.json
shop-ionic/package-lock.json
```

Jeśli wolisz mniejszy commit, jedyne co da się bezpiecznie wyjąć osobno to
metadane urządzenia (`platform/device.ts` ×2 + `@capacitor/device`
w `package.json`) — ale muszą wejść **przed** resztą, bo `App.tsx` ich używa.

---

## 7. `fix(db): kontener bazy w UTC`

```
services-shop-api/docker-compose.yml
```

## 8. `feat(scripts): ustawianie serii, zerowanie zamówień, twardsze kontrole`

`set-run.sh` ustawia serię w obu aplikacjach naraz. `reset-orders.sh` wyrównuje
stan bazy przed każdym przebiegiem S3 — bez tego druga mierzona platforma
renderuje dłuższą listę historii niż pierwsza. `measure-startup.sh` przy
niedostępnym telefonie zapisywał puste wiersze i kończył się sukcesem.

```
maestro/scripts/set-run.sh
maestro/scripts/reset-orders.sh
maestro/scripts/measure-startup.sh
maestro/scripts/export-metrics.sh
```

## 9. `docs: protokół pomiarowy`

```
INSTRUKCJA_BADAN.md
```

## 10. `chore: archiwum danych z pilotażu`

Dane z pierwszego podejścia — zachowane, bo pokazują skalę problemów, które
wymusiły przebudowę instrumentacji.

```
data/archiwum-pilotaz/
data/resources/
data/db-backups/measurements_20260906_183051.sql   (usunięty — przeniesiony do archiwum)
```

Ten plik (`PODZIAL_COMMITOW.md`) możesz skasować po zrobieniu commitów.
