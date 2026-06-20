# Build and run the Prelegal container, serving the app at http://localhost:8000
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

docker build -t prelegal .
docker rm -f prelegal 2>$null

# Pass OPENROUTER_API_KEY (and any other .env values) into the container so the
# AI chat endpoint can reach OpenRouter.
$envArgs = @()
if (Test-Path .env) { $envArgs = @("--env-file", ".env") }
docker run -d --name prelegal -p 8000:8000 @envArgs prelegal

Write-Host "Prelegal is running at http://localhost:8000"
