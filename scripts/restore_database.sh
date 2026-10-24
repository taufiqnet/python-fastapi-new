#!/usr/bin/env bash
# ==============================================================================
# ProERP SaaS - Disaster Recovery Database Restore Script
# Restores a PostgreSQL custom-archive (.dump) file into the specified database.
# ==============================================================================
set -eo pipefail

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_backup.dump> [target_database_name]"
  echo "Example: $0 ./storage/backups/proerp_backup_fastapi_20261024_180000.dump fastapi"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-fastapi_postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${2:-${DB_NAME:-fastapi}}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ERROR] Backup file '${BACKUP_FILE}' not found!"
  exit 1
fi

echo "================================================================="
echo " ⚠️  PROERP DATABASE RESTORE - DISASTER RECOVERY"
echo " Target DB:  ${DB_NAME} in container '${CONTAINER_NAME}'"
echo " Source:     ${BACKUP_FILE}"
echo "================================================================="
read -p "Are you ABSOLUTELY SURE you want to overwrite '${DB_NAME}'? (type 'RESTORE' to confirm): " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
  echo "Restore aborted by user."
  exit 0
fi

echo "[INFO] Terminating existing connections to '${DB_NAME}'..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true

echo "[INFO] Executing pg_restore (clean, if-exists, no-owner)..."
docker exec -i "${CONTAINER_NAME}" pg_restore \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  < "${BACKUP_FILE}"

echo "[SUCCESS] Database '${DB_NAME}' restored successfully from '${BACKUP_FILE}'."
