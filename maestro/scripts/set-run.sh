#!/usr/bin/env bash
# Użycie: ./set-run.sh <sessionId> <S1|S2|S3>
set -e

SESSION=$1
SCEN=$2

if [ -z "$SESSION" ] || [ -z "$SCEN" ]; then
  echo "użycie: ./set-run.sh <sessionId> <S1|S2|S3>   np. ./set-run.sh ses_01 S2"
  exit 1
fi
case "$SCEN" in
  S1|S2|S3) ;;
  *) echo "❌ scenariusz musi być S1, S2 albo S3 (podano: $SCEN)"; exit 1 ;;
esac

RN="shop-react-native/src/core/config.ts"
IO="shop-ionic/src/core/config.ts"

for f in "$RN" "$IO"; do
  [ -f "$f" ] || { echo "❌ brak pliku $f — uruchom z katalogu głównego repo"; exit 1; }
  # Cudzysłów przechwytujemy z pliku i oddajemy ten sam: RN pisze apostrofami,
  # Ionic cudzysłowami, a mieszanka wywala formatter.
  perl -pi -e "s/^(export const SESSION_ID = )(['\"]).*?\2;/\$1\$2$SESSION\$2;/" "$f"
  perl -pi -e "s/^(export const SCENARIO:.*? = )(['\"]).*?\2;/\$1\$2$SCEN\$2;/" "$f"
done

echo "✅ Ustawiono serię: $SESSION / $SCEN  (runId = ${SESSION}_${SCEN})"
grep -H "SESSION_ID\|SCENARIO:" "$RN" "$IO" | sed 's/^/   /'
echo
echo "⚠️ Teraz PRZEBUDUJ obie aplikacje — konfiguracja jest wkompilowana:"
echo "   cd shop-react-native && npx react-native run-android --mode=release --device \$DEVICE"
echo "   cd shop-ionic && npm run build && npx cap sync android && (cd android && ./gradlew installDebug)"
