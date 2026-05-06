#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
FRONTEND_DIR="$ROOT_DIR/frontend-v3"
FRONTEND_DIST_INDEX="$FRONTEND_DIR/dist/index.html"
PORT="${PORT:-8000}"

find_available_port() {
    "$VENV_DIR/bin/python" - "$1" <<'PY'
import socket
import sys

start = int(sys.argv[1])

for port in range(start, start + 25):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        if sock.connect_ex(("127.0.0.1", port)) != 0:
            print(port)
            raise SystemExit(0)

raise SystemExit(1)
PY
}

echo "Starting GHOST_SHELL Platform..."

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

if [ ! -x "$VENV_DIR/bin/python" ]; then
    echo "Creating backend virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

echo "Installing backend dependencies..."
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

needs_frontend_build=false
if [ ! -f "$FRONTEND_DIST_INDEX" ]; then
    needs_frontend_build=true
elif find "$FRONTEND_DIR/src" "$FRONTEND_DIR/index.html" "$FRONTEND_DIR/package.json" "$FRONTEND_DIR/package-lock.json" -newer "$FRONTEND_DIST_INDEX" -print -quit | grep -q .; then
    needs_frontend_build=true
fi

if [ "$needs_frontend_build" = true ]; then
    if ! command -v npm >/dev/null 2>&1; then
        echo "Error: npm is required to build the frontend."
        exit 1
    fi

    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm ci --prefix "$FRONTEND_DIR"
    fi

    echo "Building frontend bundle..."
    npm run build --prefix "$FRONTEND_DIR"
else
    echo "Frontend bundle is up to date."
fi

AVAILABLE_PORT="$(find_available_port "$PORT")"
if [ -z "$AVAILABLE_PORT" ]; then
    echo "Error: no free port found in range $PORT-$((PORT + 24))."
    exit 1
fi

if [ "$AVAILABLE_PORT" != "$PORT" ]; then
    echo "Port $PORT is busy. Switching to $AVAILABLE_PORT."
fi
PORT="$AVAILABLE_PORT"

echo "Starting full stack app on http://localhost:$PORT"
cd "$ROOT_DIR"
export PYTHONPATH="$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"
exec "$VENV_DIR/bin/uvicorn" backend.app.main:app --host 0.0.0.0 --port "$PORT" --reload
