#!/usr/bin/env bash
# Build and run the Prelegal container, serving the app at http://localhost:8000
set -euo pipefail

cd "$(dirname "$0")/.."

docker build -t prelegal .
docker rm -f prelegal 2>/dev/null || true
docker run -d --name prelegal -p 8000:8000 prelegal

echo "Prelegal is running at http://localhost:8000"
