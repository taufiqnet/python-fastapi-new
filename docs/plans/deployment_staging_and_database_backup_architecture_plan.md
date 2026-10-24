# Implementation Plan: Live Deployment, Maintenance UX, Test Server Isolation & PostgreSQL Backup Architecture

**Target Platform**: ProERP Enterprise SaaS Platform  
**Scope**: 
1. Frontend Live Deployment Maintenance Screens & Messages
2. Isolated Staging/Test Server Architecture
3. PostgreSQL Database Backup (CLI, Automated Scripts & Admin Web UI)
4. Safe Offsite Encrypted Storage (3-2-1 Backup Strategy)
**Status**: Proposal & Strategy Review (Awaiting User Feedback & Approval)

---

## 1. Goal Description

Deploying an enterprise SaaS platform like ProERP requires high availability, zero unintended data loss, clear user communication during updates, and rigorous testing on an isolated staging environment before touching production.

This plan details:
- **Frontend Maintenance Communication**: What messages and UX to display during live updates, with automated health polling and edge intercepts.
- **Test Server Isolation**: How to configure and deploy a fully segregated staging/test environment running alongside or independent of production.
- **PostgreSQL Backup Workflows**:
  - Manual CLI commands for engineers & sysadmins.
  - Automated cron jobs with retention rotation.
  - A Superuser-facing Admin Web UI allowing point-and-click on-demand database snapshots.
- **Safe Storage**: Encryption (AES-256/GPG) and offsite object storage (S3/Cloudflare R2/Wasabi) with immutable retention policies.

---

## 2. Part 1: Frontend Maintenance & Live Deployment UX

### A. What Message & Screen to Show During Live Deployment?

When deploying backend migrations (`alembic upgrade head`) or rebuilding containers, users must **never** see broken pages, blank screens, or raw CORS/502/504 network errors.

#### Recommended Live Maintenance Screen Design:
```
+-----------------------------------------------------------------------+
|                              [ ProERP SaaS ]                          |
|                                                                       |
|                     🔄 System Upgrade in Progress                     |
|                                                                       |
|   We are currently deploying platform enhancements and database       |
|   schema optimizations to ensure faster, more reliable performance.   |
|                                                                       |
|   ⏳ Status: Applying updates (Estimated time: ~2-4 minutes)          |
|   🛡️ Data Integrity: Your data and transactions are 100% secure.       |
|                                                                       |
|   [==============================>                ] 65% Complete      |
|                                                                       |
|   This page will automatically refresh as soon as deployment finishes.|
|   Checking connection in: 8s...  [ Refresh Now ]                      |
|                                                                       |
|   Need urgent assistance? Contact enterprise support:                 |
|   support@proerp.com | Emergency Hotline: +880-1XXX-XXXXXX            |
+-----------------------------------------------------------------------+
```

### B. Two-Tier Implementation Strategy

#### Tier 1: Next.js In-App Maintenance Overlay & Auto-Reconnect
- When the Next.js app detects that the backend API is returning `503 Service Unavailable` or connection refused during health checks:
  - Displays a clean, branded modal/overlay preventing users from submitting forms while migrations run.
  - Automatically polls `/api/v1/health` every 5 seconds using an exponential backoff.
  - Re-enables the interface immediately once the backend reports healthy without requiring manual page refresh.

#### Tier 2: Edge Nginx Reverse Proxy Intercept (for full container restarts)
- If both Frontend and Backend containers are being rebuilt or restarted simultaneously, Nginx acts as the safety net:
  ```nginx
  # /etc/nginx/conf.d/proerp.conf
  error_page 502 503 504 /maintenance.html;

  location = /maintenance.html {
      root /var/www/proerp-static;
      internal;
  }
  ```
- Nginx returns HTTP status `503 Service Unavailable` with `Retry-After: 120`. (Crucial: prevents search engines from indexing broken 404/500 pages during deployments).

---

## 3. Part 2: Isolated Test / Staging Server Architecture

To ensure zero risk to production, the test/staging server must be **completely segregated** from production data, network, and ports.

```
       [ Public Internet / Developers / QA ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   [ Nginx / Reverse Proxy ]         [ Nginx / Reverse Proxy ]
   app.proerp.com                    staging.proerp.com / test.proerp.com
        │                                 │
   ┌────┴──────────────────────────┐ ┌────┴──────────────────────────┐
   │ PRODUCTION ENVIRONMENT        │ │ STAGING / TEST ENVIRONMENT    │
   │ .env.production               │ │ .env.staging                  │
   │                               │ │                               │
   │ - Frontend: port 3000         │ │ - Frontend: port 3001         │
   │ - Backend:  port 8000         │ │ - Backend:  port 8001         │
   │ - Postgres: port 5432 (Prod)  │ │ - Postgres: port 5433 (Test)  │
   │   Volume: postgres_prod_data  │ │   Volume: postgres_test_data  │
   └───────────────────────────────┘ └───────────────────────────────┘
```

### Key Isolation Invariants

| Dimension | Production (`app.proerp.com`) | Staging / Test (`staging.proerp.com`) |
| :--- | :--- | :--- |
| **Domain / URL** | `https://app.proerp.com` | `https://staging.proerp.com` |
| **Compose File** | `docker-compose.prod.yml` | `docker-compose.staging.yml` |
| **Host Ports** | Frontend: `3000`, API: `8000`, DB: `5432` | Frontend: `3001`, API: `8001`, DB: `5433` |
| **Database Name**| `proerp_production` | `proerp_staging` |
| **Volume Name** | `postgres_prod_data` | `postgres_staging_data` |
| **Data Masking** | Live real business data | Scrubbed/anonymized dummy data |
| **Git Branch** | `main` (Protected, requires PR + approval) | `develop` or `staging` (Auto-deployed) |

### Sample `docker-compose.staging.yml`
```yaml
services:
  api:
    build: .
    container_name: proerp_api_staging
    restart: unless-stopped
    ports:
      - "8001:8000"
    env_file:
      - .env.staging
    environment:
      DB_HOST: db
      APP_ENV: staging
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: proerp_frontend_staging
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://staging-api.proerp.com
    depends_on:
      - api

  db:
    image: postgres:16
    container_name: proerp_postgres_staging
    restart: unless-stopped
    env_file:
      - .env.staging
    ports:
      - "5433:5432"
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_staging_data:
```

---

## 4. Part 3: PostgreSQL Database Backup Methods

### A. Manual / Command Line Backups (For Sysadmins & Terminal)

#### 1. Instant Custom-Compressed Snapshot (`pg_dump -Fc`)
The recommended format is PostgreSQL Custom Archive (`-Fc`). It is compressed with zlib, supports parallel restoration (`pg_restore -j 4`), and allows selective table restores.

```bash
# Inside Docker host
docker exec -t fastapi_postgres pg_dump \
  -U postgres \
  -d fastapi \
  -Fc \
  -Z 9 \
  > /var/backups/proerp/proerp_backup_$(date +%Y%m%d_%H%M%S).dump
```

#### 2. SQL Plaintext Backup (gzipped):
```bash
docker exec -t fastapi_postgres pg_dump \
  -U postgres \
  -d fastapi | gzip -9 > /var/backups/proerp/proerp_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### 3. Database Restoration:
```bash
# Drop connections & restore cleanly from .dump file
docker exec -i fastapi_postgres pg_restore \
  -U postgres \
  -d fastapi \
  --clean \
  --if-exists \
  --no-owner \
  < /var/backups/proerp/proerp_backup_20261024_180000.dump
```

#### 4. Automated Daily Backup Shell Script (`scripts/backup_database.sh`):
```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/var/backups/proerp"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/proerp_db_${TIMESTAMP}.dump"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at ${TIMESTAMP}..."
docker exec -t fastapi_postgres pg_dump -U postgres -d fastapi -Fc -Z 9 > "${BACKUP_FILE}"

echo "[INFO] Backup created successfully: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# Prune local backups older than 7 days
find "${BACKUP_DIR}" -type f -name "proerp_db_*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[INFO] Cleaned backups older than ${RETENTION_DAYS} days."
```

---

### B. Admin Web UI Backup System (From Frontend by Superuser)

To allow business administrators or authorized DevOps superusers to create and download backups with a single click without accessing SSH:

```
[ Frontend: /administration/backups ]
              │
              │  POST /api/v1/system/backups (Superuser Only)
              ▼
[ Backend: app/modules/system/backups_router.py ]
              │
              │  Executes pg_dump asynchronously
              ▼
[ Local Secure Storage: /app/storage/backups/ ]
              │
              ├── Computes SHA-256 Checksum
              ├── Records in DB metadata table (system_backups)
              ▼
[ Frontend Table ] -> Displays backup size, date, download button & status
```

#### 1. Backend Database Model (`SystemBackup`):
```python
class SystemBackup(Base):
    __tablename__ = "system_backups"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    backup_type = Column(String(50), default="manual_admin") # manual_admin, scheduled_daily
    status = Column(String(50), default="completed") # pending, completed, failed
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
```

#### 2. Backend Security & RBAC:
- Restricted strictly to `user.is_superuser == True`.
- Emits audit log entry (`event="system_database_backup_generated"`, `ip_address`, `timestamp`).
- Download endpoint uses one-time signed cryptographic tokens with 60-second expiration.

#### 3. Frontend Admin Interface (`frontend/src/app/administration/backups/page.tsx`):
- Added to the sidebar under **Administration -> System Backups**.
- Includes:
  - **"Create Instant Backup"** action button.
  - Table of historical backups with date, size, checksum, and status.
  - Secure **"Download Backup (.dump)"** button.
  - **"Restore Warning"** modal explaining restoration procedures.

---

## 5. Part 4: Safe Offsite Storage & Encryption (3-2-1 Rule)

Storing database backups on the same server or disk where PostgreSQL runs is dangerous (disk failure or server compromise wipes out both database and backups).

### The 3-2-1 Enterprise Rule:
1. **3 Copies of Data**: Primary database, local backup snapshot, offsite cloud copy.
2. **2 Different Storage Media**: Server SSD + Cloud Object Storage (S3/R2).
3. **1 Offsite Copy**: Stored in a geographically separate cloud region.

### A. Pre-Upload Encryption (AES-256 / GPG)
Before sending the backup over the internet or storing it in the cloud, encrypt it with GPG or AES-256 so that cloud storage breaches cannot expose confidential tenant data:
```bash
# Encrypt with GPG symmetric passphrase
gpg --symmetric --cipher-algo AES256 \
    --batch --passphrase "$BACKUP_ENCRYPTION_KEY" \
    -o "${BACKUP_FILE}.enc" "${BACKUP_FILE}"
```

### B. Offsite Cloud Sync (AWS S3 / Cloudflare R2 / MinIO)
Using `aws-cli` or `rclone`:
```bash
# Upload encrypted backup to private S3 bucket
aws s3 cp "${BACKUP_FILE}.enc" \
  s3://proerp-production-backups/daily/ \
  --storage-class STANDARD_IA

# Enable S3 Object Lock (WORM - Write Once, Read Many):
# Prevents ransomware or unauthorized users from deleting or altering backups for 30 days!
```

---

## 6. Proposed Code Changes for Immediate Implementation

### Backend Component
#### [NEW] `app/modules/system/backups_models.py`
- Table definition for `SystemBackup` metadata tracking.

#### [NEW] `app/modules/system/backups_service.py`
- Service executing `pg_dump` via `asyncio.create_subprocess_exec`, calculating SHA-256 checksum, and managing backup files.

#### [NEW] `app/modules/system/backups_router.py`
- Endpoints:
  - `POST /api/v1/system/backups` (Create instant backup)
  - `GET /api/v1/system/backups` (List all backups)
  - `GET /api/v1/system/backups/{id}/download` (Stream secure backup download)

### Frontend Component
#### [NEW] `frontend/src/app/administration/backups/page.tsx`
- Administration backup management interface.

#### [MODIFY] `frontend/src/components/layout/sidebar.tsx`
- Add `System Backups` link under `Administration` section (superuser-only).

#### [NEW] `frontend/src/components/common/maintenance-banner.tsx`
- Standalone / overlay maintenance screen with automated health-check reloader.

### Deployment & Ops Component
#### [NEW] `docker-compose.staging.yml`
- Pre-configured staging compose file with isolated ports and volumes.

#### [NEW] `scripts/backup_database.sh`
- Automated CLI backup script with 7-day retention and S3 sync support.

---

## 7. Verification Plan

### Automated Tests
1. **Backend Tests**:
   - `tests/test_system_backups.py`:
     - Test that non-superusers receive 403 Forbidden on backup creation/download.
     - Test backup file creation, SHA-256 verification, and metadata record generation.
2. **Frontend Tests**:
   - Vitest test for backup admin dashboard rendering and download trigger.

### Manual Verification
1. Click **"Create Instant Backup"** in Admin UI -> Verify backup completes with progress indicator and appears in history table.
2. Download `.dump` file and verify integrity with `pg_restore -l backup.dump`.
3. Verify `docker-compose.staging.yml` starts up on isolated ports (3001, 8001, 5433) without port conflicts with production.
