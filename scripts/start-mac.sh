#!/usr/bin/env bash
# Build and run the Prelegal container, serving the app at http://localhost:8000
set -euo pipefail

cd "$(dirname "$0")/.."

docker build -t prelegal .
docker rm -f prelegal 2>/dev/null || true

# Pass OPENROUTER_API_KEY (and any other .env values) into the container so the
# AI chat endpoint can reach OpenRouter.
if [ -f .env ]; then
  docker run -d --name prelegal -p 8000:8000 --env-file .env prelegal
else
  docker run -d --name prelegal -p 8000:8000 prelegal
fi

echo "Prelegal is running at http://localhost:8000"
