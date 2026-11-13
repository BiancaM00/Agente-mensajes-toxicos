#!/usr/bin/env bash
set -euo pipefail

# Run Alembic migrations using project's configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v alembic >/dev/null 2>&1; then
  echo "alembic not found. Install requirements: pip install -r requirements.txt"
  exit 1
fi

echo "Running alembic upgrade head..."
alembic upgrade head

echo "Migrations applied."
