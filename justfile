# ==============================================================================
# 🏠 DACHA-NA-UDACHU — Justfile
# Next.js 15 + Payload CMS 3 production
# ==============================================================================
set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]
set export
set positional-arguments
set quiet

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


# ---- APP ----
[doc("Build production bundle (output: .next/)")]
build:
    NEXT_TELEMETRY_DISABLED=1 npm run build

[doc("Start Next.js dev server (http://localhost:3000)")]
dev:
    npm run dev

[doc("Start Next.js production server (requires prior `just build`)")]
start:
    npm run start


# ---- DOCKER ----
[doc("Validate docker-compose.yml syntax")]
docker-validate:
    docker compose -f docker-compose.yml config

[doc("Build production Docker image locally")]
docker-build:
    docker build -t dacha-app:latest .

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


# ---- PRODUCTION (VPS) ----
[doc("Deploy to VPS: git pull + rebuild + restart containers")]
prod-deploy:
    #!/usr/bin/env bash
    set -e
    echo "📦 Pulling latest from main..."
    git pull origin main
    echo "🔨 Building and restarting containers..."
    docker compose -f docker-compose.yml down --remove-orphans
    docker compose -f docker-compose.yml up --build --detach
    echo "✅ Deploy complete"
    docker compose -f docker-compose.yml ps
