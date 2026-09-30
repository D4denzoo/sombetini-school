#!/bin/sh
# Nightly logical backup of the school database.
# Runs inside the `backup` service (postgres:16-alpine), so pg_dump matches the server version.
set -eu

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TARGET_HOUR="${BACKUP_HOUR_UTC:-23}"
mkdir -p /backups

run_backup() {
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  file="/backups/sombetini-${stamp}.sql.gz"
  tmp="${file}.part"
  if pg_dump --no-owner --no-privileges --format=plain | gzip -9 > "$tmp"; then
    mv "$tmp" "$file"
    echo "$(date -u +%FT%TZ) backup written ${file} ($(du -h "$file" | cut -f1))"
  else
    rm -f "$tmp"
    echo "$(date -u +%FT%TZ) backup FAILED" >&2
    return 1
  fi
  find /backups -name 'sombetini-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete
}

# Take one backup as soon as the service starts, then once a day at TARGET_HOUR UTC.
run_backup || true

while :; do
  now_hour="$(date -u +%H)"
  if [ "$now_hour" = "$(printf '%02d' "$TARGET_HOUR")" ]; then
    run_backup || true
    sleep 3600
  else
    sleep 300
  fi
done
