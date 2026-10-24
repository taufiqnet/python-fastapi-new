#!/usr/bin/env bash
# ==============================================================================
# ProERP SaaS - Production PostgreSQL Backup Script
# Creates a compressed, custom-format dump (-Fc) with SHA-256 checksum,
# rotates local copies older than RETENTION_DAYS, and optionally syncs to S3/R2.
# ==============================================================================
set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-./storage/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-fastapi_postgres}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-fastapi}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="proerp_backup_${DB_NAME}_${TIMESTAMP}.dump"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
CHECKSUM_FILEPATH="${BACKUP_FILEPATH}.sha256"

# Ensure target directory exists
mkdir -p "${BACKUP_DIR}"

echo "================================================================="
echo " [ProERP Backup] Starting database backup at ${TIMESTAMP}"
echo " Database: ${DB_NAME} | Container: ${CONTAINER_NAME}"
echo " Target:   ${BACKUP_FILEPATH}"
echo "================================================================="

# Execute pg_dump inside container with custom-format and max zlib compression
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker exec -t "${CONTAINER_NAME}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -Fc \
    -Z 9 \
    > "${BACKUP_FILEPATH}"
else
  echo "[ERROR] Container '${CONTAINER_NAME}' is not running! Aborting."
  exit 1
fi

# Verify file was created and is non-empty
if [ ! -s "${BACKUP_FILEPATH}" ]; then
  echo "[ERROR] Backup failed! File '${BACKUP_FILEPATH}' is missing or empty."
  exit 1
fi

# Generate SHA-256 checksum for data integrity verification
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${BACKUP_FILEPATH}" | awk '{print $1}' > "${CHECKSUM_FILEPATH}"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${BACKUP_FILEPATH}" | awk '{print $1}' > "${CHECKSUM_FILEPATH}"
fi

FILESIZE=$(du -h "${BACKUP_FILEPATH}" | cut -f1)
CHECKSUM=$(cat "${CHECKSUM_FILEPATH}" 2>/dev/null || echo "N/A")

echo "[SUCCESS] Backup completed successfully!"
echo " - File:     ${BACKUP_FILENAME}"
echo " - Size:     ${FILESIZE}"
echo " - SHA-256:  ${CHECKSUM}"

# Optional: Encrypt before offsite upload if BACKUP_ENCRYPTION_KEY is provided
if [ -n "${BACKUP_ENCRYPTION_KEY}" ]; then
  echo "[INFO] Encrypting backup with AES-256..."
  gpg --symmetric --cipher-algo AES256 --batch --yes \
      --passphrase "${BACKUP_ENCRYPTION_KEY}" \
      -o "${BACKUP_FILEPATH}.enc" "${BACKUP_FILEPATH}"
  echo "[INFO] Encrypted copy saved as: ${BACKUP_FILEPATH}.enc"
fi

# Optional: Upload to S3 / Cloudflare R2 if S3_BACKUP_BUCKET is set
if [ -n "${S3_BACKUP_BUCKET}" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "[INFO] Uploading to S3 bucket: ${S3_BACKUP_BUCKET}..."
    aws s3 cp "${BACKUP_FILEPATH}" "s3://${S3_BACKUP_BUCKET}/backups/${BACKUP_FILENAME}"
    [ -f "${CHECKSUM_FILEPATH}" ] && aws s3 cp "${CHECKSUM_FILEPATH}" "s3://${S3_BACKUP_BUCKET}/backups/${BACKUP_FILENAME}.sha256"
    echo "[INFO] S3 upload finished."
  else
    echo "[WARN] S3_BACKUP_BUCKET defined, but aws CLI not found. Skipping offsite sync."
  fi
fi

# Prune local backups older than RETENTION_DAYS
echo "[INFO] Pruning local backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "proerp_backup_*.dump*" -mtime "+${RETENTION_DAYS}" -delete
echo "[INFO] Backup routine complete."
