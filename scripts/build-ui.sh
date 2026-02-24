#!/usr/bin/env bash
# scripts/build-ui.sh
# Build the frontend and put the dist where the backend expects it.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$REPO_ROOT/frontend"

echo "▶ Installing frontend dependencies..."
cd "$FRONTEND"
npm install

echo "▶ Building frontend..."
npm run build

echo "✓ Built to $FRONTEND/dist"
echo "  The backend will serve it automatically at http://<host>:8008/"
