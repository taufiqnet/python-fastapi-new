#!/usr/bin/env bash
# ==============================================================================
# ProERP Next.js Frontend Standalone Packaging Script for cPanel
# Run this script on your local machine or CI before uploading to cPanel.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

cd "$FRONTEND_DIR"

echo "========================================================"
echo "📦 Packaging ProERP Next.js Frontend for cPanel"
echo "Directory: $FRONTEND_DIR"
echo "========================================================"

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "⚠️ Warning: NEXT_PUBLIC_API_URL is not set. Defaulting to https://api.wbsoftbd.com"
    export NEXT_PUBLIC_API_URL="https://api.wbsoftbd.com"
fi
echo "🔗 Target API URL: $NEXT_PUBLIC_API_URL"

# 1. Install dependencies
echo "📥 Installing frontend dependencies..."
npm install

# 2. Build standalone output
echo "⚙️ Building Next.js application in standalone mode..."
npm run build

# 3. Create packaging directory
DIST_DIR="$ROOT_DIR/frontend_dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "📁 Assembling standalone distribution files..."
# Copy standalone server and files
cp -r .next/standalone/* "$DIST_DIR/"
cp -r .next/standalone/.* "$DIST_DIR/" 2>/dev/null || true

# Copy static assets and public folder (required by Next.js standalone runner)
mkdir -p "$DIST_DIR/.next"
cp -r .next/static "$DIST_DIR/.next/"
cp -r public "$DIST_DIR/"

# 4. Create compressed tarball
ARCHIVE_NAME="frontend_cpanel_dist.tar.gz"
echo "🗜️ Creating archive: $ARCHIVE_NAME..."
cd "$DIST_DIR"
tar -czf "$ROOT_DIR/$ARCHIVE_NAME" .

echo "========================================================"
echo "✅ Build & Packaging Complete!"
echo "Archive location: $ROOT_DIR/$ARCHIVE_NAME"
echo ""
echo "Next Steps for cPanel:"
echo "1. Upload '$ARCHIVE_NAME' to ~/app.yourdomain.com/ on cPanel."
echo "2. Extract: tar -xzf $ARCHIVE_NAME"
echo "3. Restart the Node.js application in cPanel Setup Node.js App."
echo "========================================================"

