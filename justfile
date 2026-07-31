# ==============================================================================
# 📋 GLOBAL SETTINGS
# ==============================================================================
set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]
set export
set positional-arguments
set quiet

# ==============================================================================
# 📦 MODULE IMPORTS
# ==============================================================================
import '.just/config.just'
import '.just/ai.just'
import '.just/bd.just'
import '.just/devcontainer.just'
import '.just/docker.just'
import '.just/wagtail.just'
import '.just/dacha.just'
import '.just/dacha-dev.just'


# ---- HELP ----
[doc("Show all available commands")]
default:
    @just --list --list-heading $'🎯 Available Commands:\n' --list-prefix '  • '


# ---- SETUP ----
[doc("Install Node dependencies (Payload CMS + Next.js at /workspace/)")]
[working-directory("/workspace")]
install-node:
    # `npm install` (not `npm ci`) so first run works without package-lock.json.
    # Once lockfile exists in repo, switch to `npm ci` for reproducible builds.
    npm install

[doc("Generate Payload TypeScript types from collections")]
[working-directory("/workspace")]
generate-types:
    npm run generate:types

[doc("Generate Payload admin importMap")]
[working-directory("/workspace")]
generate-importmap:
    npm run generate:importmap

[doc("Full setup: install + generate types + build")]
setup: install-node generate-types build


# ---- APP (Payload CMS + Next.js — single process) ----
[doc("Build production bundle (output: /workspace/.next/)")]
[working-directory("/workspace")]
build:
    NEXT_TELEMETRY_DISABLED=1 npx next build --debug

[doc("Start Next.js dev server with hot reload (Payload admin + frontend on http://localhost:3000)")]
[working-directory("/workspace")]
dev:
    PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000 npm run dev

[doc("Start Next.js production server (requires prior `just build`)")]
[working-directory("/workspace")]
start:
    NODE_ENV=production PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000 npm run start


# ---- LINT & FORMAT ----
[doc("Run all linters (ruff)")]
[working-directory("/workspace/backend")]
lint:
    uv run ruff check .
    uv run ruff format --check .

[doc("Auto-fix linting issues")]
[working-directory("/workspace/backend")]
lint-fix:
    uv run ruff check --fix .
    uv run ruff format .


# ---- TESTS ----
[doc("Run test suite with coverage")]
[working-directory("/workspace/backend")]
test:
    uv run pytest --cov --cov-report=term-missing --cov-fail-under=70

[doc("Run tests without coverage (fast)")]
[working-directory("/workspace/backend")]
test-quick:
    uv run pytest -v


# ---- DATABASE ----
[doc("Apply all migrations")]
[working-directory: "/workspace/backend"]
migrate:
    uv run python manage.py migrate

[doc("Create migrations for changed apps")]
[working-directory: "/workspace/backend"]
makemigrations *apps:
    uv run python manage.py makemigrations {{apps}}

[doc("Check for uncommitted migrations")]
[working-directory: "/workspace/backend"]
migration-check:
    uv run python manage.py makemigrations --check --dry-run


# ---- DJANGO ----
[doc("Run Django system checks")]
[working-directory("/workspace/backend")]
check:
    uv run python manage.py check

[doc("Run Django production deployment checks")]
[working-directory("/workspace/backend")]
check-deploy:
    uv run python manage.py check --deploy --settings=dacha.settings.production


[doc("Start Django development server")]
[working-directory: "/workspace/backend"]
runserver:
    uv run python manage.py runserver 0.0.0.0:8001


# ---- LOCAL DEV ----


# ---- DOCKER ----
[doc("Validate docker-compose.yml syntax")]
docker-validate:
    docker compose -f docker-compose.yml config

[doc("Build production Docker image (single image with Payload + Next.js)")]
docker-build:
    docker build -t dacha-payload:latest .

[doc("Build and tag by commit SHA for immutable deployments")]
docker-build-sha:
    #!/usr/bin/env bash
    set -e
    TAG=$(git rev-parse --short HEAD)
    docker build -t dacha-payload:$TAG .

[doc("Push image to GHCR (requires GHCR_TOKEN env var)")]
docker-push:
    #!/usr/bin/env bash
    TAG=$(git rev-parse --short HEAD)
    ghcr.io/$(gh api user --jq .login)/dacha-wagtail:$TAG
    docker tag dacha-wagtail:$TAG ghcr.io/$(gh api user --jq .login)/dacha-wagtail:$TAG
    echo $GHCR_TOKEN | docker login ghcr.io -u $(gh api user --jq .login) --password-stdin
    docker push ghcr.io/$(gh api user --jq .login)/dacha-wagtail:$TAG


# ---- PRODUCTION ENTRYPOINT ----
[working-directory("/workspace/backend")]
[doc("Production container entrypoint: migrate → createsuperuser → collectstatic → gunicorn")]
entrypoint: migrate create-superuser collectstatic run-gunicorn

[working-directory("/workspace/backend")]
create-superuser:
    #!/bin/bash
    if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
        echo "Creating superuser..."
        python manage.py createsuperuser \
            --noinput \
            --username "$DJANGO_SUPERUSER_USERNAME" \
            --email "$DJANGO_SUPERUSER_EMAIL" \
            || echo "Superuser already exists or failed to create"
    fi

[working-directory("/workspace/backend")]
collectstatic:
    echo "Collecting static files..."
    python manage.py collectstatic --noinput

[working-directory("/workspace/backend")]
run-gunicorn:
    echo "Starting Gunicorn..."
    exec gunicorn dacha.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile - --error-logfile -


# ---- INTERNATIONALISATION ----
[doc("Extract and compile translation messages")]
[working-directory("/workspace/backend")]
i18n: i18n-extract i18n-compile

[working-directory("/workspace/backend")]
i18n-extract:
    uv run python manage.py makemessages -l ru -l en

[working-directory("/workspace/backend")]
i18n-compile:
    uv run python manage.py compilemessages
