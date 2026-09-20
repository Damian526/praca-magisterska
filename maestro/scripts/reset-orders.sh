#!/usr/bin/env bash
# użycie: ./reset-orders.sh
#
# Czyści tabelę zamówień do stanu zerowego.
#
# S3 tworzy 30 zamówień na przebieg, a ekran historii renderuje to, co zastanie.
# Bez zerowania druga platforma renderuje dłuższą listę niż pierwsza i wyniki
# przestają być porównywalne. Uruchamiaj przed KAŻDYM przebiegiem S3.
set -e

docker exec shop_db psql -U shop -d services_shop -q -c "DELETE FROM order_items; DELETE FROM orders;"
POZOSTALO=$(docker exec shop_db psql -U shop -d services_shop -t -A -c "SELECT count(*) FROM orders;")

echo "✅ Tabela zamówień wyzerowana (pozostało: $POZOSTALO)"
