# ==============================================================================
# 🏠 DACHA LOCAL DEVELOPMENT  (justfile-based, no Docker multi-stage build)
# Requirements: uv (Python), npm (Node.js), postgres running locally
# ==============================================================================

# Detect OS for path helpers
OS := if os() == "macos" { "darwin" } else { "linux" }

# Paths
PROJECT_DIR := "/workspace/backend"
WEB_DIR := "/workspace/frontend"
FRONTEND_DIR := WEB_DIR

# Environment
DOTENV := env("DOTENV", ".env")
PYTHON := "python"
DJANGO_SETTINGS := env("DJANGO_SETTINGS_MODULE", "dacha.settings.dev")

# ---- HELPERS ----

[group('dev')]
[doc('Show current environment status')]
dev-status:
    #!/usr/bin/env bash
    echo "Python: $(python --version 2>&1)"
    echo "uv:     $(uv --version 2>&1)"
    echo "Node:   $(node --version 2>&1)"
    echo "npm:    $(npm --version 2>&1)"
    echo "Postgres: $(pg_isready -h localhost -p 5432 2>&1 || echo 'not running')"
    echo ""
    echo "DJANGO_SETTINGS={{ DJANGO_SETTINGS }}"
    echo "DATABASE: ${POSTGRES_DB:-cms_db} on ${POSTGRES_HOST:-localhost}:${POSTGRES_PORT:-5432}"

# ---- PYTHON / UV ----

[group('dev')]
[doc('Install/update Python dependencies via uv')]
[working-directory(PROJECT_DIR)]
dev-install:
    uv sync --extra dev

[group('dev')]
[doc('Sync without dev extras (production-like)')]
[working-directory(PROJECT_DIR)]
dev-install-prod:
    uv sync --no-dev

[group('dev')]
[doc('Add a Python dependency')]
dev-dep PKG='':
    #!/usr/bin/env bash
    if [ -z "{{ PKG }}" ]; then
        echo "Usage: just dep <package>"
        exit 1
    fi
    cd {{ PROJECT_DIR }}
    uv add {{ PKG }}

[group('dev')]
[doc('Add a dev-only dependency')]
dev-dep-dev PKG='':
    #!/usr/bin/env bash
    if [ -z "{{ PKG }}" ]; then
        echo "Usage: just dep-dev <package>"
        exit 1
    fi
    cd {{ PROJECT_DIR }}
    uv add --dev {{ PKG }}

# ---- FRONTEND / NODE ----

[group('dev')]
[doc('Install Node dependencies for Next.js')]
[working-directory(WEB_DIR)]
dev-install-node:
    npm ci

[group('dev')]
[doc('Build Next.js for production')]
[working-directory(WEB_DIR)]
dev-build:
    npm run build

[group('dev')]
[doc('Build Next.js with type checking')]
[working-directory(WEB_DIR)]
dev-build-check:
    npm run build -- --no-lint 2>&1 || npm run build

[group('dev')]
[doc('Type-check Next.js (no emit)')]
[working-directory(WEB_DIR)]
dev-tsc:
    npx tsc --noEmit

# ---- DJANGO ----

[group('dev')]
[doc('Run Django system checks')]
[working-directory(PROJECT_DIR)]
dev-check:
    uv run python manage.py check

[group('dev')]
[doc('Run Django deployment checks')]
[working-directory(PROJECT_DIR)]
dev-check-deploy:
    uv run python manage.py check --deploy --settings=dacha.settings.production

[group('dev')]
[doc('Run all migrations')]
[working-directory(PROJECT_DIR)]
dev-migrate:
    uv run python manage.py migrate

[group('dev')]
[doc('Create migrations for APP')]
[working-directory(PROJECT_DIR)]
dev-makemigrations APP='':
    #!/usr/bin/env bash
    cd {{ PROJECT_DIR }}
    if [ -z "{{ APP }}" ]; then
        uv run python manage.py makemigrations
    else
        uv run python manage.py makemigrations {{ APP }}
    fi

[group('dev')]
[doc('Show migration status')]
[working-directory(PROJECT_DIR)]
dev-showmigrations:
    uv run python manage.py showmigrations

[group('dev')]
[doc('Create Django superuser')]
[working-directory(PROJECT_DIR)]
dev-createsuperuser:
    uv run python manage.py createsuperuser

[group('dev')]
[doc('Collect static files')]
[working-directory(PROJECT_DIR)]
dev-collectstatic:
    uv run python manage.py collectstatic --noinput

# ---- LINT & FORMAT ----

[group('dev')]
[doc('Run ruff linter')]
[working-directory(PROJECT_DIR)]
dev-lint:
    uv run ruff check .

[group('dev')]
[doc('Auto-fix lint issues')]
[working-directory(PROJECT_DIR)]
dev-lint-fix:
    uv run ruff check --fix .
    uv run ruff format .

# ---- TESTS ----

[group('dev')]
[doc('Run tests with coverage')]
[working-directory(PROJECT_DIR)]
dev-test:
    uv run pytest --cov --cov-report=term-missing --cov-fail-under=60 -v

[group('dev')]
[doc('Run tests fast (no coverage)')]
[working-directory(PROJECT_DIR)]
dev-test-fast:
    uv run pytest -v

[group('dev')]
[doc('Run only tests for changed files')]
[working-directory(PROJECT_DIR)]
dev-test-changed:
    uv run pytest -v --changed-files

# ---- DEV SERVERS ----

[group('dev')]
[doc('Start Django dev server on :8001')]
[working-directory(PROJECT_DIR)]
dev-runserver:
    uv run python manage.py runserver 0.0.0.0:8001

[group('dev')]
[doc('Start Next.js dev server (http://localhost:3000)')]
[working-directory(WEB_DIR)]
dev-frontend-dev:
    npm run dev

[group('dev')]
[doc('Start both Django + Next.js (two terminals)')]
dev-start:
    #!/usr/bin/env bash
    echo "Starting Django on :8001..."
    (cd {{ PROJECT_DIR }} && uv run python manage.py runserver 0.0.0.0:8001) &
    echo "Starting Next.js on :3000..."
    (cd {{ WEB_DIR }} && npm run dev) &
    echo ""
    echo "🌐 Django:  http://localhost:8001"
    echo "🎨 Next.js: http://localhost:3000"

# ---- I18N ----

[group('dev')]
[doc('Extract translation strings')]
[working-directory(PROJECT_DIR)]
dev-i18n-extract:
    uv run python manage.py makemessages -l ru -l en

[group('dev')]
[doc('Compile translation .mo files')]
[working-directory(PROJECT_DIR)]
dev-i18n-compile:
    uv run python manage.py compilemessages

# ---- CLEANUP ----

[group('dev')]
[doc('Remove Python cache files')]
[working-directory(PROJECT_DIR)]
dev-clean-py:
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
    rm -rf {{ PROJECT_DIR }}/.venv/__pycache__ 2>/dev/null || true

[group('dev')]
[doc('Remove Next.js build artifacts')]
[working-directory(WEB_DIR)]
dev-clean-next:
    rm -rf .next
    rm -rf node_modules/.cache 2>/dev/null || true

[group('dev')]
[doc('Remove all build artifacts (Python + Node)')]
dev-clean: dev-clean-py dev-clean-next

# ---- FULL SETUP ----

[group('dev')]
[doc('First-time setup: deps + migrate + superuser')]
dev-setup: dev-install dev-install-node dev-migrate dev-createsuperuser
    @echo ""
    @echo "✅ Setup complete!"
    @echo ""
    @echo "🌐 Run Django:  just runserver"
    @echo "🎨 Run Next.js: just frontend-dev"
    @echo ""
    @echo "Admin: http://localhost:8001/admin/"
