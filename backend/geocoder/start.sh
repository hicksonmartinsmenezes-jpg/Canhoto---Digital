#!/bin/sh
set -eu

python /app/preload.py

exec uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1
