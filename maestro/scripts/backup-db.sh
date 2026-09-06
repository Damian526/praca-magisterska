
OUT="data/db-backups/measurements_$(date +%Y%m%d_%H%M%S).sql"

docker exec shop_db pg_dump -U shop -d services_shop -t measurements > "$OUT"

echo "✅ Zapisano: $OUT"
