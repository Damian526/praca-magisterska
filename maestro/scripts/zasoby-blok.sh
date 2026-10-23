#!/usr/bin/env bash
# Użycie: maestro/scripts/zasoby-blok.sh <S1|S2|S3> <RN|IONIC>
#   np.   maestro/scripts/zasoby-blok.sh S1 RN
#
# Pomiar RAM/CPU do weryfikacji hipotez (INSTRUKCJA_ZASOBY_V3.md): 10 par przebiegów jednego
# scenariusza, React Native i Ionic NAPRZEMIENNIE, zaczynając od podanej platformy.
# Każdy przebieg = 5 powtórzeń scenariusza (maestro/zasoby/*_5.yaml) z próbkowaniem przez cały czas.
#
# Każdy przebieg, dla obu platform tak samo:
#   [S3: zerowanie zamówień] → ubicie obu aplikacji i aplikacji Xiaomi z WebView
#   → sample-resources.sh w tle → maestro test → zatrzymanie próbkowania → kontrola liczby odczytów.
#
# Zmienne (opcjonalne):
#   DEVICE=<id>        przekazywane do Maestro jako --device
#   SESJA=ses_10r      prefiks run_id (np. SESJA=test do próby na sucho)
#   PRZEBIEGI=10       liczba par przebiegów
#
# Można uruchomić ponownie po awarii: przebiegi, które mają już poprawny plik, są pomijane.
set -u
cd "$(dirname "$0")/../.." || exit 1

SCEN=${1:-}; PIERWSZA=${2:-}
SESJA=${SESJA:-ses_10r}
PRZEBIEGI=${PRZEBIEGI:-10}
MIN_ODCZYTOW=15

case "$SCEN" in
  S1) FLOW=maestro/zasoby/S1_startup_5.yaml;     LIMIT=300 ;;
  S2) FLOW=maestro/zasoby/S2_ui_response_5.yaml; LIMIT=300 ;;
  S3) FLOW=maestro/zasoby/S3_full_path_5.yaml;   LIMIT=600 ;;
  *) echo "użycie: $0 <S1|S2|S3> <RN|IONIC>"; exit 1 ;;
esac
case "$PIERWSZA" in
  RN)    KOLEJNOSC="RN IONIC" ;;
  IONIC) KOLEJNOSC="IONIC RN" ;;
  *) echo "użycie: $0 <S1|S2|S3> <RN|IONIC>"; exit 1 ;;
esac

stan_telefonu() {
  echo "   $(date +%H:%M:%S) | $(adb shell dumpsys thermalservice | grep 'Thermal Status' | tr -d '\r') |" \
       "$(adb shell dumpsys battery | grep temperature | tr -d '\r' | xargs)"
}

odczyty() {
  [ -f "$1" ] && echo $(($(wc -l < "$1") - 1)) || echo 0
}

przebieg() {
  local plat=$1 nr=$2 pkg platforma run_id plik proba rc n
  if [ "$plat" = RN ]; then pkg=com.shopreactnative; platforma=REACT_NATIVE
  else pkg=io.ionic.starter; platforma=IONIC; fi
  run_id="${SESJA}_${SCEN}_${nr}"
  plik="data/resources/resources_${platforma}_${run_id}.csv"

  if [ "$(odczyty "$plik")" -ge "$MIN_ODCZYTOW" ]; then
    echo "⏭  $run_id $platforma — już jest ($(odczyty "$plik") odczytów), pomijam"
    return 0
  fi

  for proba in 1 2; do
    echo "▶  $run_id $platforma (próba $proba)"
    [ "$SCEN" = S3 ] && { maestro/scripts/reset-orders.sh || return 1; }
    maestro/scripts/kill-apps.sh || return 1
    adb shell am force-stop com.mi.appfinder
    adb shell am force-stop com.miui.msa.global
    sleep 2

    # Maestro domyślnie przed każdym testem instaluje od nowa swoje 2 aplikacje pomocnicze, a Xiaomi
    # każe potwierdzać każdą instalację przez USB (i po kilku odmowach blokuje je całkiem). Jeśli
    # obie są już na telefonie, pomijamy reinstalację — instalacja i tak dzieje się przed startem
    # mierzonej aplikacji, więc nie wpływa na pomiar.
    BEZ_REINSTALACJI=""
    if [ "$(adb shell pm list packages dev.mobile.maestro | tr -d '\r' | grep -c .)" -ge 2 ]; then
      BEZ_REINSTALACJI="--no-reinstall-driver"
    fi

    # próbkowanie startuje przed Maestro i kończy się po nim — średnia obejmuje cały przebieg
    maestro/scripts/sample-resources.sh "$pkg" "$platforma" "$run_id" "$LIMIT" > /dev/null &
    SAMPLER=$!
    maestro test $BEZ_REINSTALACJI "$FLOW" -e APP_ID="$pkg" ${DEVICE:+--device "$DEVICE"}
    rc=$?
    kill "$SAMPLER" 2>/dev/null; wait "$SAMPLER" 2>/dev/null

    n=$(odczyty "$plik")
    if [ "$rc" -eq 0 ] && [ "$n" -ge "$MIN_ODCZYTOW" ]; then
      echo "✅ $run_id $platforma — $n odczytów"
      return 0
    fi
    echo "⚠️  $run_id $platforma nieudany (Maestro: $rc, odczytów: $n) — plik usunięty"
    rm -f "$plik"
  done
  return 1
}

echo "═══ Blok $SCEN, kolejność: $KOLEJNOSC, $PRZEBIEGI par, sesja $SESJA"
echo "Stan telefonu na początku bloku:"; stan_telefonu

for i in $(seq 1 "$PRZEBIEGI"); do
  nr=$(printf "%02d" "$i")
  for plat in $KOLEJNOSC; do
    if ! przebieg "$plat" "$nr"; then
      echo "❌ ${SESJA}_${SCEN}_${nr} $plat nie wyszedł dwa razy z rzędu. Sprawdź telefon i backend,"
      echo "   potem uruchom ten sam blok ponownie — gotowe przebiegi zostaną pominięte."
      exit 1
    fi
  done
done

echo "Stan telefonu na końcu bloku:"; stan_telefonu
maestro/scripts/check-resources.sh "${SESJA}_${SCEN}_"
echo "✅ Blok $SCEN gotowy."
