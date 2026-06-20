#!/usr/bin/env bash
# Stop and remove the Prelegal container.
set -euo pipefail

docker rm -f prelegal 2>/dev/null || true
echo "Prelegal stopped."
