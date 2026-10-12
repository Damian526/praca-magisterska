# Opis stanowiska pomiarowego — materiał do rozdziałów 2.4.1.2 i 2.4.1.3

Dokument zebrany z repozytorium. Wszystkie wersje i zachowania odczytane
z plików konfiguracyjnych, kodu i realnych danych pomiarowych, nie z pamięci.

> **Status: kampania zamknięta.** Sesje 1–3 to pilotaż (§7 opisuje wykryte w nim wady),
> sesje 4–6 to badanie właściwe na poprawionym stanowisku, w pełni zebrane i policzone
> (§8). Rozdziały 2.4.1.2/2.4.1.3 pracy powinny opisywać stanowisko **po** poprawkach —
> odniesienia do stanu pilotażowego są oznaczone wprost.

---

## 1. Środowisko (2.4.1.2)

### Urządzenie testowe

Odczytane z kolumn `device_model`, `os_version`, `build_type` w `data/metrics/metrics_ses_03.csv`
— czyli zapisane przez samą aplikację przy każdym pomiarze, nie deklarowane ręcznie:

| Parametr | Wartość |
|---|---|
| Model | `2409BRN2CY` (Xiaomi Redmi Note 14) |
| System | Android 16 |
| Typ builda | RELEASE (obie aplikacje) |
| Wersja aplikacji | 1.0.0 (obie) |
| Liczba rdzeni CPU | 8 (`800%cpu` w nagłówku `top`) |
| RAM urządzenia | 7 848 716 kB (≈7,5 GiB) |
| Połączenie z hostem | USB, `adb reverse tcp:3000 tcp:3000` |

Aplikacje łączą się z API pod adresem `http://localhost:3000`, przekierowanym przez
`adb reverse` na host. Wybrano to zamiast adresu IP w sieci WiFi, bo adres IP laptopa
zmienia się między sesjami, a WiFi wnosi zmienny narzut sieciowy do `API_REQUEST_MS`.

### Stos technologiczny — aplikacje mobilne

| | React Native | Ionic |
|---|---|---|
| Framework | `react-native` 0.87.0 | `@ionic/react` 8.8.19 |
| Warstwa natywna | — | `@capacitor/core` / `@capacitor/android` 8.5.0 |
| React | 19.2.3 | 19.0.0 |
| Routing | `@react-navigation/native` 7.3.16 | `@ionic/react-router` 8.8.19 + `react-router` 5.3.4 |
| Identyfikator pakietu | `com.shopreactnative` | `io.ionic.starter` |

> **Uwaga do opisania w pracy:** wersje React różnią się między aplikacjami
> (19.2.3 vs 19.0.0). Różnica jest patchowa, ale skoro praca porównuje technologie,
> warto ją odnotować jako drobne odstępstwo od pełnej równoważności środowisk.

### Stos technologiczny — backend

| Składnik | Wersja |
|---|---|
| Node.js | v24.16.0 |
| Fastify | ^5.11.0 |
| Prisma (ORM + klient) | ^7.9.1, adapter `@prisma/adapter-pg` |
| PostgreSQL | `postgres:16.4-alpine` (wersja przypięta, nigdy `:latest`) |
| TypeScript | ^7.0.2 |
| Walidacja schematów | TypeBox ^0.34.52 |

### Narzędzia pomiarowe

| Narzędzie | Wersja | Rola |
|---|---|---|
| Maestro | 2.9.0 | automatyzacja scenariuszy UI (deterministyczna kolejność kroków) |
| adb (platform-tools) | Android SDK | `dumpsys meminfo`, `top`, `am start -W` |
| JDK | OpenJDK 17.0.19 | budowanie aplikacji Android |
| Python + SciPy | 3.9 + venv | analiza statystyczna (`analiza/analiza.py`) |

### Strojenie bazy danych pod powtarzalność

`services-shop-api/docker-compose.yml` — kontener bazy jest skonfigurowany
**pod powtarzalność pomiaru, nie pod maksymalną wydajność**:

| Ustawienie | Wartość | Uzasadnienie |
|---|---|---|
| `shared_buffers` | 512 MB | cały zbiór 500 usług mieści się w pamięci → brak I/O dysku przy odczytach → mniejszy rozrzut czasów |
| `effective_cache_size` | 1536 MB | jw. |
| `work_mem` | 16 MB | |
| `max_connections` | 50 | |
| `autovacuum_naptime` | 3600 s | autovacuum uśpiony na godzinę, żeby nie odpalił się w środku serii 30 powtórzeń; `VACUUM ANALYZE` wykonywany ręcznie między seriami |
| `log_statement` | none | brak narzutu I/O na logi |
| `synchronous_commit` | off | zapis do WAL bez czekania na fsync — usuwa największe źródło skoków czasu przy `POST /api/orders` |
| `TZ` / `PGTZ` | UTC | strefa czasowa brała udział w przesuwaniu znaczników czasu |
| `mem_limit` / `cpus` | 2 GB / 2.0 | kontener dostaje zawsze tyle samo zasobów, niezależnie od obciążenia laptopa |

Kompromis do uczciwego opisania: `synchronous_commit=off` oznacza ryzyko utraty
kilku ostatnich transakcji przy nagłym padzie procesu — bez znaczenia dla stanowiska
badawczego, ale wymaga uzasadnienia w pracy.

**Backend podczas pomiarów działa natywnie (`node`), nie w kontenerze.** Usługa `api`
w `docker-compose.yml` ma profil `full` i służy wyłącznie demonstracji konteneryzacji.
Kontenerowana jest tylko baza danych. `pgadmin` (profil `tools`) musi być wyłączony
na czas pomiarów, bo odpytuje bazę w tle.

---

## 2. Jak powstaje `metrics_ses_*.csv` (2.4.1.3)

Kluczowa rzecz do opisania: **to nie jest jeden skrypt.** Plik CSV jest końcem
czteroetapowego łańcucha:

```
  [1] instrumentacja w kodzie aplikacji  (pomiar czasu na urządzeniu)
        ↓  bufor w pamięci aplikacji
  [2] POST /api/metrics/batch            (wysyłka paczki, wyzwalana przyciskiem "btn-flush")
        ↓
  [3] PostgreSQL, tabela `measurements`  (nadanie numeru iteracji, trwały zapis)
        ↓
  [4] GET /api/metrics/export.csv        (eksport przez export-metrics.sh)
        ↓
      data/metrics/metrics_ses_NN.csv
```

### Etap 2 — przyjęcie paczki pomiarów

`services-shop-api/src/modules/metrics/metrics.routes.ts`

Endpoint `POST /batch`, chroniony nagłówkiem `X-Admin-Token` (hook `requireAdminToken`
obowiązuje cały moduł dzięki enkapsulacji pluginów Fastify).

**Numer iteracji nadaje serwer, nie aplikacja** — przez policzenie wierszy już
zapisanych w danej serii (`sessionId` + `runId` + `platform` + `scenario` + `metric`):

```ts
const n = await app.prisma.measurement.count({
  where: { sessionId: b.sessionId, runId: b.runId,
           platform: PLATFORM[b.platform], scenario: b.scenario,
           metric: METRIC[m.metric] },
});
```

To istotny szczegół metodologiczny: `runId` jest stały przez całą serię, więc
**numeracja iteracji przeżywa restarty aplikacji** — a w scenariuszu S1 aplikacja
jest ubijana i uruchamiana ponownie 30 razy.

Kontrakt API używa czytelnych nazw (`react-native`, `startup_ms`), baza — enumów
PostgreSQL (`REACT_NATIVE`, `STARTUP_MS`); mapowanie w jednym miejscu na górze pliku.

### Etap 3 — schemat tabeli `measurements`

`services-shop-api/prisma/schema.prisma`, model `Measurement`:

| Kolumna | Typ | Znaczenie |
|---|---|---|
| `sessionId` | varchar(32) | seria pomiarowa (`ses_01`…`ses_03`) |
| `runId` | varchar(64) | `${sessionId}_${scenario}` |
| `platform` | enum | `REACT_NATIVE` / `IONIC` |
| `scenario` | enum | `S1` / `S2` / `S3` |
| `metric` | enum | typ metryki |
| `iteration` | int | numer powtórzenia (nadany przez serwer) |
| `value` / `unit` | double / varchar(8) | zmierzona wartość |
| `serverMs` | double | czas przetwarzania po stronie serwera (patrz niżej) |
| `deviceModel`, `osVersion`, `buildType`, `appVersion` | | metadane zapisywane przez aplikację |
| `recordedAtMs` | bigint | znacznik czasu pomiaru na urządzeniu (ms) |
| `createdAt` | timestamptz | moment zapisu w bazie |

Indeks: `(sessionId, platform, scenario, metric)`.

Historia migracji (3 migracje) jest w `services-shop-api/prisma/migrations/`
i dokumentuje ewolucję schematu — m.in. `scenariusz_jako_wlasnosc_serii`
oraz `usun_kolumne_recordedat`.

### `serverMs` — rozdzielenie czasu serwera od czasu klienta

`services-shop-api/src/plugins/serverTiming.ts`

Serwer mierzy własny czas obsługi żądania zegarem monotonicznym o rozdzielczości
nanosekundowej (`process.hrtime.bigint()`) i zwraca go w nagłówku `Server-Timing`:

```ts
app.addHook("onRequest", async (request) => {
  request.startHrTime = process.hrtime.bigint();
});
app.addHook("onSend", async (request, reply, payload) => {
  const elapsedMs = Number(process.hrtime.bigint() - request.startHrTime) / 1_000_000;
  reply.header("Server-Timing", `app;dur=${elapsedMs.toFixed(3)}`);
  reply.header("Access-Control-Expose-Headers", "Server-Timing");
  return payload;
});
```

Dzięki temu `API_REQUEST_MS` (czas mierzony na urządzeniu) można zestawić z `serverMs`
i pokazać, jaka część opóźnienia powstaje po stronie backendu, a jaka w warstwie
klienckiej. Nagłówek `Access-Control-Expose-Headers` jest konieczny, bo w Ioniku
(WebView) przeglądarka domyślnie ukrywa niestandardowe nagłówki przed kodem JS —
bez niego Ionic nie mógłby odczytać `Server-Timing`, a RN mógłby. To realna pułapka
porównywalności, którą warto w pracy odnotować.

### Etap 4 — eksport do CSV

`GET /api/metrics/export.csv?sessionId=…`, wywoływany przez
`maestro/scripts/export-metrics.sh`. Kolumny:

```
session_id, run_id, platform, device_model, os_version, build_type, app_version,
scenario, metric, iteration, value, unit, server_ms, recorded_at_ms, recorded_at_utc
```

Sortowanie: `sessionId → platform → scenario → metric → iteration`.

Moduł udostępnia też `GET /summary` (statystyki opisowe liczone po stronie serwera)
oraz `DELETE /run/:runId` i `DELETE /session/:sessionId` do usuwania nieudanych serii.

---

## 2b. Co dokładnie mierzy każda metryka

Instrumentacja żyje w `src/core/measure.ts` — plik jest **praktycznie identyczny**
w obu aplikacjach (różnice: `__DEV__` vs `import.meta.env.DEV`, drobiazg w `now()`,
jeden komentarz). `src/core/api.ts` jest bajt w bajt identyczny.

Wspólne zasady:

- Wszystkie delty czasowe liczone są zegarem **`performance.now()`**; `Date.now()`
  służy wyłącznie jako `recordedAtMs` (znacznik zapisu próbki).
- „Po narysowaniu klatki" realizuje `afterPaint` = **podwójny `requestAnimationFrame`**.
- `record()` **tylko dopisuje do tablicy w pamięci — żadnego I/O w ścieżce pomiarowej**
  (komentarz w kodzie: „TYLKO zapis do pamięci. ŻADNEJ SIECI"). Bufor nie jest
  persystowany, więc restart aplikacji kasuje niewysłane próbki — stąd flush
  po każdej iteracji w S1.
- `flush()` wysyła jedną paczkę `POST /api/metrics/batch`. Brak retry, backoffu
  i auto-flushu; przy błędzie bufor nie jest czyszczony, etykieta „Wysłano"
  się nie pojawia i Maestro przerywa przebieg na `assertVisible`.

| Metryka | Start pomiaru | Koniec pomiaru | Uwagi |
|---|---|---|---|
| `STARTUP_MS` | `globalThis.__APP_START__` ustawiane w punkcie wejścia | pierwsza udana odpowiedź `GET /api/services?page=1`, po `afterPaint` | **przedziały nie są równoważne — patrz rozdz. 7** |
| `UI_RESPONSE_MS` | dotknięcie pozycji listy w katalogu | `afterPaint` po ustawieniu danych detalu | zawiera sieć; rozbicie w `extra.apiMs` / `extra.renderMs` |
| `REQUEST_BUILD_MS` | dotknięcie „Złóż zamówienie" | zbudowanie obiektu żądania | **nie obejmuje serializacji** — `JSON.stringify` dzieje się dopiero w `api.ts` |
| `API_REQUEST_MS` | po zbudowaniu żądania | po odebraniu **i sparsowaniu** odpowiedzi (`await res.json()`) | szersze niż `extra.totalMs`, które obejmuje sam `fetch` |
| `RENDER_CHECKOUT_MS` | odebranie odpowiedzi `POST /api/orders` | `afterPaint` | de facto mierzy przejście na ekran zamówień — `navigation.replace` leci w tym samym ticku; tak samo w obu apkach |
| `RENDER_ORDERS_MS` | moment sparsowania danych zamówień | `afterPaint` | czas API wyłączony z pomiaru, trafia do `extra.apiMs` |

Pomiar startu ma niezależną kontrolę systemową: `measure-startup.sh` (`am start -W`),
niezależną od instrumentacji w kodzie.

---

## 3. Scenariusze pomiarowe (Maestro)

Katalog `maestro/`. Wszystkie trzy scenariusze wykonują **30 powtórzeń**
i kończą się wysłaniem bufora metryk (`btn-flush`, potwierdzone `assertVisible: "Wysłano"`).

### S1 — start aplikacji (`S1_startup.yaml`)

```yaml
- repeat:
    times: 30
    commands:
      - stopApp
      - launchApp
      - assertVisible: "Katalog usług"
      - waitForAnimationToEnd
      - tapOn: { id: "btn-flush" }
```

Mierzy **zimny start**: aplikacja jest za każdym razem ubijana (`stopApp`)
i uruchamiana od nowa. Flush następuje po **każdej** iteracji — inaczej bufor
zginąłby razem z ubijanym procesem. To wyjaśnia, dlaczego `STARTUP_MS` ma
30 powtórzeń w S1, a w S2 i S3 tylko jedno (pojedynczy start na cały przebieg).

### S2 — reakcja interfejsu (`S2_ui_response.yaml`)

30 × wejście w szczegóły usługi (`service-item-5`) → powrót do katalogu.
Mierzy `UI_RESPONSE_MS`. Jeden `launchApp` na cały przebieg, flush na końcu.

### S3 — pełna ścieżka zakupowa (`s3_full_path.yaml`)

30 × pełna ścieżka: przewinięcie do `service-item-25` → szczegóły → dodanie
do koszyka → przejście do zamówienia → złożenie zamówienia → historia zamówień
→ trzykrotny powrót do katalogu. Mierzy `API_REQUEST_MS`, `REQUEST_BUILD_MS`,
`RENDER_CHECKOUT_MS`, `RENDER_ORDERS_MS` i `UI_RESPONSE_MS`.

Element `service-item-25` wymaga przewinięcia listy, `service-item-5` nie —
to celowa różnica obciążenia między S2 a S3.

---

## 4. Skrypty pomocnicze (`maestro/scripts/`)

### `set-run.sh <sessionId> <S1|S2|S3>`

Ustawia `SESSION_ID` i `SCENARIO` jednocześnie w `src/core/config.ts` **obu** aplikacji
(przez `perl -pi -e`, zachowując rodzaj cudzysłowu — RN pisze apostrofami, Ionic
cudzysłowami, a mieszanka wywala formatter). Konfiguracja jest **wkompilowana
w aplikację**, więc po każdej zmianie wymagana jest przebudowa obu aplikacji —
skrypt sam o tym przypomina i wypisuje komendy. Zła wartość po cichu podpisałaby
cały przebieg złym scenariuszem, stąd jawna walidacja argumentów.

### `sample-resources.sh <pakiet> <platforma> <runId> <sekundy>`

> ⚠️ Poniżej wersja 1 (sesje 1–6), która **nie liczyła renderera WebView**. Od 11.10
> obowiązuje wersja 2 — patrz §10.2.

Zbiera zużycie zasobów, próbkując z zewnątrz przez adb — **nie ingeruje w kod aplikacji**:

```bash
PSS=$(adb shell dumpsys meminfo "$PKG" | grep "TOTAL PSS" | awk '{print $3}')
[ -z "$PSS" ] && PSS=$(adb shell dumpsys meminfo "$PKG" | grep -m1 "TOTAL" | awk '{print $2}')
CPU=$(adb shell top -b -n 1 | grep "$PKG" | head -1 | awk '{print $9}')
[ -n "$PSS" ] && echo "$(date +%s),$PLATFORM,$RUN_ID,$(echo "scale=2; $PSS/1024" | bc),${CPU:-0}" >> "$OUT"
sleep 0.5
```

Wyjście: `data/resources/resources_<platforma>_<runId>.csv`, kolumny
`timestamp, platform, run_id, pss_mb, cpu_percent`.

Szczegóły istotne dla rzetelności opisu:

- **RAM** to `TOTAL PSS` z `dumpsys meminfo` (Proportional Set Size — pamięć
  współdzielona liczona proporcjonalnie), przeliczony z kB na MB.
- **CPU** to kolumna 9 wyjścia `top -b -n 1`, czyli `%CPU`. Zweryfikowane
  na urządzeniu — nagłówek `top` to
  `PID USER PR NI VIRT RES SHR S [%CPU] %MEM TIME+ ARGS`.
- Urządzenie ma 8 rdzeni, więc `%CPU` **może przekraczać 100%** (np. 166% ≈ 1,66 rdzenia).
  W pracy trzeba zadeklarować, czy podaje się „% jednego rdzenia", czy dzieli przez 8.
- Skrypt zapisuje `0` (bez części dziesiętnej), gdy nie znalazł procesu w `top`,
  a `0.0`, gdy `top` zwrócił realne zero — to pozwala odróżnić brak odczytu
  od zmierzonej bezczynności. W danych pilotażowych na 1634 próbki tylko jeden
  wiersz był brakiem odczytu.
- Interwał `sleep 0.5` to interwał **między** odczytami; dwa wywołania `adb` zajmują
  dodatkowy czas, więc realna częstotliwość próbkowania jest nieco niższa niż 2 Hz.

**Pomiary zasobowe wykonywane są w przebiegach oddzielnych od pomiarów czasowych.**
Uzasadnienie do pracy: `dumpsys meminfo` i `top` co pół sekundy obciążają urządzenie,
więc próbkowanie równoległe z pomiarem czasów wprowadzałoby efekt obserwatora
do metryk głównych.

### `measure-startup.sh <pakiet> <platforma> [powtórzeń]`

Niezależna **kontrola** dla `STARTUP_MS`: czas startu mierzony przez sam system Android
(`am start -W`), a nie przez kod aplikacji. Zapisuje `this_time_ms`, `total_time_ms`,
`wait_time_ms` do `data/startup-os/startup_os_<platforma>.csv`.

Wartość metodologiczna: pozwala zweryfikować pomiar wewnętrzny aplikacji miarą
zewnętrzną, niezależną od instrumentacji. Skrypt przerywa pracę przy pustym odczycie
zamiast dopisać niekompletny wiersz.

### `reset-orders.sh`

Czyści `order_items` i `orders`. **Uruchamiany przed każdym przebiegiem S3.**
Uzasadnienie zapisane w samym skrypcie: S3 tworzy 30 zamówień na przebieg,
a ekran historii renderuje to, co zastanie — bez zerowania druga platforma
renderowałaby dłuższą listę niż pierwsza i `RENDER_ORDERS_MS` przestałby być
porównywalny.

### `export-metrics.sh [sessionId]` i `backup-db.sh`

Eksport serii do CSV oraz zrzut tabeli `measurements` przez `pg_dump`
do `data/db-backups/`.

---

## 5. Analiza (`analiza/analiza.py`)

Skrypt liczy wszystkie tabele rozdziału 3 z jednego miejsca — czasy i zasoby:

- statystyki opisowe: mediana, kwartyle, p95, średnia,
- test normalności Shapiro-Wilka (uzasadnienie doboru testu nieparametrycznego),
- test U Manna-Whitneya,
- **siłę efektu** (korelacja rangowo-biserialna) — bez niej przy n=90 każda różnica
  wychodzi „istotna" i nie widać, czy jest praktycznie ważna,
- porównanie median **między sesjami** (powtarzalność międzysesyjna),
- raport wartości odstających metodą MAD, jednostronnie w górę (pomiar szybszy
  od mediany nie jest artefaktem i nie ma podstaw go wykluczać).

Wyniki trafiają do `data/analiza/*.csv`. Tryb `--bez-odstajacych` pozwala policzyć
wariant z odrzuceniem zakłóceń, żeby udokumentować w pracy wpływ tej decyzji.

---

## 6. Zebrane dane

| Zbiór | Zakres | Rola w pracy |
|---|---|---|
| `data/metrics/metrics_ses_01..03.csv` | 3 sesje × 2 platformy × 3 scenariusze, 1272 pomiary | **pilotaż** — rozdział 2 (dowód wad + koszt ich usunięcia) |
| `data/metrics/metrics_ses_04..06.csv` | 3 sesje × 2 platformy × 3 scenariusze, 1272 pomiary | **badanie właściwe** — rozdział 3 (wszystkie liczby, testy) |
| `data/resources/resources_*_ses_0{1,2,3}r_S3_*.csv` | zasoby tylko dla S3, pilotaż | pilotaż |
| `data/resources/resources_*_ses_0{4,5,6}r_S{1,2,3}_*.csv` | zasoby dla **wszystkich trzech scenariuszy**, badanie właściwe | rozdział 3, H1.3/H1.4 |
| `data/startup-os/startup_os_*.csv` | kontrolny pomiar startu przez `am start -W` | nieużyty — puste pliki, patrz §8 |
| `data/db-backups/*.sql` | zrzuty tabeli `measurements` po każdej sesji | ślad audytowy |
| `data/archiwum-pilotaz/` | dane z jeszcze wcześniejszego etapu (poprzedni schemat `run_id`) | tło historyczne |
| `analiza/analiza.py` + `data/analiza/*.csv` | policzone tabele: czasy, zasoby, zgodność sesji, odstające | gotowe do cytowania w rozdziale 3 |

**Nazwy sesji w danych i w tekście pracy nie muszą się pokrywać.** W repozytorium
i we wszystkich plikach zostają `ses_01`…`ses_06` (zmiana numeracji z tyłu byłaby
źródłem pomyłek). W tekście pracy dopuszczalne — i zalecane — jest nazywanie badania
właściwego „sesja 1/2/3", z jednym zdaniem mapującym w metodyce:

> Badanie właściwe objęło trzy sesje pomiarowe (w danych źródłowych: `ses_04`–`ses_06`),
> poprzedzone trzema sesjami pilotażowymi (`ses_01`–`ses_03`).

Kolejność bloków w sesji nie jest sekwencyjna „cała platforma po całej platformie" —
scenariusze wykonywane są naprzemiennie, a kolejność platform różni się między sesjami,
kontynuując wzorzec z pilotażu:

| Sesja | S1 | S2 | S3 |
|---|---|---|---|
| ses_04 | Ionic→RN | RN→Ionic | Ionic→RN |
| ses_05 | RN→Ionic | Ionic→RN | RN→Ionic |
| ses_06 | Ionic→RN | RN→Ionic | Ionic→RN |

Element przeciwdziałania dryfowi czasowemu — do opisania w metodyce.

---

## 7. Zagrożenia dla porównywalności — do rozdziału 3.4

Ustalenia z analizy kodu, **każde zweryfikowane niezależnie** w zbudowanym bundlu,
konfiguracji Gradle albo w samych danych pomiarowych. Uporządkowane wg wagi.

### 7.1. `STARTUP_MS` nie mierzy tego samego przedziału w obu aplikacjach

Kotwica czasu jest ustawiana w punkcie wejścia obu aplikacji, ale mechanizm ładowania
modułów jest inny:

- **React Native** (`index.js`) używa `require()` — wywołania **czasu wykonania**.
  Kotwica powstaje *przed* załadowaniem `react-native` i drzewa modułów aplikacji,
  więc `STARTUP_MS` **zawiera** koszt ich ewaluacji.
- **Ionic** (`main.tsx`) używa `import` — deklaracji ESM, które są **hoistowane**.
  Cały graf modułów (React, `@ionic/react`, router, ekrany, CSS) wykonuje się
  *przed* przypisaniem kotwicy.

Dowód w zbudowanym bundlu `shop-ionic/dist/assets/index-CwmjOq6d.js`: przypisanie
`__APP_START__` leży na pozycji **1 301 752 z 1 311 081 znaków — na 99,3 % pliku**.
Ionic startuje stoper dopiero po przetworzeniu ~1,3 MB kodu frameworka.

**Skutek w pilotażu:** różnica median w S1 (RN 592,7 ms vs Ionic 581,2 ms) była
nieinterpretowalna jako przewaga którejkolwiek technologii — obciążenie systematyczne
działało na korzyść Ionica, nieznanej wielkości.

**NAPRAWIONE i przemierzone (opcja „c" z pierwotnej listy wyboru).** Dodano
`shop-ionic/src/anchor.ts` — moduł bez importów, importowany jako **pierwsza** linia
`main.tsx`:

```ts
// shop-ionic/src/anchor.ts
globalThis.__APP_START__ = globalThis.performance?.now() ?? Date.now()
```
```ts
// shop-ionic/src/main.tsx
import './anchor'   // ⚠️ MUSI zostać pierwszym importem
import React from 'react'
```

Zweryfikowane w zbudowanym bundlu: przypisanie `__APP_START__` przesunęło się
z **99,3 %** pliku na **0,14 %** (`shop-ionic/dist/assets/index-DixwKF3A.js`,
pozycja 1829 z 1 311 104 znaków).

**Wynik pomiaru po naprawie (S1, `STARTUP_MS`, sesje 4–6, n=90):**

```
React Native   572,4 ms (mediana)
Ionic          454,1 ms (mediana)      p<0,001, efekt r=1,0 (duża, rozkłady się nie nakładają)
```

Przewidywanie sprzed pomiaru było błędne — spodziewano się, że Ionic **pogorszy się**
po doliczeniu ewaluacji bundla. Wyszło odwrotnie, bo jednocześnie naprawiono §7.3
(build debug → release), a efekt zmiany wariantu kompilacji okazał się większy niż
koszt ewaluacji bundla. Obu efektów nie da się rozdzielić z tych danych — zmieniły się
naraz — więc w pracy należy opisać wynik jako **łączny efekt obu poprawek**, a nie
przypisywać liczbę jednej przyczynie.

Uwaga dodatkowa: żadna z kotwic nie obejmuje startu procesu Androida ani inicjalizacji
natywnej, a w Ionicu także utworzenia WebView i parsowania bundla. Obie metryki mierzą
„od startu JS", co trzeba w pracy nazwać wprost. Niezależna kontrola systemowa
(`am start -W`) nie nadaje się jako zamiennik porównawczy — patrz §8, uwaga o
`measure-startup.sh`.

### 7.2. `REQUEST_BUILD_MS` leży poniżej rozdzielczości zegara w Ionicu

`performance.now()` w Chromium WebView jest kwantowany do 0,1 ms; w Hermesie (RN) nie.
Widać to w każdej wartości w CSV:

| Platforma | 0 miejsc po przecinku | 1 miejsce | 2 miejsca | 3 miejsca |
|---|---|---|---|---|
| IONIC | 101 | 535 | 0 | 0 |
| REACT_NATIVE | 0 | 7 | 56 | 573 |

Dla `REQUEST_BUILD_MS` Ionic zwraca **dokładne zero w 18/30, 17/30 i 20/30** pomiarów
(kolejno ses_01, ses_02, ses_03), a RN nigdy — jego wartości to ~0,024–0,028 ms,
czyli wielkość, której WebView fizycznie nie jest w stanie zarejestrować.

**Skutek:** wynik „Ionic istotnie lepszy, p=0,006" dla tej metryki jest **artefaktem
kwantyzacji zegara**, nie różnicą wydajności. Metryki nie wolno raportować jako
porównania. Można ją opisać jako pomiar, który wykazał, że badane zjawisko leży
poniżej progu rozdzielczości pomiarowej jednej z platform — to uczciwy wynik negatywny.

### 7.3. Aplikacje były zbudowane w różnych wariantach Androida — NAPRAWIONE

**Dotyczy wyłącznie sesji 1–3 (pilotaż).**

| | React Native | Ionic (ses_01–03) | Ionic (od ses_04) |
|---|---|---|---|
| Komenda budowania | `run-android --mode=release` | `./gradlew installDebug` | `./gradlew installRelease` |
| Wariant APK | release | **debug** (`android:debuggable=true`) | release |
| Flaga `debuggable` | brak | **obecna** | brak |
| `buildType` w CSV | `RELEASE` | `RELEASE` (etykieta myląca) | `RELEASE` |

W pilotażu etykieta w danych pochodziła z `import.meta.env.DEV`, które po `vite build`
jest fałszem — odzwierciedlała więc tryb bundlowania **webowego**, a nie wariant APK.
Ionic realnie działał w APK debugowalnym (Capacitor włącza wtedy m.in. WebContents
debugging), mimo komentarza `// MUSI być RELEASE` w schemacie bazy.

**Naprawa:** do `shop-ionic/android/app/build.gradle` dodano `signingConfig
signingConfigs.debug` w bloku `release` (wcześniej blok nie miał żadnej konfiguracji
podpisu, więc APK release był niepodpisany i nieinstalowalny). Od sesji 4 Ionic
budowany jest przez `installRelease`.

**Stan po naprawie — zweryfikowany na zbudowanych APK-ach:**

| | React Native | Ionic |
|---|---|---|
| Wariant | release | release |
| `debuggable` | brak | brak |
| Minifikacja natywna (R8/ProGuard) | wyłączona (`enableProguardInReleaseBuilds = false`) | wyłączona (`minifyEnabled false`) |
| Minifikacja JS | Metro (tryb release) | Vite / esbuild |
| Podpis | certyfikat autora (`CN=Damian Zięba, OU=wsiz`) | klucz debugowy Androida |

Pozostała różnica w certyfikacie podpisu **nie wpływa na wydajność** — certyfikat służy
weryfikacji tożsamości wydawcy przy instalacji i nie bierze udziału w wykonaniu kodu.

**Do opisania w pracy:** sesje 1–3 wykonano przy asymetrii wariantów kompilacji
(ograniczenie pilotażu), sesje 4–6 po jej usunięciu. Różnica median między tymi
zbiorami daje zmierzony koszt wariantu debugowalnego dla Ionica.

Konfiguracja React Native istotna dla odtwarzalności (`android/gradle.properties`):
`newArchEnabled=true` (nowa architektura — Fabric/TurboModules) oraz `hermesEnabled=true`
(silnik Hermes, bytecode prekompilowany).

### 7.4. Asymetria pracy renderowania przy metrykach `RENDER_*`

RN używa `FlatList` z wirtualizacją (`getItemLayout`, domyślnie ~10 pozycji w pierwszej
klatce), Ionic renderuje **pełną listę** przez `items.map(...)`. Przy `apiOrders(1, 20)`
RN rysuje w oknie pomiarowym ~10 wierszy, a Ionic 20 kart `IonCard`.

**Skutek:** to nie unieważnia wyniku (Ionic i tak jest szybszy: 31,8 vs 78,3 ms),
ale obciążenie działa **na niekorzyść Ionica**, więc rzeczywista przewaga jest
prawdopodobnie jeszcze większa niż zmierzona. Warto to napisać — wzmacnia wniosek.

### 7.5. Efekt pierwszej iteracji w Ioniku ma zidentyfikowaną przyczynę

`capacitor.config.ts` ustawia `androidScheme: 'http'`, więc origin WebView to
`http://localhost`, a API stoi na `http://localhost:3000` — inne źródło. POST
z `Content-Type: application/json` wyzwala **preflight `OPTIONS`**, cache'owany
przez 24 h (`maxAge: 86400` w `security.ts`). React Native nie stosuje CORS w ogóle.

Widać to w danych, `API_REQUEST_MS` w S3, pierwsze pięć iteracji:

```
ses_01  IONIC          43,8   33,5   31,2   29,8   36,5     ← monotoniczny spadek
ses_02  IONIC          52,9   39,9   35,5   28,7   30,4     ← monotoniczny spadek
ses_03  IONIC          66,8   54,0   35,8   30,7   35,2     ← monotoniczny spadek
ses_01  REACT_NATIVE   66,2   67,5   84,2   50,4   49,7     ← brak wzorca
```

To wyjaśnia zaobserwowany wcześniej wzorzec, w którym iteracja 1 w Ioniku wypada
jako odstająca w **każdej** z trzech sesji. Nie jest to zakłócenie losowe, tylko
powtarzalny koszt zimnego startu warstwy sieciowej WebView. Uzasadnia to traktowanie
iteracji 1 jako rozbiegowej — z podaniem mechanizmu, a nie „bo odstawała".

### 7.6. Logowanie żądań nie dawało się wyłączyć przez plik `.env`

**Dotyczy sesji 1–3.** Procedura pilotażu była pod tym względem poprawna:
`INSTRUKCJA_BADAN.md` nakazuje `npm run build && npm start` i wprost ostrzega
przed `npm run dev`. Serwer **nie** działał w trybie deweloperskim.

Mimo to logowanie każdego żądania pozostawało włączone — z powodu kolejności
inicjalizacji. W `src/server.ts`:

```js
export async function buildServer() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info",
              transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined },
    disableRequestLogging: process.env.NODE_ENV === "production",   // ⟵ czytane TERAZ
  });
  await app.register(envPlugin);   // ⟵ dopiero TU wczytywany jest plik .env
```

Konstruktor Fastify czyta `process.env` **przed** rejestracją `@fastify/env`,
który dopiero wczytuje `.env`. Wartość `NODE_ENV` z pliku `.env` nigdy nie dociera
do tych dwóch warunków — i nie dotarłaby też, gdyby wpisać tam `production`.
W chwili konstruowania `process.env.NODE_ENV` jest niezdefiniowane, więc:

| Warunek | Wynik | Skutek |
|---|---|---|
| `=== "development"` | fałsz | `pino-pretty` **wyłączone** ✓ |
| `=== "production"` | fałsz | logowanie żądań **włączone** ✗ |

**Weryfikacja empiryczna** (`node dist/index.js`, jedno żądanie `GET /api/services`):

```
zwykły npm start:              {"msg":"incoming request"}
                               {"msg":"request completed","responseTime":66.17}
NODE_ENV=production npm start: (brak linii)
```

Do tego `RATE_LIMIT_MAX` = 1000/min z `.env` zamiast 100000 z konfiguracji
produkcyjnej — ta wartość pochodzi z `app.config`, więc `.env` na nią wpływa.

**Skutek:** dwie linie JSON zapisywane na stdout przy każdym żądaniu. Narzut jest
niewielki (bez formatowania `pino-pretty`), ale niezerowy, i stoi w sprzeczności
z konfiguracją bazy, gdzie logowanie wyłączono jawnie (`log_statement=none`)
właśnie po to, by usunąć narzut I/O. **Nie przechyla porównania RN vs Ionic** —
obie aplikacje odpytywały ten sam backend, więc jest to składnik wspólny.

**Naprawa (od sesji 4):** `NODE_ENV` ustawiane **w powłoce**, przed startem procesu —
to jedyny sposób, w jaki ten warunek da się kontrolować:

```bash
npm run build
NODE_ENV=production LOG_LEVEL=warn TEST_MODE=0 RATE_LIMIT_MAX=100000 npm start
```

`TEST_MODE` steruje wyłącznie sztucznym opóźnieniem `?delay=` w module katalogu
([catalog.routes.ts:42](services-shop-api/src/modules/catalog/catalog.routes.ts#L42)),
którego aplikacje nie używają — jego wartość nie wpłynęła na wyniki pilotażu.

---

## 8. Kampania właściwa (sesje 4–6) — wyniki

Trzy poprawki (§7.1, §7.3, §7.6) wdrożone, sesje 4–6 zebrane w pełni (n=90 na
platformę na metrykę czasową, n≥143 próbek zasobowych na scenariusz), policzone
`analiza/analiza.py --sesje ses_04 ses_05 ses_06`. Pliki: `data/analiza/czasy.csv`,
`zasoby.csv`, `zgodnosc_sesji.csv`, `odstajace.csv`.

### 8.1 Czasy — wynik finalny (n=90 na platformę, poza `STARTUP_MS` w S2/S3 gdzie n=3)

| Scen. | Metryka | RN mediana | Ionic mediana | p (Mann-Whitney) | efekt r | lepsza |
|---|---|---|---|---|---|---|
| S1 | `STARTUP_MS` | 572,4 ms | 454,1 ms | <0,001 | 1,0 (duża) | Ionic |
| S2 | `UI_RESPONSE_MS` | 115,9 ms | 149,2 ms | <0,001 | −0,9 (duża) | **RN** |
| S3 | `API_REQUEST_MS` | 50,1 ms | 37,2 ms | <0,001 | 0,9 (duża) | Ionic |
| S3 | `RENDER_CHECKOUT_MS` | 89,7 ms | 63,6 ms | <0,001 | 0,9 (duża) | Ionic |
| S3 | `RENDER_ORDERS_MS` | 78,3 ms | 30,2 ms | <0,001 | 1,0 (duża) | Ionic |
| S3 | `REQUEST_BUILD_MS` | 0,0 ms | 0,0 ms | 0,009 | 0,2 (mała) | — patrz §7.2 |
| S3 | `UI_RESPONSE_MS` | 130,2 ms | 150,8 ms | <0,001 | −0,8 (duża) | **RN** |

`REQUEST_BUILD_MS` mimo p=0,009 nie jest wynikiem do zaraportowania jako przewaga
Ionica — §7.2 pozostaje w mocy niezależnie od wariantu builda; siła efektu (0,2, mała)
jest niespójna z „istotnością" wynikającą wyłącznie z dużego n. `STARTUP_MS` w S2/S3
ma n=3 na platformę (jeden start na przebieg) — za mało na test, skrypt zwraca „—".

### 8.2 Zasoby — wynik z sesji 4–6 (⚠️ NIEAKTUALNE dla Ionica — patrz §10)

> Ionic mierzony skryptem v1 bez procesu renderera WebView, więc RAM i CPU są zaniżone.
> Aktualne wyniki: §10.4. Wiersze RN pozostają ważne.

| Scen. | Metryka | RN mediana | Ionic mediana | p | efekt r | lepsza |
|---|---|---|---|---|---|---|
| S1 | CPU % | 19,3 | 16,6 | 0,631 n.i. | 0,0 (znikoma) | brak różnicy |
| S1 | RAM PSS (MB) | 162,2 | 152,0 | <0,001 | 0,6 (duża) | Ionic |
| S2 | CPU % | 16,6 | 10,0 | <0,001 | 0,3 (średnia) | Ionic |
| S2 | RAM PSS (MB) | 151,1 | 166,7 | <0,001 | −0,9 (duża) | **RN** |
| S3 | CPU % | 20,0 | 13,3 | <0,001 | 0,2 (mała) | Ionic |
| S3 | RAM PSS (MB) | 228,9 | 182,1 | <0,001 | 1,0 (duża) | Ionic |

RAM w S2 to jedyne miejsce, gdzie RN zużywa mniej niż Ionic — odwrócenie względem
S1 i S3. Oparte na trzech niezależnych sesjach (nie pseudoreplikacji z próbek
w obrębie jednego przebiegu — patrz zastrzeżenie w §8.4), więc nadaje się do
zaraportowania jako obserwacja, warta komentarza w dyskusji.

### 8.3 Zgodność międzysesyjna

Mediany głównych metryk różnią się między sesjami 4–6 o **0,1–5,9 %**
(`data/analiza/zgodnosc_sesji.csv`), np.:

```
S1 STARTUP_MS    Ionic  456,1 → 453,4 → 449,1
S1 STARTUP_MS    RN     569,7 → 569,0 → 580,2
S2 UI_RESPONSE   Ionic  149,2 → 148,4 → 148,8
S2 UI_RESPONSE   RN     117,6 → 116,4 → 115,2
```

Jest to argument za powtarzalnością stanowiska — trzy niezależne sesje (różne dni/pory
dnia) dają wyniki w wąskim przedziale, bez trendu w jedną stronę.

### 8.4 Zastrzeżenie statystyczne — próbki zasobowe wewnątrz przebiegu są autoskorelowane

Kolejne próbki PSS w jednym przebiegu `sample-resources.sh` (próbkowanie co ~0,5 s)
**nie są niezależnymi obserwacjami** — zmierzona autokorelacja lag-1 dla PSS sięgała
0,87–0,97 w danych z pilotażu. Traktowanie ich jako n niezależnych próbek do testu
Manna-Whitneya (tak jak w tabeli 8.2, gdzie n liczy próbki) jest **statystycznie
niepoprawne** dla porównań wewnątrz jednej pary przebiegów.

Poprawna jednostka replikacji dla testu istotności to **przebieg**, nie próbka —
czyli n=3 (sesje 4–6) na platformę na scenariusz. Przy n=3 vs 3 minimalne osiągalne
p w teście Manna-Whitneya wynosi 0,100 — test nie ma szans wykazać istotności
niezależnie od wielkości różnicy. Zamiast tego zaleca się opis opisowy:

> *„w każdej z trzech niezależnych sesji mediana PSS dla React Native przewyższała
> Ionic o X–Y MB; zakresy międzysesyjne się nie nakładają"* (dla S1 i S3 — sprawdzić
> nakładanie na medianach per-sesja przed sformułowaniem zdania).

CPU ma dużo niższą autokorelację (lag-1 rzędu 0,05–0,23) — tam potraktowanie próbek
jako w przybliżeniu niezależnych jest dużo mniej problematyczne, choć formalnie
liczba efektywnych stopni swobody nadal jest mniejsza niż surowe n próbek.

Tabela 8.2 (z `analiza.py`) jest przydatna jako **opis rozkładu** (mediana, p95),
ale kolumnę „p" dla RAM należy traktować ostrożnie w tekście pracy — bezpieczniej
oprzeć wniosek o RAM na porównaniu median trzech sesji (8.3-owy wzorzec), a nie
na pojedynczej p-wartości z tabeli 8.2.

### 8.5 Wartości odstające — powtarzający się wzorzec w Ioniku

We wszystkich trzech sesjach iteracja 1 w Ioniku odstaje w `UI_RESPONSE_MS` i
`API_REQUEST_MS` (S3) — spójne z mechanizmem opisanym w §7.5 (preflight CORS przy
zimnym starcie WebView). Trzykrotne powtórzenie tego wzorca w niezależnych sesjach
jest mocną podstawą do opisania iteracji 1 jako rozbiegowej, z podanym mechanizmem,
a nie tylko statystycznym kryterium odstawania.

Pełna lista w `data/analiza/odstajace.csv`.

---

## 9. Procedura pomiarowa — kontrole dodane podczas kampanii właściwej

Poza trzema poprawkami kodu (§7.1, §7.3, §7.6) procedura zbierania sesji 4–6
zyskała kilka kontroli operacyjnych, które są częścią metodyki, nie tylko
narzędziem wygody. Pełna instrukcja: `INSTRUKCJA_SES_04_06.md`.

### 9.1 Izolacja aplikacji w tle (`maestro/scripts/kill-apps.sh`)

W trakcie kampanii ustalono, że obie aplikacje mogą pozostawać rezydentne w pamięci
telefonu jednocześnie (zaobserwowane: ~280 MB każda). Mierząc jedną platformę bez
ubicia drugiej, druga zostaje w tle i wpływa na presję pamięciową oraz zachowanie
garbage collectora — asymetrycznie, bo stan tła zależy od tego, którą aplikację
uruchamiano jako ostatnią.

Naprawa: `adb shell am force-stop <pakiet>` dla **obu** pakietów przed każdym
uruchomieniem Maestro (`force-stop` jest deterministyczny, w przeciwieństwie do
usunięcia z listy ostatnich aplikacji). Warto explicite wykluczyć z tego aplikację
sterującą samym Maestro (`dev.mobile.maestro`) — jest rezydentna z konieczności
(steruje kliknięciami i odczytem drzewa widoków w obu aplikacjach jednakowo, więc
nie przechyla porównania), a jej ubicie przerywa sesję pomiarową.

### 9.2 Kontrola termiczna i stanu baterii przed każdym blokiem

Dodano sprawdzenie przed każdym uruchomieniem: `Thermal Status` (0 = brak throttlingu),
poziom baterii (>30%, docelowo ładowanie do ~100% przed sesją — pełna bateria nie
pobiera prądu szybkiego ładowania i się nie grzeje, w przeciwieństwie do ładowania
przy niskim stanie), tryb oszczędzania energii (wyłączony). Throttling termiczny
nie objawia się pojedynczym odstającym pomiarem, tylko **blokiem kolejnych** zawyżonych
iteracji — dokładnie taki wzorzec zaobserwowano w pilotażu (ses_01, RN, S1, iteracje
14–18: 898–1495 ms przy medianie 613 ms), co retrospektywnie sugeruje przegrzanie
jako prawdopodobną przyczynę tamtej anomalii.

### 9.3 Kontrola `SESSION_ID` **i** `SCENARIO` przed przebudową

Podczas zbierania ses_05 wystąpił incydent: `set-run.sh ses_05 S3` nie został
wykonany przed blokiem S3, więc aplikacja pozostała skompilowana z `SCENARIO=S2`.
Pomiar S3 wykonał się prawidłowo (etykieta `SCENARIO` nie wpływa na zachowanie
aplikacji, tylko na metadane wysyłane do API), ale w bazie zapisał się pod błędną
etykietą scenariusza, a `UI_RESPONSE_MS` z tego przebiegu nadpisało — jako pozorne
„iteracje 31–60" — miejsce, które później usunęło rutynowe sprzątanie po przebiegach
zasobowych. Blok S3 trzeba było powtórzyć.

Naprawa proceduralna: kontrola przed każdą przebudową sprawdza **obie** zmienne
jednocześnie (`grep -E "SESSION_ID|SCENARIO:" shop-ionic/src/core/config.ts`), nie
tylko `SESSION_ID`. Wniosek metodologiczny: `SCENARIO` jest czystą metadaną
etykietującą wysyłane pomiary, a nie parametrem sterującym pomiarem — to rozróżnienie
warto wprost nazwać w opisie procedury, bo błędna etykieta jest łatwa do przeoczenia
(dane wyglądają "zdrowo" liczbowo, tylko są przypisane do złego scenariusza).

### 9.4 Kolejność pomiaru: najpierw wszystkie czasy, dopiero potem wszystkie zasoby

Wczesna wersja procedury przeplatała pomiar czasowy i zasobowy scenariusz po
scenariuszu. Poprawiona kolejność: cały blok czasowy (S1→S2→S3) dla danej sesji,
eksport CSV, dopiero potem cały blok zasobowy (S1→S2→S3). Powód: przebieg zasobowy
uruchamia ten sam flow Maestro drugi raz, więc aplikacja wysyła metryki czasowe
ponownie — jeśli zrobić to od razu po pomiarze właściwym tego samego scenariusza,
łatwo pomylić, które 30 iteracji jest „prawdziwe", a które to śmieci z przebiegu
zasobowego. Wykonanie całego bloku czasowego na czysto, zamrożenie go eksportem,
i dopiero potem seria przebiegów zasobowych (ze sprzątaniem po numerze iteracji na
końcu) eliminuje to ryzyko.

### 9.5 Błąd w skrypcie analizy — filtr sesji nie obejmował danych zasobowych

`analiza/analiza.py` w wersji używanej do pierwszego przebiegu ses_04 filtrował
dane czasowe po `--sesje`, ale **nie filtrował danych zasobowych** — `wczytaj_zasoby()`
wczytywała wszystkie pliki z `data/resources/` niezależnie od podanego argumentu,
mieszając dane z pilotażu i badania właściwego w jednej puli (objaw: „Wczytano 4593
próbek" przy sesji, która sama wyprodukowała ~1500). Naprawione — funkcja filtruje
teraz po numerze sesji zaszytym w `run_id` (`ses_04r_S1` → `ses_04`). Wniosek: przy
korzystaniu z tego narzędzia do dalszych sesji (ewentualna `ses_07` itd.) warto
sprawdzić wynikowe „Wczytano N próbek zasobów" pod kątem wiarygodności rzędu
wielkości, zanim zaufa się liczbom w tabeli.

---

## 10. Ponowny pomiar zasobów Ionica z rendererem WebView (sesje 7–9, 11.10.2026)

### 10.1 Wada: `sample-resources.sh` v1 nie liczył procesu renderera WebView

Od Androida 8 WebView renderuje w **osobnym, izolowanym procesie**
(`com.google.android.webview:sandboxed_process0:…`, rodzic `webview_zygote`). W nim
działają V8, DOM, style, layout i dekodowanie obrazków. Proces aplikacji
(`io.ionic.starter`) zawiera tylko część WebView po stronie aplikacji (w tym kompozytor/GPU).

Skrypt v1 (sesje 1–6) liczył `dumpsys meminfo <pakiet>` i `top | grep <pakiet>`,
czyli **wyłącznie proces aplikacji**. Renderer ma w nazwie pakiet WebView, nie aplikacji,
więc nie był liczony. **RAM i CPU Ionica z sesji 1–6 są zaniżone** (§8.2 nieaktualne
dla Ionica). React Native nie używa WebView (brak zależności w `package.json`), więc
jego pomiar był kompletny.

Zmierzone na urządzeniu (Ionic otwarty, katalog): proces aplikacji ≈117 MB PSS,
renderer ≈70–73 MB PSS, czyli renderer to około **⅓ pamięci Ionica**.

### 10.2 Naprawa: `sample-resources.sh` v2

- Renderer przypisywany do aplikacji przez `dumpsys activity services <pakiet>`. Usługa
  `SandboxedProcessService` jest rejestrowana na pakiet gospodarza, a jej
  `app=ProcessRecord{… <pid>:…}` wskazuje proces renderera.
- **Nie** po nazwie procesu, bo renderery wszystkich aplikacji nazywają się identycznie.
  Na tym telefonie w tle działają cudze renderery: `com.miui.msa.global` (reklamy
  systemowe Xiaomi) i `com.mi.appfinder`. Uruchamiają się ponownie po każdym powrocie
  na pulpit, a to w S1 dzieje się 30 razy.
- RAM = PSS procesu aplikacji + PSS renderera(ów); CPU = `%CPU` z `top` dla obu.
  Nowe kolumny: `pss_main_mb, pss_renderer_mb, cpu_main, cpu_renderer, n_renderer`.
- Jedno wywołanie `adb shell` na próbkę, realnie ok. 1,35 s na próbkę (v1: ok. 1,05 s).
- `kill-apps.sh` zatrzymuje próbkowanie, które zostało w tle po przerwanym bloku
  (pierwsza próba sesji 7 miała dwa skrypty naraz, odrzucona i powtórzona).
- `analiza.py` pomija pliki Ionica w formacie v1; nowa opcja `--sesje-zasoby`.

Zweryfikowane na urządzeniu: renderer złapany w 97–100% próbek Ionica (w S1 mniej,
bo między restartami aplikacji renderera chwilę nie ma), RN 0 rendererów, CPU renderera
rośnie przy przewijaniu.

### 10.3 Warunki sesji 7–9

| Sesja | Start | Bateria | S1 / S2 / S3 (czas przebiegu) |
|---|---|---|---|
| 7 | 20:38 | 28°C | 227 / 209 / 466 s |
| 8 | 21:02 | 29°C | 227 / 208 / 464 s |
| 9 | 21:27 | 30°C (odczyt 21:20) | 228 / 211 / 459 s |
| *4 (wrzesień, dla porównania)* | | | *230 / 219 / 462 s* |

- Jeden dzień, przerwy do powrotu temperatury baterii do poziomu wyjściowego (+≤2°C).
  Sesje 4–6 też były jednego dnia (9.09: 14:24, 17:19, 21:41).
- Telefon na ładowarce (USB), tryb samolotowy, aplikacje w tle ubite
  (+ `com.mi.appfinder`, `com.miui.msa.global`).
- `Thermal Status` stał na 1 przez cały wieczór, ale był to **zawieszony odczyt**:
  „Cached temperatures” niezmienne (SKIN 43,0°C, CPU 59,6°C), a bieżące z HAL
  SKIN 30–32°C, CPU 33–35°C, bateria 28–30°C, wszystko daleko poniżej progów
  (SKIN: 43°C dla statusu 1).
- Brak aktualizacji systemu od sesji 4–6: `ro.build.date` 6.07.2026,
  `OS3.0.302.0.WGTEUXM`, poprawka bezpieczeństwa 2026-07-01.
- **WebView zaktualizowany 7.10.2026 do 153.0.8010.57**, czyli po sesjach 4–6.
  Dotyczy tylko Ionica. Zasoby Ionica (sesje 7–9) zmierzone na WebView 153,
  czasy Ionica (sesje 4–6) na wersji z września (nieodnotowanej).
- RN nie był mierzony ponownie: nie używa WebView, a system się nie zmienił.

### 10.4 Wyniki — mediany per sesja (jednostka replikacji = przebieg, por. §8.4)

**RAM PSS (MB)**

| Scen. | RN (ses 4 / 5 / 6) | Ionic v2 (ses 7 / 8 / 9) | Ionic − RN | zakresy się nakładają? |
|---|---|---|---|---|
| S1 | 162,5 / 162,6 / 161,5 | 191,9 / 192,8 / 190,9 | +28 do +31 | nie |
| S2 | 151,9 / 152,0 / 147,9 | 217,7 / 215,8 / 214,6 | +63 do +70 | nie |
| S3 | 230,2 / 232,9 / 226,2 | 245,6 / 238,8 / 239,6 | +6 do +19 | nie |

Składowe Ionica (mediany, średnio z 3 sesji): proces aplikacji / renderer
S1 127 / 64, S2 141 / 75, S3 158 / 83 MB; renderer stanowi 33–35% w każdym scenariuszu.
Zgodność międzysesyjna Ionica: 0,5–2,8%.

**CPU (%, 100% = jeden rdzeń)**

| Scen. | RN mediana (ses 4/5/6) | Ionic mediana (ses 7/8/9) | RN średnia | Ionic średnia |
|---|---|---|---|---|
| S1 | 20,0 / 23,3 / 13,3 | 16,6 / 16,6 / 16,6 | 48,8 / 46,0 / 36,6 | 51,6 / 55,5 / 54,1 |
| S2 | 20,0 / 16,6 / 20,0 | 12,8 / 8,0 / 9,6 | 30,3 / 27,6 / 29,6 | 33,7 / 22,4 / 28,3 |
| S3 | 20,0 / 20,0 / 20,0 | 16,6 / 20,0 / 19,3 | 35,7 / 34,9 / 34,5 | 43,6 / 45,2 / 43,2 |

CPU z pojedynczych odczytów `top` jest silnie skokowe (mediana często trafia
w przerwę między zrywami, wartości skwantowane co ok. 3,3 pp.), więc mediana
i średnia dają różny obraz. Odczyt łączny:

- S2: Ionic mediana niższa (zakresy się nie nakładają), średnie się nakładają. Słaba przewaga Ionica.
- S1, S3: mediany podobne, a średnie wyższe dla Ionica (S3: 43–45 vs 35–36, bez nakładania).
- **Wniosek: brak podstaw do twierdzenia, że Ionic zużywa mniej CPU.** Jeśli już,
  to w S1/S3 więcej (średnie).

Tabela z `analiza.py` (Mann-Whitney na próbkach, z zastrzeżeniem §8.4):
`data/analiza/zasoby.csv`. RAM: RN lepszy w S1, S2, S3 (efekt r −0,7 / −1,0 / −0,7).
CPU: S1 bez różnicy, S2 Ionic (r 0,3), S3 r 0,1 (znikoma).

### 10.5 Co się zmieniło względem §8.2

| | v1 (bez renderera) | v2 (z rendererem) |
|---|---|---|
| RAM S1 | Ionic lepszy (152 vs 162) | **RN lepszy** (192 vs 162) |
| RAM S2 | RN lepszy (167 vs 151) | RN lepszy, różnica większa (216 vs 151) |
| RAM S3 | Ionic lepszy (182 vs 229) | **RN lepszy** (241 vs 229) |
| CPU | Ionic lepszy w S2 i S3 | Ionic lepszy tylko w S2 (mediana); S1/S3 bez przewagi lub gorzej |

**Koszt krańcowy RAM** (przyrost między scenariuszami, mediany):

| | S1 → S2 | S2 → S3 |
|---|---|---|
| RN | −11 MB | **+78 MB** |
| Ionic v1 | +15 MB | +15 MB |
| Ionic v2 | +24 MB | **+25 MB** |

Obserwacja „Ionic rośnie wolniej niż RN przy przejściu do S3” **przetrwała**
(+25 vs +78 MB), ale jest słabsza niż w v1. Renderer też rośnie (64 → 75 → 83 MB).
Ionic startuje jednak z wyższego poziomu bazowego, więc w każdym scenariuszu
zużywa więcej RAM niż RN.

### 10.6 Proces aplikacji Ionica: v1 vs v2

Proces aplikacji w v2 wychodzi o ok. 24 MB niżej niż w v1 (mediany sesji:
S1 127 vs 152, S2 141 vs 166, S3 157 vs 182), stabilnie we wszystkich scenariuszach.
Prawdopodobne przyczyny (niezweryfikowane):

1. aktualizacja WebView 7.10 (inny podział pamięci między procesem aplikacji a rendererem),
2. PSS dzieli strony współdzielone (np. biblioteka WebView) między wszystkie procesy,
   które je mapują, więc udział procesu aplikacji zależy od liczby procesów WebView w systemie.

Skutek dla pracy: suma v2 nie jest równa „v1 + renderer”. Porównanie
z RN opiera się wyłącznie na v2.

### 10.7 Pliki

| Plik | Zawartość |
|---|---|
| `data/resources/resources_IONIC_ses_0{7,8,9}r_S{1,2,3}.csv` | Ionic v2, z rendererem |
| `data/resources/resources_REACT_NATIVE_ses_0{4,5,6}r_S{1,2,3}.csv` | RN (bez zmian) |
| `data/archiwum-zasoby-v1/` | Ionic v1 (sesje 1–6), bez renderera, tylko do porównań |
| `data/analiza/zasoby.csv` | tabela zasobów (RN 4–6, Ionic 7–9) |
| `INSTRUKCJA_ZASOBY_V2.md` | procedura sesji 7–9 |

Komenda: `.venv/bin/python analiza/analiza.py --sesje ses_04 ses_05 ses_06 --sesje-zasoby ses_04 ses_05 ses_06 ses_07 ses_08 ses_09`
