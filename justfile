# =============================================================================
# justfile — dacha.maxdrobin.ru development tasks
# =============================================================================
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
[doc("Install Python dev dependencies via uv")]
install:
    uv sync --extra dev

[doc("Install frontend Node dependencies")]
install-node:
    npm ci

[doc("Full setup: Python + Node deps + frontend build")]
setup: install install-node frontend-build


# ---- FRONTEND ----
[doc("Build frontend assets (Vite → frontend/dist)")]
frontend-build:
    npm run build

[doc("Start Vite dev server with hot reload")]
frontend-dev:
    npm run dev


# ---- LINT & FORMAT ----
[doc("Run all linters (ruff, djlint)")]
lint:
    uv run ruff check .
    uv run ruff format --check .
    uv run djlint templates --check

[doc("Auto-fix linting issues")]
lint-fix:
    uv run ruff check --fix .
    uv run ruff format .
    uv run djlint templates --reformat


# ---- TESTS ----
[doc("Run test suite with coverage")]
test:
    uv run pytest --cov --cov-report=term-missing --cov-fail-under=70

[doc("Run tests without coverage (fast)")]
test-quick:
    uv run pytest -v


# ---- DATABASE ----
[doc("Apply all migrations")]
migrate:
    uv run python manage.py migrate

[doc("Create migrations for changed apps")]
makemigrations *apps:
    uv run python manage.py makemigrations {{apps}}

[doc("Check for uncommitted migrations")]
migration-check:
    uv run python manage.py makemigrations --check --dry-run


# ---- DJANGO ----
[doc("Run Django system checks")]
check:
    uv run python manage.py check

[doc("Run Django production deployment checks")]
check-deploy:
    uv run python manage.py check --deploy --settings=dacha.settings.production

[doc("Start Django development server")]
runserver:
    uv run python manage.py runserver 0.0.0.0:8000


# ---- DOCKER ----
[doc("Validate docker-compose.prod.yml syntax")]
docker-validate:
    docker compose -f docker-compose.prod.yml config

[doc("Build production Docker image")]
docker-build:
    docker build -f Dockerfile.prod -t dacha-wagtail:latest .

[doc("Build and tag by commit SHA for immutable deployments")]
docker-build-sha:
    #!/usr/bin/env bash
    set -e
    TAG=$(git rev-parse --short HEAD)
    docker build -f Dockerfile.prod -t dacha-wagtail:$TAG .

[doc("Push image to GHCR (requires GHCR_TOKEN env var)")]
docker-push:
    #!/usr/bin/env bash
    TAG=$(git rev-parse --short HEAD)
    ghcr.io/$(gh api user --jq .login)/dacha-wagtail:$TAG
    docker tag dacha-wagtail:$TAG ghcr.io/$(gh api user --jq .login)/dacha-wagtail:$TAG
    echo $GHCR_TOKEN | docker login ghcr.io -u $(gh api user --jq .login) --password-stdin
    docker push ghcr.io/$(gh api user --jq .login)/dacha-wagtail:$TAG


# ---- PRODUCTION ENTRYPOINT ----
[doc("Production container entrypoint: migrate → createsuperuser → collectstatic → gunicorn")]
entrypoint: migrate create-superuser collectstatic run-gunicorn

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

collectstatic:
    echo "Collecting static files..."
    python manage.py collectstatic --noinput

run-gunicorn:
    echo "Starting Gunicorn..."
    exec gunicorn dacha.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile - --error-logfile -


# ---- INTERNATIONALISATION ----
[doc("Extract and compile translation messages")]
i18n: i18n-extract i18n-compile

i18n-extract:
    uv run python manage.py makemessages -l ru -l en

i18n-compile:
    uv run python manage.py compilemessages
