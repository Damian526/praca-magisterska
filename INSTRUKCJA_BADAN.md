# Instrukcja przeprowadzenia badań

> ## ⚠️ ARCHIWALNE — dotyczy sesji 1–3 (pilotaż)
>
> Dla sesji 4, 5 i 6 obowiązuje **`INSTRUKCJA_SES_04_06.md`**.
>
> Ten plik zawiera **nieaktualną komendę budowania Ionica** (`installDebug`,
> 9 wystąpień). Budowanie w wariancie debug było jedną z wad wykrytych
> po sesji 3 — Ionic działał jako APK debugowalny, a React Native jako release.
> Nie kopiuj stąd komend budowania.

Stałe:

- React Native: `com.shopreactnative`
- Ionic: `io.ionic.starter`
- Telefon: `MJVC5XO7PJDEQ8FI`
- Katalog roboczy: `/Users/damianzieba/projects/praca-magisterska/praca-magisterska`

---

## Dlaczego plan wygląda tak, a nie inaczej

Pilotaż zmierzył **cały React Native w jednym oknie czasowym, a cały Ionic w drugim**.
Wszystko, co zmieniło się między tymi oknami — temperatura telefonu, procesy w tle,
rozmiar bazy — jest nierozerwalnie zmieszane z efektem platformy i nie da się tego
rozdzielić po fakcie.

Dlatego: **platformy mierzymy naprzemiennie w obrębie tego samego scenariusza**,
a całość powtarzamy w **trzech sesjach** w różne dni, z odwróconą kolejnością.

| Sesja | `SESSION_ID` | S1 | S2 | S3 |
|-------|--------------|----|----|-----|
| 1 | `ses_01` | RN → Ionic | Ionic → RN | RN → Ionic |
| 2 | `ses_02` | Ionic → RN | RN → Ionic | Ionic → RN |
| 3 | `ses_03` | RN → Ionic | Ionic → RN | RN → Ionic |

Wynik: 3 × 30 = **90 obserwacji na platformę na wskaźnik**.

---

# CZĘŚĆ 1 — Przygotowanie (raz na sesję)

## 1.1 Telefon

Podłącz kablem USB, odblokuj ekran.

```bash
adb devices
```

Musi pokazać `MJVC5XO7PJDEQ8FI	device`. Jeśli lista jest pusta albo widnieje
`unauthorized`:

```bash
adb kill-server && adb devices
```

i zatwierdź monit o debugowanie USB na ekranie telefonu.

**Warunki na czas całej sesji:**

- ekran odblokowany, wygaszanie wyłączone
- tryb samolotowy **włączony** (ruch do backendu idzie po USB)
- „Nie przeszkadzać" włączone
- aplikacje w tle zamknięte
- ładowarka podłączona

## 1.2 Baza i backend — Terminal A

```bash
cd /Users/damianzieba/projects/praca-magisterska/praca-magisterska/services-shop-api
docker compose up -d db
npm run build && npm start
```

Zostaw to okno otwarte do końca sesji. **Nie używaj `npm run dev`** — tryb
deweloperski zawyża `server_ms`, który trafia do wyników.

## 1.3 Tunel USB — Terminal B

```bash
cd /Users/damianzieba/projects/praca-magisterska/praca-magisterska
adb reverse tcp:3000 tcp:3000
adb reverse --list        # musi pokazać tcp:3000 tcp:3000
```

Powtórz, jeśli w trakcie sesji odłączysz telefon.

---

# CZĘŚĆ 2 — Przebieg sesji

Wszystko poniżej w **Terminalu B**.

Sesja składa się z trzech bloków: S1, S2, S3. Każdy blok wygląda tak samo,
różni się tylko scenariuszem i kolejnością platform.

## 2.1 Blok S1 — start aplikacji

```bash
# 1. Ustaw serię w obu aplikacjach
./maestro/scripts/set-run.sh ses_01 S1

# 2. Przebuduj i zainstaluj React Native   (~1 min)
cd shop-react-native
npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI
cd ..

# 3. Przebuduj i zainstaluj Ionic          (~1 min)
cd shop-ionic
npm run build && npx cap sync android && (cd android && ./gradlew installDebug)
cd ..

# 4. Przebieg — kolejność wg tabeli: w S1 sesji 1 pierwszy jest RN  (~4,6 min)
maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI

# 5. Druga platforma                                                (~4,6 min)
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

⚠️ **Kroki 2 i 3 są obowiązkowe przy każdej zmianie scenariusza.** Konfiguracja
serii jest wkompilowana w aplikację — bez przebudowy zmierzysz poprzedni scenariusz
pod nową etykietą.

Przerwa **5 minut**.

## 2.2 Blok S2 — reakcja UI

Uwaga: w sesji 1 scenariusz S2 zaczyna **Ionic**.

```bash
./maestro/scripts/set-run.sh ses_01 S2

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

Przerwa **5 minut**.

## 2.3 Blok S3 — pełna ścieżka zakupowa

S3 jako jedyny tworzy zamówienia i renderuje ich listę, więc dochodzą dwa kroki:
**zerowanie bazy** przed każdą platformą i **próbkowanie RAM/CPU**.

```bash
./maestro/scripts/set-run.sh ses_01 S3

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# --- pierwsza platforma (w sesji 1: RN) ---
./maestro/scripts/reset-orders.sh
./maestro/scripts/sample-resources.sh com.shopreactnative react-native ses_01_S3_rn 700 &
maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI

# --- druga platforma ---
./maestro/scripts/reset-orders.sh
./maestro/scripts/sample-resources.sh io.ionic.starter ionic ses_01_S3_io 700 &
maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

**Dlaczego zerowanie przed każdą platformą:** ekran historii renderuje to, co zastanie
w bazie. Bez tego druga platforma renderuje dwa razy dłuższą listę niż pierwsza —
w pilotażu RN renderował 6→20 pozycji, a Ionic zawsze 20, i wyniki nie były porównywalne.

**Próbkowanie:** `&` na końcu puszcza sampler w tle, więc terminal od razu przyjmuje
kolejną komendę. 700 s to zapas nad ~9,5-minutowym przebiegiem. Nic się nie stanie,
jeśli sampler skończy później niż test — ważne, żeby ruszył **przed** nim.

## 2.4 Pomiar startu na poziomie systemu

Raz na sesję, po blokach. Niezależna od kodu aplikacji kontrola dla `STARTUP_MS`:

```bash
./maestro/scripts/measure-startup.sh com.shopreactnative react-native 30
./maestro/scripts/measure-startup.sh io.ionic.starter    ionic       30
```

---

# CZĘŚĆ 3 — Po sesji

```bash
./maestro/scripts/export-metrics.sh ses_01     # -> data/metrics/metrics_ses_01.csv
./maestro/scripts/backup-db.sh                 # -> data/db-backups/*.sql
```

## Kontrola jakości — zanim uznasz sesję za udaną

Otwórz `data/metrics/metrics_ses_01.csv` i sprawdź:

- [ ] `build_type` — wszędzie `RELEASE`
- [ ] `session_id` — wszędzie `ses_01`
- [ ] `device_model` — wypełniony po **obu** stronach (`2409BRN2CY`)
- [ ] `platform` — obecne i `REACT_NATIVE`, i `IONIC`
- [ ] `iteration` — ciągnie się 1..30 w każdej grupie, bez powtórzeń
- [ ] liczności — dokładnie 30 na kombinację platforma × scenariusz × metryka

Szybkie sprawdzenie liczności:

```bash
curl -s -H "X-Admin-Token: token-do-endpointow-badawczych" \
  "http://localhost:3000/api/metrics/summary?sessionId=ses_01" | python3 -m json.tool
```

Jeśli seria wyszła źle:

```bash
curl -X DELETE -H "X-Admin-Token: token-do-endpointow-badawczych" \
  http://localhost:3000/api/metrics/run/ses_01_S2       # jedna seria
curl -X DELETE -H "X-Admin-Token: token-do-endpointow-badawczych" \
  http://localhost:3000/api/metrics/session/ses_01      # cała sesja
```

---

# CZĘŚĆ 4 — Sesja 2 (`ses_02`)

Inny dzień niż sesja 1. Przygotowanie (Część 1) identyczne. Różnica względem
sesji 1: **kolejność platform jest odwrócona w S1 i S3**, a w S2 zaczyna RN.

## 4.1 Blok S1 — start aplikacji

```bash
./maestro/scripts/set-run.sh ses_02 S1

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# w sesji 2 scenariusz S1 zaczyna Ionic
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

Przerwa **5 minut**.

## 4.2 Blok S2 — reakcja UI

```bash
./maestro/scripts/set-run.sh ses_02 S2

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# w sesji 2 scenariusz S2 zaczyna RN
maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

Przerwa **5 minut**.

## 4.3 Blok S3 — pełna ścieżka zakupowa

```bash
./maestro/scripts/set-run.sh ses_02 S3

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# --- pierwsza platforma w sesji 2: Ionic ---
./maestro/scripts/reset-orders.sh
./maestro/scripts/sample-resources.sh io.ionic.starter ionic ses_02_S3_io 700 &
maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI

# --- druga platforma ---
./maestro/scripts/reset-orders.sh
./maestro/scripts/sample-resources.sh com.shopreactnative react-native ses_02_S3_rn 700 &
maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

## 4.4 Pomiar startu na poziomie systemu

Raz, po blokach:

```bash
./maestro/scripts/measure-startup.sh com.shopreactnative react-native 30
./maestro/scripts/measure-startup.sh io.ionic.starter    ionic       30
```

## 4.5 Po sesji

```bash
./maestro/scripts/export-metrics.sh ses_02
./maestro/scripts/backup-db.sh
```

Ta sama lista kontrolna co w Części 3, tylko dla `ses_02`:

```bash
curl -s -H "X-Admin-Token: token-do-endpointow-badawczych" \
  "http://localhost:3000/api/metrics/summary?sessionId=ses_02" | python3 -m json.tool
```

---

# CZĘŚĆ 5 — Sesja 3 (`ses_03`)

Inny dzień niż sesje 1 i 2. Kolejność platform jak w sesji 1 (RN→Ionic, Ionic→RN,
RN→Ionic) — sesja 3 zamyka cykl, wracając do układu z sesji 1.

## 5.1 Blok S1 — start aplikacji

```bash
./maestro/scripts/set-run.sh ses_03 S1

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# w sesji 3 scenariusz S1 zaczyna RN
maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

Przerwa **5 minut**.

## 5.2 Blok S2 — reakcja UI

```bash
./maestro/scripts/set-run.sh ses_03 S2

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# w sesji 3 scenariusz S2 zaczyna Ionic
maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

Przerwa **5 minut**.

## 5.3 Blok S3 — pełna ścieżka zakupowa

```bash
./maestro/scripts/set-run.sh ses_03 S3

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug) && cd ..

# --- pierwsza platforma w sesji 3: RN ---
./maestro/scripts/reset-orders.sh
./maestro/scripts/sample-resources.sh com.shopreactnative react-native ses_03_S3_rn 700 &
maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI

# --- druga platforma ---
./maestro/scripts/reset-orders.sh
./maestro/scripts/sample-resources.sh io.ionic.starter ionic ses_03_S3_io 700 &
maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

## 5.4 Pomiar startu na poziomie systemu

```bash
./maestro/scripts/measure-startup.sh com.shopreactnative react-native 30
./maestro/scripts/measure-startup.sh io.ionic.starter    ionic       30
```

## 5.5 Po sesji

```bash
./maestro/scripts/export-metrics.sh ses_03
./maestro/scripts/backup-db.sh
```

```bash
curl -s -H "X-Admin-Token: token-do-endpointow-badawczych" \
  "http://localhost:3000/api/metrics/summary?sessionId=ses_03" | python3 -m json.tool
```

Po trzeciej sesji masz komplet: `metrics_ses_01.csv`, `metrics_ses_02.csv`,
`metrics_ses_03.csv` w `data/metrics/` — gotowe do sprawdzenia spójności
międzysesyjnej (patrz „W analizie" na końcu tego dokumentu).

---

# Ile to trwa

| Pozycja | Czas |
|---|---|
| S1 (obie platformy) | 9,2 min |
| S2 (obie platformy) | 8,6 min |
| S3 (obie platformy) | 19,0 min |
| Przebudowy aplikacji (3 × 2 min) | 6 min |
| `measure-startup.sh` | 5 min |
| Przerwy (2 × 5 min) | 10 min |
| **Razem** | **~58 min** |

---

# Rozwiązywanie problemów

**`Device MJVC5XO7PJDEQ8FI was requested, but it is not connected`**
Literówka w ID albo telefon odłączony. Sprawdź `adb devices`.

**`Package undefined is not installed`**
Zapomniany `-e APP_ID=…` w komendzie `maestro test`.

**Asercja „Wysłano" pada, a wcześniejsze kroki przeszły**
Aplikacja nie zdołała wysłać pomiarów. Najczęściej: brak `adb reverse`,
niedziałający backend, albo **stary APK sprzed przebudowy** — backend odrzuci
wtedy paczkę z `VALIDATION_ERROR: missingProperty sessionId`. Sprawdź log w Terminalu A.

**`INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match`**
Na telefonie siedzi build podpisany innym kluczem.
`adb uninstall com.shopreactnative`, potem zainstaluj ponownie.

**`INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`**
Telefon czeka na potwierdzenie instalacji. Odblokuj ekran i zatwierdź monit.

**Test „stoi" na pierwszym kroku**
Maestro pokazuje `${APP_ID}` zanim krok faktycznie ruszy, a cold start release
builda potrafi chwilę potrwać. Nie przerywaj — poczekaj na ✅ albo ❌.

---

# Co która metryka mierzy

Każda nazwa odpowiada dokładnie jednemu miejscu pomiaru w kodzie.

| Metryka | Scenariusz | Co mierzy |
|---|---|---|
| `STARTUP_MS` | S1 | start aplikacji → gotowy katalog |
| `UI_RESPONSE_MS` | S2 | dotknięcie pozycji → narysowany ekran detalu. Zawiera czas sieci, bo to opóźnienie odczuwane przez użytkownika; rozbicie w `extra.apiMs` / `extra.renderMs` |
| `REQUEST_BUILD_MS` | S3 | budowa i serializacja ciała żądania |
| `API_REQUEST_MS` | S3 | sieć + serwer, bez renderu |
| `RENDER_CHECKOUT_MS` | S3 | odpowiedź odebrana → przerysowany ekran |
| `RENDER_ORDERS_MS` | S3 | dane historii dostępne → narysowana lista. Czas sieci odcięty, dostępny w `extra.apiMs` |

Czas pomiaru: kolumna **`recorded_at_ms`** (epoch w milisekundach). Bezstrefowa,
więc jednoznaczna — tej używaj do łączenia z plikami RAM/CPU. `recorded_at_utc`
jest z niej wyliczana przy eksporcie.

RAM i CPU nie trafiają do bazy — są w `data/resources/*.csv`. Uwaga przy opisie
w pracy: `cpu_percent` bywa > 100%, bo `top` sumuje obciążenie po rdzeniach.

---

# W analizie

Najpierw sprawdź, czy **sesje są spójne** — czy mediany z `ses_01`, `ses_02`
i `ses_03` są podobne. Jeśli tak, możesz je łączyć w jedną próbę. Jeśli któraś
odstaje, masz dowód, że zmienność międzysesyjna jest realna i trzeba ją opisać.

Tak czy inaczej wygrywasz: albo mocniejsze `n`, albo ustalenie metodologiczne
do rozdziału 3.
