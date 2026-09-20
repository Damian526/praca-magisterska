#!/usr/bin/env bash
# Użycie: ./measure-startup.sh <package> <platforma> [powtórzeń]
set -euo pipefail

PKG=${1:-}
PLATFORM=${2:-}
N=${3:-30}

if [ -z "$PKG" ] || [ -z "$PLATFORM" ]; then
  echo "użycie: ./measure-startup.sh <package> <platforma> [powtórzeń]"
  exit 1
fi

# Bez tych kontroli skrypt po cichu zapisywał puste wiersze i kończył sukcesem.
LICZBA_URZADZEN=$(adb devices | grep -c "	device$" || true)
if [ "$LICZBA_URZADZEN" -eq 0 ]; then
  echo "❌ Nie widzę żadnego urządzenia. Podłącz telefon i sprawdź: adb devices"
  exit 1
fi

if ! adb shell pm list packages | grep -q "^package:$PKG$"; then
  echo "❌ Pakiet $PKG nie jest zainstalowany na urządzeniu."
  exit 1
fi

OUT="data/startup-os/startup_os_${PLATFORM}.csv"
mkdir -p "$(dirname "$OUT")"
echo "iteration,platform,this_time_ms,total_time_ms,wait_time_ms" > "$OUT"

for i in $(seq 1 "$N"); do
  adb shell am force-stop "$PKG"
  sleep 2
  R=$(adb shell am start -W -n "$PKG/.MainActivity" 2>/dev/null)
  TT=$(echo "$R" | grep "^TotalTime:" | awk '{print $2}')
  TH=$(echo "$R" | grep "^ThisTime:" | awk '{print $2}')
  WT=$(echo "$R" | grep "^WaitTime:" | awk '{print $2}')

  if [ -z "$TT" ]; then
    echo "❌ Iteracja $i nie zwróciła czasu startu. Odpowiedź adb:"
    echo "$R" | sed 's/^/    /'
    echo "   Plik $OUT jest niekompletny — powtórz pomiar."
    exit 1
  fi

  echo "$i,$PLATFORM,$TH,$TT,$WT" >> "$OUT"
  echo "  $i/$N — TotalTime=${TT}ms"
  sleep 1
done

echo "✅ Zapisano: $OUT ($N pomiarów)"
