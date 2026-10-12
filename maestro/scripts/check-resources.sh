#!/usr/bin/env bash
# Użycie: ./check-resources.sh <fragment run_id>   np. ./check-resources.sh ses_07r
# Kontrola plików z sample-resources.sh (wersja 2): ile próbek, w ilu złapano renderer
# WebView i jakie są średnie PSS. Ionic: renderer w ~100% próbek. RN: zawsze 0%.
set -e

PLIKI=$(ls data/resources/resources_*"$1"*.csv 2>/dev/null || true)
[ -z "$PLIKI" ] && { echo "❌ Brak plików data/resources/resources_*$1*.csv"; exit 1; }

printf "%-42s %7s %10s %10s %10s %10s\n" "plik" "próbek" "renderer" "PSS gł." "PSS rend." "PSS razem"
for f in $PLIKI; do
  if ! head -1 "$f" | grep -q n_renderer; then
    printf "%-42s  ⚠️  stary format (bez renderera)\n" "$(basename "$f")"
    continue
  fi
  awk -F, -v nazwa="$(basename "$f")" 'NR > 1 {
      n++; if ($10 > 0) r++; gl += $6; rd += $7; raz += $4
    }
    END {
      if (n == 0) { printf "%-42s  ❌ pusty\n", nazwa; exit }
      printf "%-42s %7d %9.0f%% %10.1f %10.1f %10.1f\n", nazwa, n, 100 * r / n, gl / n, rd / n, raz / n
    }' "$f"
done
