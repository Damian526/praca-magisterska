#!/usr/bin/env bash
# Użycie: ./kill-apps.sh
set -e

# Próbkowanie, które zostało w tle po przerwanym bloku (Ctrl+C zatrzymuje Maestro,
# ale nie `kill $SAMPLER`), dopisywałoby się do pliku i obciążało telefon w kolejnym bloku.
if pkill -f "sample-resources.sh"; then
  echo "⚠️  Zatrzymano próbkowanie, które zostało w tle z poprzedniego bloku"
fi

adb shell am force-stop com.shopreactnative
adb shell am force-stop io.ionic.starter

POZOSTALE=$(adb shell "ps -A | grep -cE 'com.shopreactnative|io.ionic.starter'" | tr -d '\r')
if [ "$POZOSTALE" != "0" ]; then
  echo "⚠️  Któraś aplikacja nadal działa — sprawdź: adb shell ps -A | grep -E 'shopreactnative|ionic'"
  exit 1
fi

echo "✅ Obie aplikacje ubite"
