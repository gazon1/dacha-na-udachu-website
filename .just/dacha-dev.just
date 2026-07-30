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

[doc('Show current environment status')]
[group('dev')]
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

[doc('Install/update Python dependencies via uv')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-install:
    uv sync --extra dev

[doc('Sync without dev extras (production-like)')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-install-prod:
    uv sync --no-dev

[doc('Add a Python dependency')]
[group('dev')]
dev-dep PKG='':
    #!/usr/bin/env bash
    if [ -z "{{ PKG }}" ]; then
        echo "Usage: just dep <package>"
        exit 1
    fi
    cd {{ PROJECT_DIR }}
    uv add {{ PKG }}

[doc('Add a dev-only dependency')]
[group('dev')]
dev-dep-dev PKG='':
    #!/usr/bin/env bash
    if [ -z "{{ PKG }}" ]; then
        echo "Usage: just dep-dev <package>"
        exit 1
    fi
    cd {{ PROJECT_DIR }}
    uv add --dev {{ PKG }}

# ---- FRONTEND / NODE ----

[doc('Install Node dependencies for Next.js')]
[group('dev')]
[working-directory(WEB_DIR)]
dev-install-node:
    npm ci

[doc('Build Next.js for production')]
[group('dev')]
[working-directory(WEB_DIR)]
dev-build:
    npm run build

[doc('Build Next.js with type checking')]
[group('dev')]
[working-directory(WEB_DIR)]
dev-build-check:
    npm run build -- --no-lint 2>&1 || npm run build

[doc('Type-check Next.js (no emit)')]
[group('dev')]
[working-directory(WEB_DIR)]
dev-tsc:
    npx tsc --noEmit

# ---- DJANGO ----

[doc('Run Django system checks')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-check:
    uv run python manage.py check

[doc('Run Django deployment checks')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-check-deploy:
    uv run python manage.py check --deploy --settings=dacha.settings.production

[doc('Run all migrations')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-migrate:
    uv run python manage.py migrate

[doc('Create migrations for APP')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-makemigrations APP='':
    #!/usr/bin/env bash
    cd {{ PROJECT_DIR }}
    if [ -z "{{ APP }}" ]; then
        uv run python manage.py makemigrations
    else
        uv run python manage.py makemigrations {{ APP }}
    fi

[doc('Show migration status')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-showmigrations:
    uv run python manage.py showmigrations

[doc('Create Django superuser')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-createsuperuser:
    uv run python manage.py createsuperuser

[doc('Collect static files')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-collectstatic:
    uv run python manage.py collectstatic --noinput

# ---- LINT & FORMAT ----

[doc('Run ruff linter')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-lint:
    uv run ruff check .

[doc('Auto-fix lint issues')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-lint-fix:
    uv run ruff check --fix .
    uv run ruff format .

# ---- TESTS ----

[doc('Run tests with coverage')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-test:
    uv run pytest --cov --cov-report=term-missing --cov-fail-under=60 -v

[doc('Run tests fast (no coverage)')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-test-fast:
    uv run pytest -v

[doc('Run only tests for changed files')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-test-changed:
    uv run pytest -v --changed-files

# ---- DEV SERVERS ----

[doc('Start Django dev server on :8001')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-runserver:
    uv run python manage.py runserver 0.0.0.0:8001

[doc('Start Next.js dev server (http://localhost:3000)')]
[group('dev')]
[working-directory(WEB_DIR)]
dev-frontend-dev:
    npm run dev

[doc('Start both Django + Next.js (two terminals)')]
[group('dev')]
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

[doc('Extract translation strings')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-i18n-extract:
    uv run python manage.py makemessages -l ru -l en

[doc('Compile translation .mo files')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-i18n-compile:
    uv run python manage.py compilemessages

# ---- CLEANUP ----

[doc('Remove Python cache files')]
[group('dev')]
[working-directory(PROJECT_DIR)]
dev-clean-py:
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
    rm -rf {{ PROJECT_DIR }}/.venv/__pycache__ 2>/dev/null || true

[doc('Remove Next.js build artifacts')]
[group('dev')]
[working-directory(WEB_DIR)]
dev-clean-next:
    rm -rf .next
    rm -rf node_modules/.cache 2>/dev/null || true

[doc('Remove all build artifacts (Python + Node)')]
[group('dev')]
dev-clean: dev-clean-py dev-clean-next

# ---- FULL SETUP ----

[doc('First-time setup: deps + migrate + superuser')]
[group('dev')]
dev-setup: dev-install dev-install-node dev-migrate dev-createsuperuser
    @echo ""
    @echo "✅ Setup complete!"
    @echo ""
    @echo "🌐 Run Django:  just runserver"
    @echo "🎨 Run Next.js: just frontend-dev"
    @echo ""
    @echo "Admin: http://localhost:8001/admin/"
