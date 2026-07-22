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
import '.just/prod.just'
import '.just/test.just'

# ==============================================================================
# 🎯 DEFAULT
# ==============================================================================
[doc('Show available commands')]
default:
    @just --list --list-heading $'🎯 Available Commands:\n' --list-prefix '  • '



# --- PRODUCTION COMMANDS ---

# Главная команда запуска (аналог вашего скрипта)
entrypoint: migrate create-superuser collectstatic run-gunicorn

# Применить миграции БД
migrate:
    @echo "Applying database migrations..."
    python manage.py migrate

# Создать суперпользователя (проверяет переменные окружения)
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

# Собрать статику (для WhiteNoise)
collectstatic:
    @echo "Collecting static files..."
    python manage.py collectstatic --noinput

# Запустить сервер Gunicorn
run-gunicorn:
    @echo "Starting Gunicorn..."
    exec gunicorn dacha.wsgi:application --bind 0.0.0.0:8000 --workers 3