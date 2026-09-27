#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Local SaaS Appliance Setup (Docker Compose)    "
echo "=========================================================="

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH."
    exit 1
fi

echo "[1/3] Pulling and building Docker containers..."
docker compose -f docker-compose.offline.yml build

echo "[2/3] Starting local appliance services..."
docker compose -f docker-compose.offline.yml up -d

echo "[3/3] Checking container health status..."
docker compose -f docker-compose.offline.yml ps

echo "=========================================================="
echo " Local Node successfully initialized!"
echo " Access local application at: http://localhost:8000"
echo "=========================================================="
