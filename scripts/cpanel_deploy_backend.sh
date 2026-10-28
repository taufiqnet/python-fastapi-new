#!/usr/bin/env bash
# ==============================================================================
# ProERP cPanel Backend Automated Deployment Script
# Run this script inside the cPanel Terminal or over SSH.
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "========================================================"
echo "🚀 Starting ProERP Backend Deployment on cPanel"
echo "Working Directory: $APP_DIR"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"

# 1. Pull latest changes from git
if [ -d ".git" ]; then
    echo "📥 Pulling latest release from Git..."
    git pull origin main
else
    echo "⚠️ Git repository not found in current directory. Skipping git pull."
fi

# 2. Check and activate virtualenv
if [ -n "$VIRTUAL_ENV" ]; then
    echo "✅ Using active Virtualenv: $VIRTUAL_ENV"
else
    echo "🔍 Looking for cPanel virtualenv..."
    # Standard CloudLinux virtualenv paths
    POSSIBLE_VENV=$(find ~/virtualenv/ -maxdepth 3 -type d -name "bin" 2>/dev/null | head -n 1 | sed 's#/bin##')
    if [ -n "$POSSIBLE_VENV" ] && [ -f "$POSSIBLE_VENV/bin/activate" ]; then
        echo "✅ Activating virtualenv: $POSSIBLE_VENV"
        source "$POSSIBLE_VENV/bin/activate"
    else
        echo "⚠️ Could not auto-detect virtualenv. Please ensure your virtualenv is active!"
    fi
fi

# 3. Upgrade pip and install requirements
echo "📦 Installing / updating Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install a2wsgi psycopg2-binary

# 4. Run diagnostic health check
echo "🩺 Running pre-flight diagnostic health check..."
if [ -f "cpanel_diag.py" ]; then
    python cpanel_diag.py
else
    echo "⚠️ cpanel_diag.py not found, skipping diagnostic check."
fi

# 5. Restart Passenger Application
echo "🔄 Reloading Passenger WSGI application..."
mkdir -p tmp
touch tmp/restart.txt

echo "========================================================"
echo "✅ ProERP Backend successfully deployed and restarted!"
echo "Check logs at: passenger_app.log"
echo "========================================================"

