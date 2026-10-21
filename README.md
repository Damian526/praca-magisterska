# Porównanie wydajności React Native i Ionic — stanowisko badawcze

Repozytorium do pracy magisterskiej. Zawiera dwie implementacje tej samej aplikacji
mobilnej (sklep z usługami): **React Native** i **Ionic (Capacitor)**, wspólny backend,
scenariusze automatyzacji, skrypty pomiarowe, zebrane dane i skrypt analizy.

Porównywane są czasy (uruchomienie, reakcja interfejsu, żądania do API, renderowanie)
oraz zużycie zasobów (RAM jako PSS, CPU) w trzech scenariuszach:

| Scenariusz | Flow Maestro | Opis |
|---|---|---|
| S1 | `maestro/S1_startup.yaml` | 30 zimnych uruchomień aplikacji |
| S2 | `maestro/S2_ui_response.yaml` | reakcja interfejsu, 30 iteracji |
| S3 | `maestro/s3_full_path.yaml` | pełna ścieżka zakupowa, 30 iteracji |

Szczegółowy opis stanowiska, metod pomiaru, wykrytych zagrożeń i wyników:
**[OPIS_STANOWISKA.md](OPIS_STANOWISKA.md)**.

## Struktura

```
shop-react-native/      aplikacja React Native 0.87
shop-ionic/             aplikacja Ionic React 8.8 + Capacitor 8.5
services-shop-api/      backend: Fastify 5, Prisma 7, PostgreSQL 16 (docker-compose)
maestro/                scenariusze S1–S3 (Maestro)
maestro/scripts/        skrypty pomocnicze: konfiguracja serii, próbkowanie zasobów,
                        eksport pomiarów, kopia bazy, zerowanie zamówień
analiza/analiza.py      analiza statystyczna (mediany, Shapiro-Wilk, Mann-Whitney)
analiza/weryfikacja_hipotez.py  weryfikacja hipotez w wersji do pracy (30 prób, wzory z wykładu)
data/                   zebrane dane i wyniki analizy (opis niżej)
OPIS_STANOWISKA.md      opis stanowiska i wyników
INSTRUKCJA_*.md         procedury pomiarowe poszczególnych etapów (opis niżej)
```

## Sesje pomiarowe

| Sesje | Data | Zakres | Status |
|---|---|---|---|
| 1–3 | 7–8.09.2026 | pilotaż | archiwum: wykryte wady stanowiska (OPIS_STANOWISKA.md §7) |
| 4–6 | 9.09.2026 | czasy obu platform, zasoby obu platform | czasy i zasoby RN: **wyniki końcowe**; zasoby Ionic: zastąpione |
| 7–9 | 11.10.2026 | zasoby Ionic, z procesem renderera WebView | **wyniki końcowe** dla zasobów Ionic |

Sesje 7–9 powtarzają wyłącznie pomiar zasobów Ionica. Pierwotny skrypt próbkujący
nie uwzględniał procesu renderera WebView (OPIS_STANOWISKA.md §10).

Procedury:

- `INSTRUKCJA_BADAN.md`: sesje 1–3 (archiwalna),
- `INSTRUKCJA_SES_04_06.md`: sesje 4–6,
- `INSTRUKCJA_ZASOBY_V2.md`: sesje 7–9.

## Dane

| Katalog | Zawartość |
|---|---|
| `data/metrics/` | pomiary czasów wysłane przez aplikacje (eksport z bazy), `metrics_ses_XX.csv` |
| `data/resources/` | próbki RAM/CPU: RN z sesji 4–6, Ionic z sesji 7–9 (+ pilotaż RN) |
| `data/archiwum-zasoby-v1/` | zasoby Ionic z sesji 1–6, bez renderera WebView, tylko do porównań |
| `data/archiwum-pilotaz/` | surowe dane i kopie bazy z pilotażu |
| `data/startup-os/` | czas uruchomienia mierzony przez system (`am start -W`) |
| `data/db-backups/` | kopie tabeli `measurements` (pg_dump) |
| `data/analiza/finalne/` | **tabele końcowe** użyte w pracy |
| `data/analiza/pilotaz/` | tabele z pilotażu |

## Odtworzenie analizy

Wymagania: Python 3.9+, `numpy`, `scipy` (użyte: numpy 2.0.2, scipy 1.13.1).

```bash
python3 -m venv .venv
.venv/bin/pip install numpy scipy

.venv/bin/python analiza/analiza.py \
  --sesje ses_04 ses_05 ses_06 \
  --sesje-zasoby ses_04 ses_05 ses_06 ses_07 ses_08 ses_09
```

Wyniki trafiają do `data/analiza/` (`czasy.csv`, `zasoby.csv`, `zgodnosc_sesji.csv`,
`odstajace.csv`) i są identyczne z plikami w `data/analiza/finalne/`.

## Weryfikacja hipotez (wersja do pracy)

```bash
.venv/bin/python analiza/weryfikacja_hipotez.py
```

Każda z czterech hipotez dostaje tabelę 30 surowych prób: czasy i zasoby RN z `ses_04`, zasoby
Ionica z `ses_07`. Na tej tabeli skrypt liczy średnią i współczynnik zmienności V, a potem przeprowadza
procedurę weryfikacyjną według wzorów z wykładu. Najpierw Shapiro-Wilk (współczynniki a_i z tablicy).
Jeśli obie grupy mają rozkład normalny, dochodzi Levene liczony z medianą, a dalej t-Studenta albo
U Manna-Whitneya. Wartości krytyczne pochodzą z tablic.

Sposób wyboru prób:

- czas uruchamiania: 30 zimnych startów z S1;
- czas reakcji: 5 rodzajów działań × 6 prób (iteracje 1, 6, 11, 16, 21, 26);
- RAM i CPU: 3 scenariusze × 10 prób, gdzie próba to średnia z odczytów z kolejnej 1/10 czasu przebiegu.

Wyniki są w `data/analiza/hipotezy/`:

| Plik | Zawartość |
|---|---|
| `tab_1…tab_4_*.csv` | tabele surowych prób (separator `;`, przecinek dziesiętny) |
| `ilosciowa.csv` | średnia, odchylenie standardowe, V, ocena stabilności |
| `wyniki_weryfikacji.txt` | gotowe zdania do pracy: analiza ilościowa, statystyczna i wnioski |

`--sesja ses_05` albo `--sesja ses_06` (zasoby Ionica z `ses_08` / `ses_09`) zapisuje wyniki do
`kontrola_ses_XX/`. Te wyniki służą tylko do sprawdzenia, czy się powtarzają.

## Uruchomienie stanowiska

Urządzenie testowe: Xiaomi Redmi Note 14 (2409BRN2CY), Android 16, połączone przez USB.
Wymagane: Node.js, Docker, Android SDK (`adb`), Maestro.

```bash
# 1. baza i backend
docker compose -f services-shop-api/docker-compose.yml up -d db
cd services-shop-api && npm install && npm run build
NODE_ENV=production LOG_LEVEL=warn TEST_MODE=0 RATE_LIMIT_MAX=100000 npm start

# 2. tunel do backendu (aplikacje łączą się z http://localhost:3000)
adb reverse tcp:3000 tcp:3000

# 3. oznaczenie serii pomiarowej i budowa aplikacji (wariant release)
maestro/scripts/set-run.sh ses_04 S1
cd shop-react-native && npm install && npx react-native run-android --mode=release && cd ..
cd shop-ionic && npm install && npm run build && npx cap sync android \
  && (cd android && ./gradlew installRelease) && cd ..

# 4. pomiar, np. S1 dla Ionica
maestro/scripts/kill-apps.sh
maestro test maestro/S1_startup.yaml -e APP_ID=io.ionic.starter
```

Plik `services-shop-api/.env` (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_TOKEN` i in.)
nie jest częścią repozytorium. Pełna procedura, łącznie z kontrolą stanu urządzenia
i pomiarem zasobów, jest w plikach `INSTRUKCJA_*.md`.
