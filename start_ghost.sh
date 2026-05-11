#!/bin/bash
cd /home/ubuntu/scripts-module
# Kill any existing processes on these ports first
sudo lsof -t -i:1818 -i:8006 | xargs sudo kill -9 || true
sleep 2
echo "Starting Backend on 8006..."
nohup backend/venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8006 > backend.log 2>&1 &
echo "Starting Frontend on 1818..."
cd frontend-v3
nohup npm run dev -- --host 0.0.0.0 --port 1818 > frontend.log 2>&1 &
echo "Processes started."
