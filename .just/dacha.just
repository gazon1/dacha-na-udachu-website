# ==============================================================================
# 🐳 DACHA PRODUCTION DOCKER
# ==============================================================================

dc := "docker compose -f docker-compose.web.yml --env-file .env"
dc-pg := "docker compose -f docker-compose.pg.yml --env-file .env"

# ---- HELPERS ----

[group('dacha')]
[doc('Check if .env has required dacha variables')]
prod-check-env:
    #!/usr/bin/env bash
    set -e
    REQUIRED="SECRET_KEY ALLOWED_HOSTS POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD TELEGRAM_BOT_TOKEN TELEGRAM_BOT_USERNAME"
    for var in $REQUIRED; do
        if [ -z "${!var}" ]; then
            echo "❌ $var is not set in .env"
            exit 1
        fi
    done
    echo "✅ All required env vars present"

[group('dacha')]
[doc('Show running dacha containers')]
prod-ps:
    {{ dc-pg }} ps
    {{ dc }} ps

[group('dacha')]
[doc('Show all container logs (db + web)')]
prod-logs:
    {{ dc-pg }} logs --tail=30
    {{ dc }} logs --tail=30

[group('dacha')]
[doc('Show web container logs')]
prod-logs-web:
    {{ dc }} logs web --tail=50 --follow

[group('dacha')]
[doc('Show db container logs')]
prod-logs-db:
    {{ dc-pg }} logs db --tail=30 --follow

# ---- LIFECYCLE ----

[group('dacha')]
[doc('Validate compose config and .env')]
prod-validate: prod-check-env
    {{ dc }} config --quiet
    echo "✅ docker-compose.prod.yml is valid"

[group('dacha')]
[doc('Pull latest images and rebuild web container')]
prod-rebuild: prod-down
    {{ dc-pg }} build --pull db
    {{ dc }} build --pull web
    echo "✅ Rebuild complete"

[group('dacha')]
[doc('Full rebuild with no cache (clean slate)')]
prod-rebuild-no-cache: prod-down
    {{ dc-pg }} build --pull --no-cache db
    {{ dc }} build --pull --no-cache web
    echo "✅ Clean rebuild complete"

[group('dacha')]
[doc('Start containers (web + db) — run migrations automatically on first start')]
prod-up: prod-down
    {{ dc-pg }} up --detach
    echo "⏳ Waiting for db to be healthy..."
    {{ dc-pg }} wait db
    {{ dc }} up --detach
    echo "✅ Containers up:"
    {{ dc-pg }} ps
    {{ dc }} ps

[group('dacha')]
[doc('Stop and remove all dacha containers')]
prod-down:
    {{ dc }} down --remove-orphans
    {{ dc-pg }} down --remove-orphans
    echo "✅ Containers stopped"

[group('dacha')]
[doc('Restart (stop + up) — preserves volumes')]
prod-restart: prod-down prod-up
    echo "✅ Restart complete"

[group('dacha')]
[doc('Start only web container (assumes db is running externally)')]
prod-up-web:
    {{ dc }} up --detach
    echo "✅ Web container up:"

[group('dacha')]
[doc('Stop web container only')]
prod-down-web:
    {{ dc }} down
    echo "✅ Web container stopped"

# ---- DATABASE ----

[group('dacha')]
[doc('Run Django migrations inside web container')]
prod-migrate:
    {{ dc }} exec web python manage.py migrate
    echo "✅ Migrations applied"

[group('dacha')]
[doc('Create migrations for changed apps')]
prod-makemigrations APP='':
    #!/usr/bin/env bash
    APP_ARG="{{ APP }}"
    CMD="python manage.py makemigrations"
    if [ -n "$APP_ARG" ]; then
        {{ dc }} exec web $CMD "$APP_ARG"
    else
        {{ dc }} exec web $CMD
    fi

[group('dacha')]
[doc('Show pending migrations')]
prod-showmigrations:
    {{ dc }} exec web python manage.py showmigrations

# ---- SHELL & DEBUG ----

[group('dacha')]
[doc('Open shell inside running web container')]
prod-shell:
    {{ dc }} exec web /bin/bash

[group('dacha')]
[doc('Open psql shell inside db container')]
prod-db-shell:
    {{ dc }} exec db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

[group('dacha')]
[doc('Open Django shell in web container')]
prod-django-shell:
    {{ dc }} exec web python manage.py shell

[group('dacha')]
[doc('Run Django system checks')]
prod-check:
    {{ dc }} exec web python manage.py check --deploy

# ---- BACKUP & RESTORE ----

[group('dacha')]
[doc('Backup postgres DB to ./backups/ with timestamp')]
prod-db-backup:
    #!/usr/bin/env bash
    set -e
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    {{ dc }} exec -T db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$BACKUP_DIR/dacha_${TIMESTAMP}.sql"
    echo "✅ Backup: $BACKUP_DIR/dacha_${TIMESTAMP}.sql"

[group('dacha')]
[doc('List available DB backups')]
prod-db-list-backups:
    #!/usr/bin/env bash
    set -e
    BACKUP_DIR="./backups"
    if [ -d "$BACKUP_DIR" ]; then
        echo "📦 Backups in $BACKUP_DIR:"
        ls -lh "$BACKUP_DIR"/dacha_*.sql 2>/dev/null || echo "  (none)"
    else
        echo "ℹ️  No backups directory"
    fi

[group('dacha')]
[doc('Restore DB from latest backup')]
prod-db-restore LATEST='latest':
    #!/usr/bin/env bash
    set -e
    BACKUP_DIR="./backups"
    if [ "{{ LATEST }}" = "latest" ]; then
        BACKUP=$(ls -t "$BACKUP_DIR"/dacha_*.sql 2>/dev/null | head -1)
        if [ -z "$BACKUP" ]; then
            echo "❌ No backups found"
            exit 1
        fi
    else
        BACKUP="$BACKUP_DIR/dacha_{{ LATEST }}.sql"
        if [ ! -f "$BACKUP" ]; then
            echo "❌ Backup not found: $BACKUP"
            exit 1
        fi
    fi
    echo "🔄 Restoring from: $BACKUP"
    {{ dc }} exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$BACKUP"
    echo "✅ Restore complete"

# ---- FULL SETUP ----

[group('dacha')]
[doc('First-time setup: validate env + up (both pg + web) + migrate + check')]
prod-setup: prod-validate prod-up prod-migrate prod-check
    echo "✅ Full setup complete!"
    @echo ""
    @echo "🌐 Django backend:  http://192.168.1.107:8071"
    @echo "📦 Wagtail admin:  http://192.168.1.107:8071/admin/"

# ---- CONTAINER ENTRYPOINT (runs inside container) ----
# Used by Dockerfile CMD: just prod-serve

[group('dacha')]
[working-directory("/workspace/dacha")]
[doc('Run gunicorn inside container (used by Dockerfile CMD)')]
prod-serve:
    #!/usr/bin/env bash
    set -e
    echo "Running migrations..."
    uv run python manage.py migrate --noinput
    echo "Collecting static files..."
    uv run python manage.py collectstatic --noinput
    echo "Starting gunicorn..."
    exec uv run gunicorn dacha.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --access-logfile - \
        --error-logfile -
