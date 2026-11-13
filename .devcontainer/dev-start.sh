#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"

mkdir -p "$LOG_DIR"
cd "$ROOT_DIR"

wait_for_mysql() {
  python - <<'PY'
import os
import socket
import sys
import time

host = os.environ.get("DB_HOST", "mysql")
port = int(os.environ.get("DB_PORT", "3306"))
deadline = time.time() + 120

while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=3):
            sys.exit(0)
    except OSError:
        time.sleep(2)

print(f"Timed out waiting for {host}:{port}", file=sys.stderr)
sys.exit(1)
PY
}

start_process() {
  process_name="$1"
  pid_file="$2"
  log_file="$3"
  shift 3

  if [ -f "$pid_file" ]; then
    existing_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "$process_name already running with PID $existing_pid"
      return 0
    fi
  fi

  nohup "$@" > "$log_file" 2>&1 < /dev/null &
  new_pid="$!"
  echo "$new_pid" > "$pid_file"
  echo "Started $process_name with PID $new_pid"
}

wait_for_mysql

echo "🤖 Downloading Toxicity Model in background..."
python -c '
from transformers import pipeline
import os
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
model_path = "citizenlab/distilbert-base-multilingual-cased-toxicity"
pipeline("text-classification", model=model_path, tokenizer=model_path)
' > "$LOG_DIR/hf_download.log" 2>&1 &

if [ -d "$ROOT_DIR/frontend" ]; then
  cd "$ROOT_DIR/frontend"
  if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
  fi
  cd "$ROOT_DIR"
else
  echo "ℹ️ frontend not found, skipping frontend startup"
fi

start_process "backend" "$BACKEND_PID_FILE" "$BACKEND_LOG" \
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

if [ -d "$ROOT_DIR/frontend" ]; then
  start_process "frontend" "$FRONTEND_PID_FILE" "$FRONTEND_LOG" \
    sh -c 'cd "$1" && npm run dev' sh "$ROOT_DIR/frontend"
fi

echo ""
echo "========================================="
echo "✅ Development environment ready!"
echo "========================================="
echo ""
echo "🌐 Frontend:  http://localhost:5173/"
echo "📚 API Docs:  http://localhost:8000/docs"
echo "🔧 Backend:   http://localhost:8000/health"
echo ""
echo "📋 Logs are available in $LOG_DIR/"
echo ""
echo "Frontend and backend were started automatically."
echo ""
echo "========================================="