#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "   ⚡ TimeXer AI - Day-Ahead Solar Net-Load App Runner"
echo "=========================================================="

# Check node & python
export PATH="/home/minh/.local/node/bin:$PATH"

# Detect Python venv (prioritizing local environment)
if [ -d "$DIR/backend/.venv" ]; then
    PY="$DIR/backend/.venv/bin/python"
elif [ -d "$DIR/.venv" ]; then
    PY="$DIR/.venv/bin/python"
elif [ -d "$DIR/../TimeXer/.venv" ]; then
    PY="$DIR/../TimeXer/.venv/bin/python"
else
    PY="python3"
fi

echo "[1/2] Starting TimeXer FastAPI Backend on port 8001..."
cd "$DIR/backend"
PYTHONPATH="$DIR/backend" $PY -m uvicorn app.main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

echo "[2/2] Starting React Vite Frontend on port 3000..."
cd "$DIR/frontend"
npx vite --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

trap "echo 'Stopping TimeXer App...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

echo ""
echo "🚀 TimeXer App is running!"
echo "📱 Mobile App UI:  http://localhost:3000"
echo "📡 Backend API:    http://localhost:8001/docs"
echo "Press Ctrl+C to stop both servers."
echo "=========================================================="

wait
