#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
task_python="${PYTHON_BIN:-python3}"
if [[ ! -x .venv/bin/python ]]; then
  "$task_python" -m venv .venv
fi
.venv/bin/python -m pip install -r requirements.txt
task_host="${ASSISTANT_HOST:-127.0.0.1}"
task_port="${ASSISTANT_PORT:-8767}"
printf '访问 http://%s:%s/assistant\n按 Control+C 停止服务。\n' "$task_host" "$task_port"
exec .venv/bin/python -m uvicorn app:app --host "$task_host" --port "$task_port"
