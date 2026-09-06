#!/usr/bin/env bash
# użycie: ./export-metrics.sh [runId]
source "$(dirname "$0")/../../services-shop-api/.env"

RUN_ID=$1
OUT="data/metrics/metrics_${RUN_ID:-all}.csv"

curl -s -H "X-Admin-Token: $ADMIN_TOKEN" \
  "http://localhost:${PORT}/api/metrics/export.csv${RUN_ID:+?runId=$RUN_ID}" \
  -o "$OUT"

echo "✅ Zapisano: $OUT ($(wc -l < "$OUT") wierszy)"
