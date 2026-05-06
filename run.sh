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

# Ensure frontend dependencies are installed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --prefix "$FRONTEND_DIR"
fi

# Function to clean up background processes when the script stops
cleanup() {
    echo -e "\nShutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    exit
}
# Trigger the cleanup function when we press Ctrl+C
trap cleanup SIGINT SIGTERM EXIT

echo "Starting backend server on port 1818 in the background..."
cd "$ROOT_DIR"
export PYTHONPATH="$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"
"$VENV_DIR/bin/uvicorn" backend.app.main:app --host 0.0.0.0 --port 1818 --reload &
BACKEND_PID=$!

echo "Starting frontend dev server (port 8003) in the foreground..."
cd "$FRONTEND_DIR"
npm run dev -- --host 0.0.0.0
