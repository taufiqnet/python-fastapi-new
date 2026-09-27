# Offline-First PWA Sync & Local Appliance Guide

This document explains the architecture, configuration, conflict resolution strategy, and local deployment procedures for the **Offline-First PWA** and **Local Docker Appliance** modes.

---

## 1. Overview & Architecture

To support regions with frequent power outages and network instability (loadshedding), the application supports two complementary offline operational modes:

1. **Offline-First Browser PWA:**
   - Uses Web App Manifest (`manifest.json`) and Service Worker (`sw.js`) to cache static app shell assets (HTML, CSS, JS, icons).
   - Uses IndexedDB (via Dexie.js) to store local entities and manage an outbox queue (`sync_queue`).
   - Integrates a visual connection badge (🟢 **Online & Synced**, 🟡 **Offline**, 🔄 **Syncing**).

2. **Alternative Local Docker Appliance Node:**
   - Runs a local instance of the application + database bound to `http://localhost:8000` via `docker-compose.offline.yml`.
   - Includes a background daemon (`sync_agent.py`) that monitors upstream cloud connectivity and synchronizes pending mutations when internet is restored.

---

## 2. Granting Offline Access to Customers

Offline mode is controlled via a user/tenant feature flag (`can_use_offline_mode`).

### Enabling Offline Mode for a User Account:
- **API Request:**
  ```http
  PUT /users/{user_id}
  Content-Type: application/json

  {
    "can_use_offline_mode": true
  }
  ```
- **Profile Check:**
  Call `GET /api/v1/users/me` or `/auth/me` to verify user entitlement. The response will include:
  ```json
  {
    "id": 1,
    "username": "demouser",
    "can_use_offline_mode": true,
    "is_offline_sync_enabled": true
  }
  ```

---

## 3. Conflict Resolution & Data Sync Protocol

### Conflict Resolution Strategy: Last-Write-Wins (LWW)
- Every offline transactional entity (`Task`, `Order`, `SalesInvoice`) includes:
  - `client_uuid`: Client-generated UUID preventing primary key collision during offline creation.
  - `client_updated_at`: Timestamp recorded on the client device at time of mutation.
  - `is_deleted`: Soft-delete flag (hard deletes are disallowed in offline sync to prevent broken references).

### Batch Sync Push (`POST /api/v1/sync/push`):
- Accepts array of mutations:
  ```json
  {
    "mutations": [
      {
        "entity": "orders",
        "action": "CREATE",
        "client_uuid": "e3b0c442-98fc-11ee-b9d1-0242ac120002",
        "client_updated_at": "2026-03-31T12:00:00Z",
        "payload": {
          "total_amount": 150.00
        }
      }
    ]
  }
  ```
- **Last-Write-Wins Execution:**
  - If server record exists: compares `client_updated_at` with server `updated_at`.
  - If `client_updated_at >= server.updated_at`: mutation is applied (updated or soft-deleted).
  - If server record is newer: mutation is skipped and status `"skipped"` is returned.

### Delta Sync Pull (`GET /api/v1/sync/pull?since={iso_timestamp}`):
- Returns all entities created, modified, or soft-deleted on the server since the given timestamp for the authenticated tenant.

---

## 4. Alternative Local Docker Appliance Setup

For remote shops or enterprise customers requiring a dedicated local server on premises:

### Prerequisites:
- Docker Desktop or Docker Engine + Docker Compose installed on the local machine.

### Quick Start (Linux / macOS):
```bash
chmod +x setup-local-node.sh
./setup-local-node.sh
```

### Quick Start (Windows):
Double-click `run-local.bat` or run in Command Prompt:
```cmd
run-local.bat
```

### Operational Behavior:
- Bound to `http://localhost:8000`.
- Local PostgreSQL database container stores transactions locally when cloud broadband is disconnected.
- `sync_agent.py` background worker periodically checks `CLOUD_API_URL`. When online, it pushes local outbox mutations and pulls upstream updates automatically.
