# ProERP SaaS Platform: cPanel Production Deployment Guide

This operational manual documents the step-by-step procedures for deploying and maintaining the **FastAPI Backend** and **Next.js Frontend** on a **cPanel (CloudLinux / LiteSpeed)** live production server.

---

## 1. Architectural Overview & System Requirements

ProERP operates as a decoupled architecture:
- **Backend API**: FastAPI (Python ASGI) running via CloudLinux "Setup Python App" using Phusion Passenger and the custom `passenger_wsgi.py` bridge.
- **Frontend App**: Next.js 16 (React 19) running standalone Node.js or proxied via Apache `.htaccess`.
- **Database**: PostgreSQL 14+ (Local cPanel PostgreSQL or remote managed PostgreSQL like AWS RDS / Supabase).
- **Subdomain Routing Scheme**:
  - Backend API: `https://api.yourdomain.com`
  - Frontend Web UI: `https://app.yourdomain.com` (or primary domain)

---

## 2. Server Preparation (cPanel Dashboard)

### 2.1 Subdomains & SSL Configuration
1. Log into your **cPanel** dashboard.
2. Navigate to **Domains > Domains**.
3. Create the two target subdomains:
   - `api.yourdomain.com` (Document Root: `/home/USERNAME/api.yourdomain.com`)
   - `app.yourdomain.com` (Document Root: `/home/USERNAME/app.yourdomain.com`)
4. Navigate to **Security > SSL/TLS Status** and run **AutoSSL** (or install Let's Encrypt certificates) for both subdomains. Both subdomains MUST serve HTTPS.

### 2.2 PostgreSQL Database Provisioning
1. Navigate to **Databases > PostgreSQL Databases**.
2. Create database: `proerp_live_db` (full name will be `USERNAME_proerp_live_db`).
3. Create user: `proerp_db_user` with a secure 32+ character alphanumeric password.
4. Add the user to the database and grant **ALL PRIVILEGES**.

---

## 3. Backend Deployment (FastAPI on cPanel)

### 3.1 Setup Python App
1. Go to **Software > Setup Python App** in cPanel.
2. Click **Create Application**:
   - **Python version**: Select `3.11` (or `3.10`).
   - **Application root**: `api.yourdomain.com`
   - **Application URL**: `api.yourdomain.com`
   - **Application startup file**: `passenger_wsgi.py`
   - **Application Entry point**: `application`
   - **Passenger log file**: `/home/USERNAME/api.yourdomain.com/passenger_app.log`
3. Click **Create**.
4. Note the virtual environment activation command displayed at the top of the page:
   ```bash
   source /home/USERNAME/virtualenv/api.yourdomain.com/3.11/bin/activate && cd /home/USERNAME/api.yourdomain.com
   ```

### 3.2 Code Upload & Virtual Environment Installation
1. Open **cPanel Terminal** (or connect via SSH):
   ```bash
   # Switch to the application directory
   cd ~/api.yourdomain.com

   # Pull the latest release code from GitHub
   git init
   git remote add origin https://github.com/your-org/python-fastapi-new.git
   git fetch origin
   git checkout main
   ```
2. Activate the virtual environment:
   ```bash
   source /home/USERNAME/virtualenv/api.yourdomain.com/3.11/bin/activate
   ```
3. Install production dependencies:
   ```bash
   pip install --upgrade pip setuptools wheel
   pip install -r requirements.txt
   pip install a2wsgi psycopg2-binary
   ```

### 3.3 Configure Production Environment (`.env`)
Create or edit `.env` inside `~/api.yourdomain.com/.env`:
```env
APP_ENV=production
DEBUG=False

# Database Configuration (PostgreSQL)
DB_NAME=USERNAME_proerp_live_db
DB_USER=USERNAME_proerp_db_user
DB_PASSWORD=YourSecureDatabasePassword
DB_HOST=127.0.0.1
DB_PORT=5432

# Security & Tokens
SECRET_KEY=generate_a_64_character_random_hex_string_here
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS Configuration (Must include live frontend URL)
BACKEND_CORS_ORIGINS=["https://app.yourdomain.com"]

# Optional AI Assistant Keys
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
```

### 3.4 Run Database Diagnostic & Health Check
Before restarting the web server, run the built-in diagnostic test to verify that database tables, schemas, and WSGI adapters initialize without deadlocks:
```bash
python cpanel_diag.py
```
**Expected diagnostic output:**
```text
=== 1. Load settings
    OK (0.01s) host='127.0.0.1' port=5432 db='...' user='...'
=== 2. Sync DB connect (psycopg2)
    OK (0.03s)
=== 3. Async DB connect (asyncpg)
    OK (0.04s)
=== 4. Count tables in public schema
    OK (0.02s) tables=52
=== 5. Import passenger_wsgi.application
    OK (0.15s)
```

### 3.5 Restarting the Backend
To apply any code or configuration update, restart the Passenger application:
```bash
cd ~/api.yourdomain.com
mkdir -p tmp && touch tmp/restart.txt
```
Alternatively, click the **Restart** button in the cPanel "Setup Python App" interface.

---

## 4. Frontend Deployment (Next.js on cPanel)

Building a Next.js application requires significant CPU and memory, which shared cPanel hosting often throttles. The recommended industry workflow is to **build locally or in GitHub Actions, then upload the standalone distribution**.

### 4.1 Local Build Step
On your local development machine:
1. Ensure `frontend/next.config.ts` includes `output: "standalone"`.
2. Configure the production API URL:
   ```bash
   cd frontend
   
   # Set the backend URL to the live API subdomain
   export NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
   
   # Clean previous builds and run production build
   npm run build
   ```
3. Run the automated packaging script:
   ```bash
   bash ../scripts/package_cpanel_frontend.sh
   ```
   This generates a clean distribution archive: `frontend_cpanel_dist.tar.gz`.

### 4.2 Deploying to cPanel
1. Upload `frontend_cpanel_dist.tar.gz` to `/home/USERNAME/app.yourdomain.com/` using cPanel File Manager or SCP.
2. In the terminal:
   ```bash
   cd ~/app.yourdomain.com
   tar -xzf frontend_cpanel_dist.tar.gz
   rm frontend_cpanel_dist.tar.gz
   ```
3. In **cPanel > Software > Setup Node.js App**:
   - Create or edit the Node.js application for `app.yourdomain.com`.
   - **Node.js Version:** `20.x`
   - **Application Mode:** `Production`
   - **Application Root:** `app.yourdomain.com`
   - **Application Startup File:** `server.js`
4. Click **Restart**.

### 4.3 Alternative: Apache Reverse Proxy (`.htaccess`)
If running the Next.js standalone server as a PM2 service on port `3000`, place this `.htaccess` file inside `~/app.yourdomain.com/.htaccess`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\.well-known
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

---

## 5. Incremental Module Activation (One-by-One Rollout)

Do not deploy partial files. To roll out modules one-by-one:
1. **Physical Codebase**: The entire codebase is deployed safely to the server.
2. **Access Control**: Modules are enabled for business tenants using **Role-Based Access Control (RBAC)** in **Administration > Roles & Permissions**:
   - **Phase 1 Activation:** Assign `hrm:departments:*`, `hrm:job_titles:*`, `hrm:employees:*`, `hrm:documents:*`.
   - **Phase 2 Activation (T+14 Days):** Assign `hrm:attendance:*`, `hrm:roster:*`, `hrm:leave_types:*`, `hrm:leave_allocations:*`, `hrm:leave_applications:*`.
   - **Phase 3 Activation (T+28 Days):** Assign `hrm:compensation:*`, `hrm:payroll_periods:*`, `hrm:payroll_records:*`.
3. Users only see navigation items and can only call API endpoints for modules that have been explicitly enabled for their role.

---

## 6. Maintenance & Troubleshooting Runbook

### Passenger Hanging or 504 Gateway Timeout
- **Cause:** LiteSpeed forks worker processes. Threads created before the fork do not survive, causing requests to hang indefinitely.
- **Solution:** ProERP's `passenger_wsgi.py` already includes a lazy `_get_wsgi_handler()` implementation that recreates the `a2wsgi` bridge inside each child worker process. If a hang occurs, inspect `stack_dump.log`:
  ```bash
  kill -USR1 <passenger_pid>
  cat stack_dump.log
  ```

### Database Connection Limit Exceeded
- **Cause:** Each Passenger worker process holds database connection pool sockets.
- **Solution:** Verify in `passenger_wsgi.py` that `engine.dispose(close=False)` is executed upon worker spawn to release inherited sockets from the master process.

### Live Error Logs
- **Backend Error Log:** `/home/USERNAME/api.yourdomain.com/passenger_app.log`
- **Apache/LiteSpeed Error Log:** cPanel > **Metrics > Errors**

