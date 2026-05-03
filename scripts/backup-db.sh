#!/usr/bin/env bash
# ── PostgreSQL Backup ──────────────────────────────────────────────────────────
# Runs pg_dump and stores a gzip-compressed dump in BACKUP_DIR.
#
# Modes:
#   Host (default):  POSTGRES_HOST is unset → uses `docker exec ravenna_postgres`
#   Container mode:  POSTGRES_HOST is set   → calls pg_dump directly
#
# Environment variables (all optional — sensible defaults shown):
#   POSTGRES_DB          projeto_ravenna
#   POSTGRES_USER        postgres
#   POSTGRES_PASSWORD    (empty)
#   POSTGRES_HOST        (empty = host mode via docker exec)
#   POSTGRES_PORT        5432
#   POSTGRES_CONTAINER   ravenna_postgres
#   BACKUP_DIR           ./backups
#   BACKUP_KEEP_DAYS     7
#
# Cron example (host) — edit with `crontab -e`:
#   0 2 * * * cd /opt/ProjetoRavenna && bash scripts/backup-db.sh >> /var/log/ravenna-backup.log 2>&1
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB="${POSTGRES_DB:-projeto_ravenna}"
USER="${POSTGRES_USER:-postgres}"
PASS="${POSTGRES_PASSWORD:-}"
HOST="${POSTGRES_HOST:-}"
PORT="${POSTGRES_PORT:-5432}"
CONTAINER="${POSTGRES_CONTAINER:-ravenna_postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE="${BACKUP_DIR}/${DB}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

if [ -z "${HOST}" ]; then
    echo "[backup] $(date -u +%FT%TZ) docker exec ${CONTAINER} → ${FILE}"
    docker exec -e PGPASSWORD="${PASS}" "${CONTAINER}" \
        pg_dump -U "${USER}" "${DB}" \
        | gzip > "${FILE}"
else
    echo "[backup] $(date -u +%FT%TZ) ${HOST}:${PORT}/${DB} → ${FILE}"
    PGPASSWORD="${PASS}" pg_dump \
        -h "${HOST}" -p "${PORT}" -U "${USER}" "${DB}" \
        | gzip > "${FILE}"
fi

SIZE=$(du -sh "${FILE}" 2>/dev/null | cut -f1)
echo "[backup] Saved ${FILE} (${SIZE})"

# Prune backups older than KEEP_DAYS
PRUNED=$(find "${BACKUP_DIR}" -name "${DB}_*.sql.gz" -mtime +"${KEEP_DAYS}" -print -delete 2>/dev/null | wc -l || echo 0)
echo "[backup] Pruned ${PRUNED} backup(s) older than ${KEEP_DAYS} days"
