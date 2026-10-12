# Instrukcja — ponowny pomiar RAM/CPU Ionica (sesje 7, 8, 9)

> Dotyczy **tylko RAM i CPU Ionica**. Czasy z sesji 4–6 i zasoby React Native z sesji
> 4–6 zostają bez zmian, nic tam nie ruszasz.
> Wszystkie komendy są rozpisane w całości: kopiujesz i wklejasz blok po bloku,
> od góry do dołu.

---

## Dlaczego to robimy

Od Androida 8 WebView uruchamia **renderer w osobnym procesie**
(`com.google.android.webview:sandboxed_process0:...`). W tym procesie działają silnik JS,
DOM, layout i dekodowanie obrazków, czyli większość pracy Ionica.

Stary `sample-resources.sh` liczył tylko proces `io.ionic.starter`:

- `dumpsys meminfo io.ionic.starter` nie obejmuje renderera,
- `top | grep io.ionic.starter` też go nie łapie, bo renderer ma w nazwie pakiet WebView, a nie aplikacji.

Skutek: **RAM i CPU Ionica były zaniżone**.

## Dlaczego RN nie mierzymy ponownie

React Native nie używa WebView. Cała aplikacja działa w procesie `com.shopreactnative`,
który stary skrypt liczył w całości, więc stary i nowy skrypt mierzą RN tak samo.
System telefonu nie był aktualizowany od 9.09 (sprawdzone w kroku 0.5).

## Co się zmieniło w repo

| Plik | Zmiana |
|---|---|
| `maestro/scripts/sample-resources.sh` | Wersja 2: dolicza renderer WebView należący do aplikacji (RAM + CPU), przypisany przez `dumpsys activity services <pakiet>`, więc renderery innych aplikacji nie są liczone. Nowe kolumny: `pss_main_mb, pss_renderer_mb, cpu_main, cpu_renderer, n_renderer`. Kolumny `pss_mb` i `cpu_percent` to teraz **suma** procesu głównego i renderera. |
| `maestro/scripts/check-resources.sh` | Nowy. Kontrola po sesji: ile próbek i w ilu złapano renderer. |
| `analiza/analiza.py` | Nowa opcja `--sesje-zasoby` (RN z sesji 4–6, Ionic z 7–9). Stare pliki Ionica bez renderera są automatycznie pomijane. |

## Ile to trwa

- Część 0 (jednorazowo): ok. 20 min
- Każda sesja: ok. 25 min (3 przebiegi Ionica z próbkowaniem w tle)
- Przerwy: do ostygnięcia telefonu, zwykle 10–20 min
- **Razem: ok. 1,5–2 h, jednego dnia**

Sesje 4–6 też były jednego dnia (9.09, o 14:24, 17:19 i 21:41), więc to ta sama procedura.

**Między sesjami przerwa do powrotu temperatury do poziomu wyjściowego** (nie na czas):

- w przerwie ekran wyłączony, telefon na kablu, nic na nim nie robisz,
- przed sesją 7 zapisujesz `temperature` baterii, to jest **poziom wyjściowy**,
- sesje 8 i 9 zaczynasz, gdy `Thermal Status` = 0 **i** `temperature` jest najwyżej o 20 (2°C) wyższa niż poziom wyjściowy,
- **zapisujesz godzinę startu i temperaturę baterii** każdej sesji. To dowód do pracy, że warunki były te same.

Podgląd w trakcie przerwy (Ctrl+C, gdy warunek spełniony):

```bash
while true; do echo "$(date +%H:%M) $(adb shell dumpsys thermalservice | grep 'Thermal Status') | $(adb shell dumpsys battery | grep temperature)"; sleep 60; done
```

---

# CZĘŚĆ 0 — Jednorazowo, przed pierwszą sesją

## 0.1 Git i Xcode

Na Macu `git` i `python3` nie działają, dopóki nie zaakceptujesz licencji Xcode:

```bash
sudo xcodebuild -license accept
```

## 0.2 Backend i tunel

Tak samo jak w sesjach 4–6.

**Terminal A:**

```bash
cd /Users/damianzieba/projects/praca-magisterska/praca-magisterska
docker compose -f services-shop-api/docker-compose.yml up -d db
docker ps | grep shop_db

cd services-shop-api
npm run build
NODE_ENV=production LOG_LEVEL=warn TEST_MODE=0 RATE_LIMIT_MAX=100000 npm start
```

⚠️ `NODE_ENV` musi być w powłoce, nie w pliku `.env`. pgAdmin wyłączony.

**Terminal B** (tu robisz całą resztę):

```bash
cd /Users/damianzieba/projects/praca-magisterska/praca-magisterska
adb devices
adb reverse tcp:3000 tcp:3000
adb reverse --list
curl -s localhost:3000/api/services | head -c 80
```

## 0.3 Kopia bazy

```bash
maestro/scripts/backup-db.sh
```

## 0.4 Przebudowa Ionica z etykietą `zasoby`

Przebiegi zasobowe przy okazji wysyłają metryki czasowe do bazy. Jeśli zostawisz obecny
build, podpiszą się jako `ses_06` i zabrudzą ostateczne dane. Z etykietą `zasoby`
usuniesz je potem jedną komendą i nic innego nie ruszysz.

Przebudowujesz **tylko Ionica**. RN nie jest w tych sesjach uruchamiany.

```bash
maestro/scripts/set-run.sh zasoby S3
grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts

cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installRelease) && cd ..
```

`grep` musi pokazać `zasoby` i `S3`. Komunikat `set-run.sh` o `installDebug` i o RN
jest nieaktualny. Używaj komendy powyżej (`installRelease`).

**Otwórz ręcznie Ionica, zaloguj się** (`test@badanie.pl` / `HasloTestowe123`)
**i sprawdź, że widzisz „Katalog usług".**

## 0.5 Czy telefon był aktualizowany — ZROBIONE 11.10

Odczyt z telefonu:

| Co | Wartość | Wniosek |
|---|---|---|
| System (`ro.build.date`) | 6.07.2026, HyperOS `OS3.0.302.0.WGTEUXM` | bez zmian od sesji 4–6 |
| Poprawka bezpieczeństwa | 2026-07-01 | bez zmian od sesji 4–6 |
| WebView (`com.google.android.webview`) | **153.0.8010.57, zaktualizowany 7.10.2026** | zmienił się po sesjach 4–6 |
| React Native — zależność od WebView | brak (`package.json`) | RN aktualizacja WebView nie dotyczy |

**Wniosek: dane RN z sesji 4–6 zostają.** System się nie zmienił, a RN nie używa WebView.

Aktualizacja WebView dotyczy tylko Ionica, którego i tak mierzymy od nowa, już na wersji 153.
W pracy trzeba to jednym zdaniem zaznaczyć: zasoby Ionica zmierzono na WebView 153,
a czasy Ionica (sesje 4–6) na wersji z września. Patrz 2.5.

## 0.6 Test na telefonie — ZROBIONE 11.10

Test zrobiony na Twoim telefonie (Ionic otwarty, katalog):

| | PSS |
|---|---|
| proces główny `io.ionic.starter` (to liczył stary skrypt) | ok. 117 MB |
| renderer WebView Ionica (tego brakowało) | ok. 70–73 MB |
| razem | ok. 187–190 MB |

Przy przewijaniu renderer dokłada też CPU (np. 26,6 % proces główny + 10,0 % renderer).
React Native: 0 rendererów, zgodnie z oczekiwaniem.

Przy okazji wyszło, że na Xiaomi w tle działają **cudze renderery WebView** o identycznej
nazwie (`com.miui.msa.global` — reklamy systemowe, `com.mi.appfinder` — wyszukiwarka).
Wracają same po wyjściu na pulpit. Dlatego skrypt **nie szuka renderera po nazwie
procesu**, tylko pyta system, który renderer należy do `io.ionic.starter`
(`dumpsys activity services io.ionic.starter`). Cudze renderery nie są liczone,
nawet jeśli pojawią się w trakcie przebiegu.

Nic tu nie musisz robić. Jeśli chcesz to zobaczyć sam: otwórz Ionica i wpisz
`maestro/scripts/sample-resources.sh io.ionic.starter IONIC test_S1 20`, potem
`maestro/scripts/check-resources.sh test_S1` (renderer ≈ 100 %) i
`rm data/resources/resources_IONIC_test_S1.csv`.

---

# CZĘŚĆ 1 — Przed każdą sesją

Warunki telefonu jak w sesjach 4–6:

- naładowany do ~100 %, na kablu
- tryb samolotowy **włączony**, WiFi i Bluetooth **wyłączone**
- stała jasność, auto-jasność **wyłączona**, oszczędzanie energii **wyłączone**
- wszystkie aplikacje w tle zamknięte
- **nie dotykasz telefonu w trakcie przebiegu**

Backend (Terminal A) i tunel (Terminal B) jak w 0.2. Jeśli tunel był zamknięty,
ponów `adb reverse tcp:3000 tcp:3000`.

**Kontrola stanu, jeden wklej:**

```bash
date "+%H:%M"
maestro/scripts/kill-apps.sh
# aplikacje systemowe Xiaomi z WebView w tle — mniej szumu w pamięci (skrypt i tak ich nie liczy)
adb shell am force-stop com.mi.appfinder
adb shell am force-stop com.miui.msa.global
adb shell dumpsys thermalservice | grep "Thermal Status"
adb shell dumpsys battery | grep -E "level|temperature"
adb shell settings get global low_power
```

| Odczyt | Musi być |
|---|---|
| `Thermal Status` | **0** |
| `level` | > 30 |
| `temperature` | < 380 |
| `low_power` | **0** |

Godzinę i `temperature` zapisz.

**Zawieszony `Thermal Status: 1` (11.10).** Na tym telefonie status potrafi utknąć na 1
po jednorazowym przegrzaniu (np. przy budowaniu aplikacji), choć telefon dawno ostygł.
Rozpoznasz to po tym, że „Cached temperatures” się nie zmieniają, a prawdziwe są niskie:

```bash
adb shell dumpsys thermalservice | grep -A9 "Current temperatures from HAL" | grep -E "CPU|SKIN|BATTERY"
```

Jeśli SKIN < 40 i CPU < 45, a status stoi na 1, mierz dalej. Sesja 7 była robiona
właśnie tak, więc dla spójności **nie restartuj telefonu przed sesjami 8 i 9**.

### Jak działa każdy blok

Skrypt próbkuje w tle, a Maestro przechodzi scenariusz. Gdy Maestro skończy,
`kill $SAMPLER` zatrzymuje próbkowanie. Liczba sekund (900/1500) to tylko górny
limit bezpieczeństwa.

**Jeśli Maestro się wywali w trakcie,** powtórz ten sam blok od `kill-apps.sh`.

**Każdy blok wklejasz raz, w całości.** Jeśli przerwiesz go Ctrl+C, skrypt próbkujący
zostaje w tle (Ctrl+C nie dochodzi do `kill $SAMPLER`). `kill-apps.sh` na początku
każdego bloku sam go zatrzyma i wypisze `⚠️ Zatrzymano próbkowanie...` — wtedy wiesz,
że poprzedni blok trzeba powtórzyć. (Tak zepsuła się pierwsza sesja 7 — 11.10.)

---

# SESJA 7 (`ses_07r`)

```bash
# ---- S1 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_07r_S1 900 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S2 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_07r_S2 900 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S3 (z zerowaniem zamówień) ----
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_07r_S3 1500 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

**Kontrola i sprzątanie:**

```bash
maestro/scripts/check-resources.sh ses_07r
docker exec shop_db psql -U shop -d services_shop -c "DELETE FROM measurements WHERE \"sessionId\"='zasoby';"
```

`check-resources.sh` musi pokazać **3 pliki IONIC**:

- `renderer` blisko 100% (w S1 trochę mniej, bo między startami aplikacji renderera chwilę nie ma),
- żaden plik nie może być pusty.

Jeśli coś się nie zgadza, powtórz tylko ten jeden blok.

**Teraz przerwa, aż telefon wróci do temperatury wyjściowej.**

---

# SESJA 8 (`ses_08r`) — po ostygnięciu telefonu

Najpierw **CZĘŚĆ 1** (kontrola stanu).

```bash
# ---- S1 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_08r_S1 900 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S2 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_08r_S2 900 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S3 (z zerowaniem zamówień) ----
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_08r_S3 1500 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

**Kontrola i sprzątanie:**

```bash
maestro/scripts/check-resources.sh ses_08r
docker exec shop_db psql -U shop -d services_shop -c "DELETE FROM measurements WHERE \"sessionId\"='zasoby';"
```

**Teraz przerwa, aż telefon wróci do temperatury wyjściowej.**

---

# SESJA 9 (`ses_09r`) — po ostygnięciu telefonu

Najpierw **CZĘŚĆ 1** (kontrola stanu).

```bash
# ---- S1 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_09r_S1 900 &
SAMPLER=$!; maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S2 ----
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_09r_S2 900 &
SAMPLER=$!; maestro test maestro/S2_ui_response.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

```bash
# ---- S3 (z zerowaniem zamówień) ----
maestro/scripts/reset-orders.sh
maestro/scripts/kill-apps.sh
maestro/scripts/sample-resources.sh io.ionic.starter IONIC ses_09r_S3 1500 &
SAMPLER=$!; maestro test maestro/s3_full_path.yaml -e APP_ID=io.ionic.starter --device MJVC5XO7PJDEQ8FI; kill $SAMPLER
```

**Kontrola i sprzątanie:**

```bash
maestro/scripts/check-resources.sh ses_09r
docker exec shop_db psql -U shop -d services_shop -c "DELETE FROM measurements WHERE \"sessionId\"='zasoby';"
```

---

# CZĘŚĆ 2 — Po wszystkich trzech sesjach

## 2.1 Przywrócenie etykiety w kodzie

Żeby w repo nie została etykieta `zasoby` (bez przebudowy, chodzi tylko o kod):

```bash
maestro/scripts/set-run.sh ses_06 S3
```

## 2.2 Stare pliki Ionica do archiwum

Nie kasujemy ich. Posłużą do porównania: proces główny Ionica w v2 powinien wyjść
podobnie jak w v1. To pokaże, że stanowisko się nie zmieniło, a różnica to faktycznie
renderer. Pliki RN zostają na miejscu, bo nadal są używane.

```bash
mkdir -p data/archiwum-zasoby-v1
mv data/resources/resources_IONIC_ses_0[4-6]r_*.csv data/resources/resources_ionic_ses_0[1-3]_*.csv data/archiwum-zasoby-v1/
ls data/resources/
```

W `data/resources/` mają zostać:

- 9 plików `resources_IONIC_ses_0[7-9]r_*` (nowe),
- 9 plików `resources_REACT_NATIVE_ses_0[4-6]r_*`,
- 3 pliki pilotażowe RN `resources_react-native_ses_0[1-3]_*` (analiza je pomija przez filtr sesji).

## 2.3 Analiza

```bash
maestro/scripts/backup-db.sh
.venv/bin/python analiza/analiza.py --sesje ses_04 ses_05 ses_06 --sesje-zasoby ses_04 ses_05 ses_06 ses_07 ses_08 ses_09
```

Czasy wyjdą identyczne jak dotychczas. Zmieni się tylko tabela ZASOBY: RN z sesji 4–6,
Ionic z sesji 7–9.

## 2.4 Commit

```bash
git add maestro/scripts analiza INSTRUKCJA_ZASOBY_V2.md data/resources data/archiwum-zasoby-v1 data/analiza data/db-backups
git commit -m "chore(data): remeasure Ionic resources with WebView renderer (ses_07r-09r)"
```

## 2.5 Daj mi znać

Napisz, że skończone, i wklej:

- godziny i temperatury z każdej sesji.

Wtedy:

- policzę mediany per sesja (opis jak w §8.4 `OPIS_STANOWISKA.md`, bez pseudoreplikacji),
- porównam proces główny Ionica v1 vs v2,
- zaktualizuję `OPIS_STANOWISKA.md` (skrypt, wersja WebView, nowe wyniki),
- wypiszę, co zmienić w pracy: H1.3, H1.4, rozdziały 3.2, 3.4, Zakończenie oraz opis
  metody pomiaru zasobów (proces główny + renderer WebView; RN z pierwotnych sesji,
  bo nie używa WebView, a brak aktualizacji systemu potwierdzono).

Wyniki mogą się odwrócić, tzn. RN może wyjść lepiej w RAM lub CPU. To normalny
wynik badania i dobrze się broni, bo metoda jest teraz poprawna i opisana.
