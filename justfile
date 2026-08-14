# ==============================================================================
# 🏠 DACHA-NA-UDACHU — Justfile
# Next.js 15 + Payload CMS 3 production
# ==============================================================================
set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]
set export
set positional-arguments
set quiet

# ---- DEPLOY-COMMON -----------------------------------------------------------
TAG := `git rev-parse --short HEAD`
DEPLOY_COMMON := justfile_directory() / "lib" / "deploy-common"
PROJECT_CADDY_SNIPPET := "dacha"
SMOKE_URL := "https://dacha.maxdrobin.ru/"

# ---- HELP ----
[doc("Show all available commands")]
default:
    @just --list --list-heading $'🎯 Available Commands:\n' --list-prefix '  • '


# ---- SETUP ----
[doc("Install Node dependencies")]
install:
    npm install

[doc("Generate Payload TypeScript types from collections")]
generate-types:
    npm run generate:types

[doc("Generate Payload admin importMap")]
generate-importmap:
    npm run generate:importmap

[doc("Full setup: install + generate types + build")]
setup: install generate-types generate-importmap build


# ---- PAYLOAD / DB ----
[doc("Create a new Payload DB migration (interactive)")]
migrate-create:
    npm run payload migrate:create

[doc("Apply pending Payload DB migrations")]
migrate:
    npm run payload migrate

[doc("Start Next.js dev server (http://localhost:3000)")]
dev:
    npm run dev

# ---- APP ----
[doc("Build production bundle (output: .next/)")]
build:
    NEXT_TELEMETRY_DISABLED=1 npm run build


# ---- BOT ----
[doc("Install Telegram bot dependencies (bot/node_modules)")]
bot-install:
    cd bot && npm install

[doc("Run Telegram bot locally (long polling, http://localhost:3001/healthz)")]
bot-dev:
    cd bot && npm run dev


# ---- DOCKER ----
[doc("Build and tag by commit SHA for immutable deployments")]
docker-build:
    docker build -t dacha-app:{{TAG}} .
    docker tag dacha-app:{{TAG}} dacha-app:latest

[doc("Validate docker-compose.yml syntax")]
docker-validate:
    docker compose -f docker-compose.yml config

[doc("Build and tag by commit SHA for immutable deployments")]
docker-build-sha:
    #!/usr/bin/env bash
    set -e
    TAG=$(git rev-parse --short HEAD)
    docker build -t dacha-app:$TAG .

[doc("Push image to GHCR (requires GHCR_TOKEN env var)")]
docker-push:
    #!/usr/bin/env bash
    set -e
    TAG=$(git rev-parse --short HEAD)
    OWNER=$(gh api user --jq .login)
    echo $GHCR_TOKEN | docker login ghcr.io -u $OWNER --password-stdin
    docker tag dacha-app:$TAG ghcr.io/$OWNER/dacha-app:$TAG
    docker push ghcr.io/$OWNER/dacha-app:$TAG


# ---- PRODUCTION DEPLOY (delegates to deploy-common) --------------------------
[doc("Deploy to VPS: full pipeline via shared Caddy")]
prod-deploy: deploy-git-pull deploy-caddy-bootstrap deploy-caddy-config compose-up caddy-reload smoke-test clean
    @echo "✅ Deploy pipeline completed successfully."

[doc("Step 1: Pull latest repository state + init submodules")]
deploy-git-pull:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/lib/shared-functions.sh
    log "📦 Pulling latest from main..."
    git pull origin main
    log "📦 Updating deploy-common submodule..."
    git submodule update --init --recursive

[doc("Step 2: Idempotent initialization of global Caddy infrastructure")]
deploy-caddy-bootstrap:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/scripts/caddy-bootstrap.sh
    bootstrap_caddy

[doc("Step 3: Update routing config (validates without touching state)")]
deploy-caddy-config:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/lib/shared-functions.sh
    SNIPPET_SOURCE="deploy/caddy.conf.caddy"
    SNIPPET_TARGET="{{ deploy_caddy_confd }}/dacha.caddy"
    BACKUP="${SNIPPET_TARGET}.bak.$(date +%Y%m%d-%H%M%S)"
    log "📝 Updating project routing rules..."
    cp "$SNIPPET_SOURCE" "{{ deploy_caddy_confd }}/dacha.caddy"
    docker exec caddy_global caddy validate --config /etc/caddy/Caddyfile

# Variable used above
deploy_caddy_confd := env("CADDY_CONF_D", "/opt/caddy/conf.d")

[doc("Step 4: Rebuild and restart project containers gracefully")]
compose-up:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/lib/shared-functions.sh
    log "🔨 Deploying containers..."
    log "🧹 Freeing disk space before build..."
    docker system prune -f
    TAG={{TAG}} docker compose down --remove-orphans 2>/dev/null || true
    TAG={{TAG}} docker compose up -d --build
    log "⏳ Waiting for app healthchecks..."
    docker compose wait || echo "Compose wait finished (verify app logs if failed)"

[doc("Step 5: Apply new routes with zero downtime")]
caddy-reload:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/lib/shared-functions.sh
    log "🔄 Reloading Caddy routes..."
    docker exec caddy_global caddy reload --config /etc/caddy/Caddyfile

[doc("Step 6: Verify endpoint connectivity")]
smoke-test:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/lib/shared-functions.sh
    log "🚦 Running smoke tests..."
    curl -fsSI --max-time 10 "{{ SMOKE_URL }}" > /dev/null
    log "✅ Deploy pipeline completed successfully."

[doc("Step 7: Free up disk space by removing unused Docker assets")]
clean:
    #!/usr/bin/env bash
    set -euo pipefail
    source {{ DEPLOY_COMMON }}/lib/shared-functions.sh
    log "🧹 Removing stopped containers and dangling build cache..."
    docker system prune -f
    log "🗑️  Removing unused images older than 7 days..."
    docker image prune -a -f --filter "until=168h"
    log "✨ System cleanup complete. Current disk space:"
    df -h / | tail -n 1
