#!/usr/bin/env bash
# użycie: ./sample-resources.sh <package> <platforma> <runId> <sekundy>
#
# RAM i CPU = proces główny aplikacji + procesy renderera WebView.
# Od Androida 8 WebView uruchamia renderer (V8, DOM, layout, dekodowanie obrazków)
# w osobnym, izolowanym procesie nazwanym od pakietu WebView, nie aplikacji, np.
# com.google.android.webview:sandboxed_process0:... — `dumpsys meminfo <pakiet>`
# i `grep <pakiet>` go nie widzą. Wersja 1 tego skryptu (sesje 1–6) liczyła tylko
# proces główny, więc RAM i CPU Ionica były zaniżone.
# React Native nie ma renderera: n_renderer = 0, kolumny *_renderer = 0.
#
# Renderer przypisujemy do aplikacji przez `dumpsys activity services <pakiet>`:
# usługa SandboxedProcessService jest rejestrowana na pakiet aplikacji-gospodarza,
# a jej `app=ProcessRecord{… <pid>:…}` wskazuje proces renderera. Po samej nazwie
# procesu się nie da — renderery wszystkich aplikacji nazywają się tak samo
# (na Xiaomi w tle działają np. com.miui.msa.global i com.mi.appfinder).
#
# <sekundy> to tylko górny limit — przebieg kończy `kill $SAMPLER` po Maestro.
PKG=$1; PLATFORM=$2; RUN_ID=$3; DURATION=${4:-120}
OUT="data/resources/resources_${PLATFORM}_${RUN_ID}.csv"

echo "timestamp,platform,run_id,pss_mb,cpu_percent,pss_main_mb,pss_renderer_mb,cpu_main,cpu_renderer,n_renderer" > "$OUT"
END=$((SECONDS + DURATION))

# Jedno wywołanie adb na próbkę: PSS procesu głównego, PSS każdego renderera tej
# aplikacji, potem top.
ZDALNIE="dumpsys meminfo $PKG | grep -m1 'TOTAL PSS'; \
dumpsys activity services $PKG | grep ' app=ProcessRecord' | grep sandboxed_process \
  | sed 's/.*ProcessRecord{[0-9a-f]* \([0-9]*\):.*/\1/' \
  | while read p; do echo \"R \$p \$(dumpsys meminfo \$p | grep -m1 'TOTAL PSS')\"; done; \
echo '==TOP'; top -b -n 1"

while [ $SECONDS -lt $END ]; do
  WIERSZ=$(adb shell "$ZDALNIE" 2>/dev/null | tr -d '\r' | awk -v pkg="$PKG" '
    /^==TOP/ { top = 1; next }
    !top && /^R / {
      # R <pid> TOTAL PSS: <kB> ...  (pusto, gdy proces zniknął w trakcie odczytu)
      if ($3 == "TOTAL" && !($2 in rpid)) { rpss += $5; rpid[$2] = 1; n++ }
      next
    }
    !top && /TOTAL PSS:/ && main == "" { main = $3; next }
    # top: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ ARGS
    top && cpu_main == "" && index($0, pkg) { cpu_main = $9; next }
    top && ($1 in rpid) { rcpu += $9 }
    END {
      if (main == "") exit
      # "0" bez części dziesiętnej = brak odczytu CPU (jak w wersji 1)
      cpu = (cpu_main == "") ? "0" : sprintf("%.1f", cpu_main + rcpu)
      printf "%.2f,%s,%.2f,%.2f,%s,%.1f,%d\n", (main + rpss) / 1024, cpu, main / 1024, rpss / 1024, (cpu_main == "" ? "0" : cpu_main), rcpu, n
    }')
  [ -n "$WIERSZ" ] && echo "$(date +%s),$PLATFORM,$RUN_ID,$WIERSZ" >> "$OUT"
  sleep 0.5
done

echo "✅ Zapisano: $OUT ($(($(wc -l < "$OUT") - 1)) próbek)"
