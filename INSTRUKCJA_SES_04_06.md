# Instrukcja pomiarów — sesje 4, 5 i 6 (warunki poprawione)

> **Ta instrukcja zastępuje `INSTRUKCJA_BADAN.md` dla nowych sesji.**
> Tamten plik opisuje sesje 1–3 i zawiera **nieaktualną komendę budowania Ionica**
> (`installDebug`) oraz **stary numer sesji** (`ses_01`). Nie kopiuj stamtąd niczego.

Wszystkie komendy poniżej są rozpisane w całości. **Nic nie podstawiasz —
tylko kopiujesz i wklejasz, blok po bloku, od góry do dołu.**

---

## Co się zmieniło i dlaczego robimy to jeszcze raz

W sesjach 1–3 wykryto trzy wady stanowiska. Dwie zostały naprawione w kodzie,
trzecia wymaga zmiany procedury.

| Wada | Skutek | Naprawa |
|---|---|---|
| Kotwica `__APP_START__` w Ioniku ustawiana po ewaluacji całego bundla (99,3 % pliku) | `STARTUP_MS` mierzył inny przedział w każdej aplikacji — nieporównywalne | `shop-ionic/src/anchor.ts`, importowany jako pierwszy. Zweryfikowane: kotwica na 0,14 % bundla |
| Ionic budowany jako `installDebug`, RN jako `--mode=release` | APK debugowalny vs release — inne warunki wykonania | `signingConfig signingConfigs.debug` w `shop-ionic/android/app/build.gradle`; budowanie przez `installRelease` |
| Pomiary zasobów tylko dla S3 | H1.3 i H1.4 mówią o „scenariuszach" w liczbie mnogiej | `sample-resources.sh` uruchamiany w każdym scenariuszu |

**Sesje 1–3 nie są kasowane.** Przechodzą do roli pilotażu — są dowodem, że wady
istniały, i pozwolą policzyć, ile kosztowała ewaluacja bundla oraz wariant debug.

### Dlaczego trzy sesje, a nie jedna

`STARTUP_MS` po naprawie kotwicy nie ma **żadnych** ważnych danych historycznych —
zaczynasz od zera. Trzy sesje w poprawionych warunkach oznaczają, że cały rozdział 3
stoi na jednym, spójnym zbiorze, bez zastrzeżeń.

### Kolejność platform (już wpisana w komendy — nie musisz nic sprawdzać)

| Sesja | S1 | S2 | S3 |
|---|---|---|---|
| `ses_04` | Ionic → RN | RN → Ionic | Ionic → RN |
| `ses_05` | RN → Ionic | Ionic → RN | RN → Ionic |
| `ses_06` | Ionic → RN | RN → Ionic | Ionic → RN |

**Sesje rób w różne dni albo różne pory dnia.** Trzy sesje pod rząd na tym samym
nagrzanym telefonie to nie są niezależne powtórzenia.

---

# CZĘŚĆ 1 — Przygotowanie (raz na sesję)

## 1.1 Telefon

- **naładuj do ~100 % PRZED sesją** i zostaw na kablu (tunel `adb reverse` idzie po USB,
  więc odłączyć się nie da). Pełna bateria pobiera prąd podtrzymujący i się nie grzeje;
  bateria na 40 % wchodzi w szybkie ładowanie, nagrzewa telefon i wywołuje throttling
- nigdy poniżej ~30 % — niżej system sam ogranicza wydajność
- tryb samolotowy **włączony**, WiFi i Bluetooth **wyłączone**
- jasność ekranu stała, auto-jasność **wyłączona**
- tryb oszczędzania energii **wyłączony**
- wszystkie aplikacje w tle zamknięte
- **Nie dotykaj telefonu w trakcie przebiegu.**

### Przed każdym blokiem — jeden wklej

```bash
# 1) ubij OBIE aplikacje — flow sam uruchomi tę, którą mierzysz
adb shell am force-stop com.shopreactnative
adb shell am force-stop io.ionic.starter

# 2) sprawdź stan telefonu
adb shell dumpsys thermalservice | grep "Thermal Status"
adb shell dumpsys battery | grep -E "level|temperature"
adb shell settings get global low_power
```

**Dlaczego ubijanie obu:** obie aplikacje potrafią zostać w tle jednocześnie,
zajmując po ~280 MB. Mierząc Ionica masz wtedy w pamięci React Native i odwrotnie —
to zmienia presję na pamięć i zachowanie garbage collectora, a stan tła zależy od tego,
którą aplikację uruchamiałeś ostatnio. `force-stop` jest deterministyczny;
przesunięcie w menu ostatnich aplikacji nie zawsze ubija proces.

Wymagane wartości:

| Odczyt | Musi być | Znaczenie |
|---|---|---|
| `Thermal Status` | **0** | 1 i wyżej = aktywny throttling, pomiar do kosza |
| `level` | > 30 | niżej system ogranicza wydajność |
| `temperature` | < ~380 (38 °C) | wartość w dziesiątych stopnia |
| `low_power` | **0** | tryb oszczędzania wyłączony |

Jeśli `Thermal Status` jest większy od 0 — **odczekaj, aż telefon ostygnie**, zanim
uruchomisz przebieg. Throttling nie objawia się pojedynczym skokiem, tylko blokiem
kolejnych zawyżonych iteracji (w pilotażu: ses_01, RN, S1, iteracje 14–18 —
898–1495 ms przy medianie 613 ms).

## 1.2 Baza i backend — Terminal A

```bash
cd /Users/damianzieba/projects/praca-magisterska/praca-magisterska
docker compose -f services-shop-api/docker-compose.yml up -d db
docker ps | grep shop_db

cd services-shop-api
npm run build
NODE_ENV=production LOG_LEVEL=warn TEST_MODE=0 RATE_LIMIT_MAX=100000 npm start
```

⚠️ **`NODE_ENV` musi być w powłoce, nie w pliku `.env`.** Fastify czyta
`disableRequestLogging: process.env.NODE_ENV === "production"`
([server.ts:28](services-shop-api/src/server.ts#L28)) **przed** rejestracją
`@fastify/env`, który dopiero wczytuje `.env` — więc wartość z pliku nigdy tam nie
dotrze. Bez tego przedrostka serwer zapisuje po dwie linie logu na każde mierzone
żądanie (sprawdzone: `incoming request` + `request completed`). Pozostałe zmienne
to konfiguracja produkcyjna zadeklarowana w `docker-compose.yml` (usługa `api`).

Oczywiście `npm run dev` też odpada — ale w pilotażu nie był używany, stara
instrukcja przed nim ostrzegała.

⚠️ **pgAdmin musi być wyłączony** — odpytuje bazę w tle i zaburza pomiar.

## 1.3 Tunel USB — Terminal B

```bash
cd /Users/damianzieba/projects/praca-magisterska/praca-magisterska
adb devices
adb reverse tcp:3000 tcp:3000
adb reverse --list
curl -s localhost:3000/api/services | head -c 80
```

---

# SESJA 4 (`ses_04`)

## ▶ ses_04 · S1 — start aplikacji · kolejność: Ionic → RN

**Konfiguracja i przebudowa:**

```bash
maestro/scripts/set-run.sh ses_04 S1
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

⚠️ `grep` musi pokazać **`ses_04`** ORAZ **właściwy scenariusz**. W sesji 5 pominięcie
`set-run.sh ... S3` sprawiło, że flow S3 zapisał się pod etykietą S2 i trzeba było
powtarzać blok. Sprawdzaj OBIE wartości przed każdą przebudową.

**Teraz otwórz ręcznie obie apki, zaloguj się** (`test@badanie.pl` / `HasloTestowe123`)
**i sprawdź, że widzisz „Katalog usług".**

**Pomiar czasów:**

```bash
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

**Kontrola — musi być po 30 na platformę:**

```bash
docker exec shop_db psql -U shop -d services_shop -c "SELECT scenario, metric, platform, count(*) FROM measurements WHERE \"sessionId\"='ses_04' GROUP BY 1,2,3 ORDER BY 1,2,3;"
```

> **RAM i CPU mierzysz dopiero na końcu sesji**, po wszystkich trzech scenariuszach —
> patrz sekcja „Pomiar RAM/CPU" przed zamknięciem sesji. Gdybyś robił to teraz,
> aplikacja wysłałaby metryki czasowe drugi raz i w bazie pojawiłyby się iteracje 31–60.

---

## ▶ ses_04 · S2 — reakcja UI · kolejność: RN → Ionic

```bash
maestro/scripts/set-run.sh ses_04 S2
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/kill-apps.sh
maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
maestro/scripts/kill-apps.sh
maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

**Kontrola:**

```bash
docker exec shop_db psql -U shop -d services_shop -c "SELECT scenario, metric, platform, count(*) FROM measurements WHERE \"sessionId\"='ses_04' GROUP BY 1,2,3 ORDER BY 1,2,3;"
```

---

## ▶ ses_04 · S3 — pełna ścieżka zakupowa · kolejność: Ionic → RN

```bash
maestro/scripts/set-run.sh ses_04 S3
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów** (zerowanie zamówień przed każdą platformą — inaczej druga renderuje dłuższą listę):

```bash
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI

maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

### Pomiar RAM/CPU — dopiero teraz, po wszystkich czasach

Przechodzisz te same trzy scenariusze **jeszcze raz**, ale tym razem liczy się tylko to,
co skrypt w tle zapisze o pamięci i procesorze. Czasy z tych przebiegów to śmieci —
sprzątasz je jedną komendą na końcu.

Nie musisz nic przebudowywać: `sample-resources.sh` odpytuje telefon z zewnątrz przez
adb, więc nie obchodzi go, na jaki scenariusz zbudowana jest aplikacja.

```bash
# ---- S1 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_04r_S1 400 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_04r_S1 400 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S2 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_04r_S2 400 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_04r_S2 400 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S3 (z zerowaniem zamówień) ----
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_04r_S3 700 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_04r_S3 700 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

**Sprzątanie — usuwa metryki czasowe z przebiegów zasobowych.**
Przebiegi zasobowe idą na buildzie zbudowanym pod S3, więc **wszystko, co wtedy zmierzą,
podpisze się jako S3** — niezależnie od tego, który flow uruchamiasz. W bazie zobaczysz
wtedy np. 90 zamiast 30. Tak ma być; poniższa komenda zostawia tylko dopuszczalne iteracje
(30 na metrykę, a dla `STARTUP_MS` w S2 i S3 — jedną):

```bash
docker exec shop_db psql -U shop -d services_shop -c "DELETE FROM measurements WHERE \"sessionId\"='ses_04' AND ((metric='STARTUP_MS' AND scenario IN ('S2','S3') AND iteration > 1) OR (NOT (metric='STARTUP_MS' AND scenario IN ('S2','S3')) AND iteration > 30));"

# kontrola: znowu ma być po 30 na kombinację (STARTUP_MS w S2 i S3 = 1)
docker exec shop_db psql -U shop -d services_shop -c "SELECT scenario, metric, platform, count(*) FROM measurements WHERE \"sessionId\"='ses_04' GROUP BY 1,2,3 ORDER BY 1,2,3;"
ls -la data/resources/ | grep ses_04r
```

---

**Zamknięcie sesji 4:**

```bash
maestro/scripts/export-metrics.sh ses_04
maestro/scripts/backup-db.sh
.venv/bin/python analiza/analiza.py --sesje ses_04
```

---

# SESJA 5 (`ses_05`) — inny dzień lub inna pora dnia

## ▶ ses_05 · S1 — start aplikacji · kolejność: RN → Ionic

```bash
maestro/scripts/set-run.sh ses_05 S1
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

**Kontrola:**

```bash
docker exec shop_db psql -U shop -d services_shop -c "SELECT scenario, metric, platform, count(*) FROM measurements WHERE \"sessionId\"='ses_05' GROUP BY 1,2,3 ORDER BY 1,2,3;"
```

---

## ▶ ses_05 · S2 — reakcja UI · kolejność: Ionic → RN

```bash
maestro/scripts/set-run.sh ses_05 S2
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/kill-apps.sh
maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
maestro/scripts/kill-apps.sh
maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

---

## ▶ ses_05 · S3 — pełna ścieżka zakupowa · kolejność: RN → Ionic

```bash
maestro/scripts/set-run.sh ses_05 S3
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI

maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

### Pomiar RAM/CPU — dopiero teraz, po wszystkich czasach

Przechodzisz te same trzy scenariusze **jeszcze raz**, ale tym razem liczy się tylko to,
co skrypt w tle zapisze o pamięci i procesorze. Czasy z tych przebiegów to śmieci —
sprzątasz je jedną komendą na końcu.

Nie musisz nic przebudowywać: `sample-resources.sh` odpytuje telefon z zewnątrz przez
adb, więc nie obchodzi go, na jaki scenariusz zbudowana jest aplikacja.

```bash
# ---- S1 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_05r_S1 400 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_05r_S1 400 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S2 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_05r_S2 400 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_05r_S2 400 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S3 (z zerowaniem zamówień) ----
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_05r_S3 700 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_05r_S3 700 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

**Sprzątanie — usuwa metryki czasowe z przebiegów zasobowych.**
Przebiegi zasobowe idą na buildzie zbudowanym pod S3, więc **wszystko, co wtedy zmierzą,
podpisze się jako S3** — niezależnie od tego, który flow uruchamiasz. W bazie zobaczysz
wtedy np. 90 zamiast 30. Tak ma być; poniższa komenda zostawia tylko dopuszczalne iteracje
(30 na metrykę, a dla `STARTUP_MS` w S2 i S3 — jedną):

```bash
docker exec shop_db psql -U shop -d services_shop -c "DELETE FROM measurements WHERE \"sessionId\"='ses_05' AND ((metric='STARTUP_MS' AND scenario IN ('S2','S3') AND iteration > 1) OR (NOT (metric='STARTUP_MS' AND scenario IN ('S2','S3')) AND iteration > 30));"

# kontrola: znowu ma być po 30 na kombinację (STARTUP_MS w S2 i S3 = 1)
docker exec shop_db psql -U shop -d services_shop -c "SELECT scenario, metric, platform, count(*) FROM measurements WHERE \"sessionId\"='ses_05' GROUP BY 1,2,3 ORDER BY 1,2,3;"
ls -la data/resources/ | grep ses_05r
```

---

**Zamknięcie sesji 5:**

```bash
maestro/scripts/export-metrics.sh ses_05
maestro/scripts/backup-db.sh
.venv/bin/python analiza/analiza.py --sesje ses_05
```

---

# SESJA 6 (`ses_06`) — jeszcze inny dzień lub pora

## ▶ ses_06 · S1 — start aplikacji · kolejność: Ionic → RN

```bash
maestro/scripts/set-run.sh ses_06 S1
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

---

## ▶ ses_06 · S2 — reakcja UI · kolejność: RN → Ionic

```bash
maestro/scripts/set-run.sh ses_06 S2
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/kill-apps.sh
maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
maestro/scripts/kill-apps.sh
maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI
```

---

## ▶ ses_06 · S3 — pełna ścieżka zakupowa · kolejność: Ionic → RN

```bash
maestro/scripts/set-run.sh ses_06 S3
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-react-native && npx react-native run-android --mode=release --device MJVC5XO7PJDEQ8FI && cd ..
cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

**Pomiar czasów:**

```bash
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI

maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI
```

### Pomiar RAM/CPU — dopiero teraz, po wszystkich czasach

Przechodzisz te same trzy scenariusze **jeszcze raz**, ale tym razem liczy się tylko to,
co skrypt w tle zapisze o pamięci i procesorze. Czasy z tych przebiegów to śmieci —
sprzątasz je jedną komendą na końcu.

Nie musisz nic przebudowywać: `sample-resources.sh` odpytuje telefon z zewnątrz przez
adb, więc nie obchodzi go, na jaki scenariusz zbudowana jest aplikacja.

```bash
# ---- S1 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_06r_S1 400 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_06r_S1 400 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S2 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_06r_S2 400 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_06r_S2 400 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S3 (z zerowaniem zamówień) ----
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_06r_S3 700 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER

maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh com.shopreactnative REACT_NATIVE ses_06r_S3 700 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=com.shopreactnative --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

**Sprzątanie — usuwa metryki czasowe z przebiegów zasobowych.**
Przebiegi zasobowe idą na buildzie zbudowanym pod S3, więc **wszystko, co wtedy zmierzą,
podpisze się jako S3** — niezależnie od tego, który flow uruchamiasz. W bazie zobaczysz
wtedy np. 90 zamiast 30. Tak ma być; poniższa komenda zostawia tylko dopuszczalne iteracje
(30 na metrykę, a dla `STARTUP_MS` w S2 i S3 — jedną):

```bash
docker exec shop_db psql -U shop -d services_shop -c "DELETE FROM measurements WHERE \"sessionId\"='ses_06' AND ((metric='STARTUP_MS' AND scenario IN ('S2','S3') AND iteration > 1) OR (NOT (metric='STARTUP_MS' AND scenario IN ('S2','S3')) AND iteration > 30));"

# kontrola: znowu ma być po 30 na kombinację (STARTUP_MS w S2 i S3 = 1)
docker exec shop_db psql -U shop -d services_shop -c "SELECT scenario, metric, platform, count(*) FROM measurements WHERE \"sessionId\"='ses_06' GROUP BY 1,2,3 ORDER BY 1,2,3;"
ls -la data/resources/ | grep ses_06r
```

---

**Zamknięcie sesji 6:**

```bash
maestro/scripts/export-metrics.sh ses_06
maestro/scripts/backup-db.sh
```

---

# CZĘŚĆ 3 — Analiza końcowa

```bash
.venv/bin/python analiza/analiza.py --sesje ses_04 ses_05 ses_06
```

Osobno, dla porównania z pilotażem (**nie uśredniaj razem — inne warunki**):

```bash
.venv/bin/python analiza/analiza.py --sesje ses_01 ses_02 ses_03
```

Wyniki w `data/analiza/`: `czasy.csv`, `zasoby.csv`, `zgodnosc_sesji.csv`, `odstajace.csv`.

## Kontrola jakości każdej sesji

- [ ] `build_type` — wszędzie `RELEASE`
- [ ] `session_id` — zgodny z sesją, którą właśnie robiłeś
- [ ] `device_model` — wypełniony po **obu** stronach (`2409BRN2CY`)
- [ ] `iteration` — 1..30 w każdej grupie, **bez wartości powyżej 30**
- [ ] 6 plików w `data/resources/` z prefiksem sesji, każdy z setkami wierszy
- [ ] **`STARTUP_MS` Ionica różni się wyraźnie od ~581 ms z pilotażu** — jeśli wyszło
      identycznie, poprawka kotwicy nie weszła do builda

Jeśli seria wyszła źle — skasuj i powtórz:

```bash
curl -X DELETE -H "X-Admin-Token: token-do-endpointow-badawczych" http://localhost:3000/api/metrics/run/ses_04_S2
curl -X DELETE -H "X-Admin-Token: token-do-endpointow-badawczych" http://localhost:3000/api/metrics/session/ses_04
```

---

## Czego NIE robić

- ❌ nie budować Ionica przez `installDebug`
- ❌ nie kopiować komend z `INSTRUKCJA_BADAN.md` — tam jest `ses_01` i `installDebug`
- ❌ nie mieszać sesji 1–3 z 4–6 w jednej puli statystycznej
- ❌ nie uruchamiać `sample-resources.sh` równolegle z pomiarem czasów
- ❌ nie kasować sesji 1–3 — są dowodem, że wady istniały
- ❌ nie pomijać `reset-orders.sh` przed blokami S3
- ❌ nie dotykać telefonu w trakcie przebiegu

## Uwaga o `measure-startup.sh`

Skrypt `am start -W` **nie nadaje się na porównanie międzyplatformowe**: Ionic ma
natywny motyw startowy (`AppTheme.NoActionBarLaunch` z `@drawable/splash`), a RN nie,
więc „pierwsza narysowana klatka" znaczy w obu aplikacjach co innego. Poprzednie
uruchomienia zapisały zresztą same nagłówki bez danych. **Możesz go pominąć.**
