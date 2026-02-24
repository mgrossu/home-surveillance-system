#!/usr/bin/env bash
# scripts/start-dev.sh
# Start backend + frontend dev servers for local laptop development.
# Browser webcam is used for preview (no RPi / MediaMTX needed).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Backend ───────────────────────────────────────────────────────────────────
echo "▶ Starting backend (DEV_MODE=true)..."
cd "$REPO_ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "  Creating virtualenv..."
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

DEV_MODE=true .venv/bin/uvicorn main:app \
  --host 0.0.0.0 --port 8008 --reload &

BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID (http://localhost:8008)"

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "▶ Starting frontend dev server..."
cd "$REPO_ROOT/frontend"
npm install --silent
VITE_API_URL=http://localhost:8008 npm run dev &

FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID (http://localhost:8080)"

echo ""
echo "✓ Dev stack running. Press Ctrl-C to stop both."

# Kill both on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
