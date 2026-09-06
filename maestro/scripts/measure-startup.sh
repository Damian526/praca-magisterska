
PKG=$1; PLATFORM=$2; N=${3:-30}
OUT="data/startup-os/startup_os_${PLATFORM}.csv"

echo "iteration,platform,this_time_ms,total_time_ms,wait_time_ms" > "$OUT"

for i in $(seq 1 "$N"); do
  adb shell am force-stop "$PKG"
  sleep 2
  R=$(adb shell am start -W -n "$PKG/.MainActivity" 2>/dev/null)
  TT=$(echo "$R" | grep "^TotalTime:" | awk '{print $2}')
  TH=$(echo "$R" | grep "^ThisTime:" | awk '{print $2}')
  WT=$(echo "$R" | grep "^WaitTime:" | awk '{print $2}')
  echo "$i,$PLATFORM,${TH:-},${TT:-},${WT:-}" >> "$OUT"
  echo "  $i/$N — TotalTime=${TT}ms"
  sleep 1
done

echo "✅ Zapisano: $OUT"