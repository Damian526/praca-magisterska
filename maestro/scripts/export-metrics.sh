#!/usr/bin/env bash
# Użycie: ./export-metrics.sh [sessionId]
source "$(dirname "$0")/../../services-shop-api/.env"

SESSION=$1
OUT="data/metrics/metrics_${SESSION:-all}.csv"

curl -s -H "X-Admin-Token: $ADMIN_TOKEN" \
  "http://localhost:${PORT}/api/metrics/export.csv${SESSION:+?sessionId=$SESSION}" \
  -o "$OUT"

N=$(awk 'END{print NR-1}' "$OUT")
echo "✅ Zapisano: $OUT ($N pomiarów)"
