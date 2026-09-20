#!/usr/bin/env bash
# Użycie: ./reset-orders.sh
set -e

docker exec shop_db psql -U shop -d services_shop -q -c "DELETE FROM order_items; DELETE FROM orders;"
POZOSTALO=$(docker exec shop_db psql -U shop -d services_shop -t -A -c "SELECT count(*) FROM orders;")

echo "✅ Tabela zamówień wyzerowana (pozostało: $POZOSTALO)"
