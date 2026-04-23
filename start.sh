#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Kill both child processes on Ctrl+C or exit
cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "[stack] Starting backend..."
(cd "$ROOT/backend" && node index.js) &
BACKEND_PID=$!

echo "[stack] Starting frontend..."
npm run dev --prefix "$ROOT/frontend" &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
