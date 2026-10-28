#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
./setup-linux.sh --start
( sleep 2; if command -v xdg-open >/dev/null 2>&1; then xdg-open 'http://127.0.0.1:3457' >/dev/null 2>&1 || true; fi ) &
exec node server.js
