#!/bin/sh
# Restore a backup produced by docker/postgres/backup.sh into the running postgres container.
# Usage: scripts/restore.sh /path/to/sombetini-YYYYMMDD-HHMMSS.sql.gz
# This REPLACES the current database. Stop the backend first: docker compose stop backend
set -eu

FILE="${1:?Pass the .sql.gz backup file}"
USER="${POSTGRES_USER:-sombetini}"
DB="${POSTGRES_DB:-sombetini_school}"

echo "Recreating database ${DB} from ${FILE}"
docker exec -i sombetini-postgres psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"${DB}\";" \
  -c "CREATE DATABASE \"${DB}\" OWNER \"${USER}\";"

gunzip -c "$FILE" | docker exec -i sombetini-postgres psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -q

echo "Applying any newer migrations"
docker compose run --rm backend npx prisma migrate deploy
echo "Restore complete. Start the API: docker compose start backend"
