#!/bin/sh
# Docker backup service entrypoint.
# Runs an immediate backup on start, then repeats every BACKUP_INTERVAL_SECONDS (default 24 h).
set -e

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

echo "[backup-service] $(date -u +%FT%TZ) Starting. Interval=${INTERVAL}s"

sh /scripts/backup-db.sh

while true; do
    sleep "${INTERVAL}"
    sh /scripts/backup-db.sh
done
