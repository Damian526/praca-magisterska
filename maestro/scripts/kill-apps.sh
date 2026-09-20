#!/usr/bin/env bash
# użycie: ./kill-apps.sh
#
# Ubija OBIE aplikacje testowe. Uruchamiaj przed KAŻDYM przebiegiem Maestro.
#
# Bez tego druga mierzona platforma startuje przy pierwszej siedzącej w tle
# (~280 MB rezydentnie), a pierwsza startowała bez niej — warunki przestają być
# symetryczne. Flow i tak sam uruchamia aplikację, którą mierzy.
#
# ⚠️ NIE ubijamy dev.mobile.maestro — to aplikacja sterująca, bez niej Maestro padnie.
set -e

adb shell am force-stop com.shopreactnative
adb shell am force-stop io.ionic.starter

POZOSTALE=$(adb shell "ps -A | grep -cE 'com.shopreactnative|io.ionic.starter'" | tr -d '\r')
if [ "$POZOSTALE" != "0" ]; then
  echo "⚠️  Któraś aplikacja nadal działa — sprawdź: adb shell ps -A | grep -E 'shopreactnative|ionic'"
  exit 1
fi

echo "✅ Obie aplikacje ubite"
