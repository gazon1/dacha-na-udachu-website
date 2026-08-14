# ==============================================================================
# 🏠 DACHA-NA-UDACHU — Justfile
# Next.js 15 + Payload CMS 3 production
# ==============================================================================
set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]
set export
set positional-arguments
set quiet

# Глобальные константы для деплоя
TAG := `git rev-parse --short HEAD`
CADDY_BASE := "/opt/caddy"
CONF_D := CADDY_BASE + "/conf.d"
PROJECT_DIR := justfile_directory()

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


# ---- PRODUCTION (VPS) DEPLOYMENT PIPELINE ----
[doc("Deploy to VPS: full pipeline via shared Caddy")]
prod-deploy: git-pull caddy-bootstrap caddy-config compose-up caddy-reload smoke-test clean

[doc("Step 1: Pull latest repository state")]
git-pull:
    @echo "📦 Pulling latest from main..."
    git pull origin main

[doc("Step 2: Idempotent initialization of global Caddy infrastructure")]
caddy-bootstrap:
    @echo "🌐 Verifying global network and Caddy..."
    docker network inspect caddy_net >/dev/null 2>&1 || docker network create --driver bridge caddy_net
    mkdir -p {{CONF_D}} {{CADDY_BASE}}/data {{CADDY_BASE}}/config
    [ -f {{CADDY_BASE}}/Caddyfile ] || cp deploy/caddy.bootstrap/Caddyfile {{CADDY_BASE}}/Caddyfile
    docker container inspect caddy_global >/dev/null 2>&1 || docker run -d \
        --name caddy_global --restart always --network caddy_net \
        -p 80:80 -p 443:443 -p 127.0.0.1:2019:2019 \
        -v {{CADDY_BASE}}/Caddyfile:/etc/caddy/Caddyfile:ro \
        -v {{CONF_D}}:/etc/caddy/conf.d:ro \
        -v {{CADDY_BASE}}/data:/data -v {{CADDY_BASE}}/config:/config \
        --cap-drop ALL --cap-add NET_BIND_SERVICE caddy:2-alpine
    docker start caddy_global >/dev/null 2>&1 || true

[doc("Step 3: Update routing config (validates without touching state)")]
caddy-config:
    @echo "📝 Updating project routing rules..."
    cp deploy/caddy.conf.caddy {{CONF_D}}/dacha.caddy
    docker exec caddy_global caddy validate --config /etc/caddy/Caddyfile

[doc("Step 4: Rebuild and restart project containers gracefully")]
compose-up:
    @echo "🔨 Deploying containers..."
    TAG={{TAG}} docker compose down --remove-orphans 2>/dev/null || true
    TAG={{TAG}} docker compose up -d --build
    @echo "⏳ Waiting for app healthchecks (relies on docker-compose healthcheck rules)..."
    docker compose wait app || echo "Compose wait finished (verify app logs if failed)"

[doc("Step 5: Apply new routes with zero downtime")]
caddy-reload:
    @echo "🔄 Reloading Caddy routes..."
    docker exec caddy_global caddy reload --config /etc/caddy/Caddyfile

[doc("Step 6: Verify endpoint connectivity")]
smoke-test:
    @echo "🚦 Running smoke tests..."
    curl -fsSI --max-time 10 "https://dacha.maxdrobin.ru/" > /dev/null
    @echo "✅ Deploy pipeline completed successfully."

[doc("Step 7: Free up disk space by removing unused Docker assets")]
clean:
    @echo "🧹 Removing stopped containers and dangling build cache..."
    docker system prune -f
    @echo "🗑️ Removing unused images older than 7 days (clearing old SHA-tagged releases)..."
    docker image prune -a -f --filter "until=168h"
    @echo "✨ System cleanup complete. Current disk space:"
    df -h / | tail -n 1
