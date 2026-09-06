#!/usr/bin/env bash
# użycie: ./sample-resources.sh <package> <platforma> <runId> <sekundy>
PKG=$1; PLATFORM=$2; RUN_ID=$3; DURATION=${4:-120}
OUT="data/resources/resources_${PLATFORM}_${RUN_ID}.csv"

echo "timestamp,platform,run_id,pss_mb,cpu_percent" > "$OUT"
END=$((SECONDS + DURATION))

while [ $SECONDS -lt $END ]; do
  PSS=$(adb shell dumpsys meminfo "$PKG" 2>/dev/null | grep "TOTAL PSS" | awk '{print $3}')
  [ -z "$PSS" ] && PSS=$(adb shell dumpsys meminfo "$PKG" 2>/dev/null | grep -m1 "TOTAL" | awk '{print $2}')
  CPU=$(adb shell top -b -n 1 2>/dev/null | grep "$PKG" | head -1 | awk '{print $9}')
  [ -n "$PSS" ] && echo "$(date +%s),$PLATFORM,$RUN_ID,$(echo "scale=2; $PSS/1024" | bc),${CPU:-0}" >> "$OUT"
  sleep 0.5
done

echo "✅ Zapisano: $OUT ($(wc -l < "$OUT") próbek)"