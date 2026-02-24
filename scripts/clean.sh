#!/usr/bin/env bash
# scripts/clean.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "▶ Stopping containers..."
podman-compose down 2>/dev/null || true

echo "▶ Removing frontend dist..."
rm -rf frontend/dist

echo "▶ Removing Python cache..."
find backend -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find backend -name "*.pyc" -delete 2>/dev/null || true

echo "✓ Clean."
