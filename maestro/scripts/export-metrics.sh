#!/usr/bin/env bash
# użycie: ./export-metrics.sh [sessionId]
#   bez argumentu  -> cały zbiór
#   z argumentem   -> jedna sesja, np. ./export-metrics.sh ses_01
source "$(dirname "$0")/../../services-shop-api/.env"

SESSION=$1
OUT="data/metrics/metrics_${SESSION:-all}.csv"

curl -s -H "X-Admin-Token: $ADMIN_TOKEN" \
  "http://localhost:${PORT}/api/metrics/export.csv${SESSION:+?sessionId=$SESSION}" \
  -o "$OUT"

# awk liczy też ostatnią linię bez znaku końca — `wc -l` by ją zgubił.
N=$(awk 'END{print NR-1}' "$OUT")
echo "✅ Zapisano: $OUT ($N pomiarów)"
