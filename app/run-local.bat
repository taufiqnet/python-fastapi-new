@echo off
echo ==========================================================
echo  Starting Local SaaS Appliance (Docker Compose Windows)
echo ==========================================================

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker Desktop is not installed or not running.
    pause
    exit /b 1
)

echo [1/3] Building local containers...
docker compose -f docker-compose.offline.yml build

echo [2/3] Launching local appliance node...
docker compose -f docker-compose.offline.yml up -d

echo [3/3] Appliance status:
docker compose -f docker-compose.offline.yml ps

echo ==========================================================
echo  Local Node started successfully!
echo  Open browser at: http://localhost:8000
echo ==========================================================
pause
