# ==============================================================================
# 🐳 PRODUCTION DOCKER STACK
# ==============================================================================

# Глобальные константы
env_file := ".env.prod"
image_tag := env_var_or_default("IMAGE_TAG", "latest")
registry := env_var_or_default("DOCKER_REGISTRY", "")

# Пути к манифестам
comp_prod := "docker-compose.prod.yml"
comp_infra := "docker-compose.infra.yml"

# ==============================================================================
# 🚀 SETUP
# ==============================================================================

# Создать .env.prod из шаблона .env.prod.example
[group('prod')]
prod-init-env:
    #!/usr/bin/env bash
    if [ -f "{{ env_file }}" ]; then
        read -p "⚠️  {{ env_file }} exists. Overwrite? [y/N] " confirm
        [ "$confirm" = "y" ] || { echo "❌ Cancelled"; exit 0; }
    fi
    cp .env.prod.example "{{ env_file }}"
    echo "✅ Created {{ env_file }} — edit it to set PG_PASS"

# Проверить наличие .env.prod и критических переменных
[group('prod')]
prod-validate-env:
    @ echo "🔍 Validating {{ env_file }}..."
    @ if [ ! -f "{{ env_file }}" ]; then echo "❌ {{ env_file }} not found."; exit 1; fi
    @ for var in PG_USER PG_PASS PG_PORT; do \
        grep -q "^$var=" "{{ env_file }}" || { echo "❌ Missing required variable: $var"; exit 1; }; \
      done

# Поднять ТОЛЬКО базу данных и телеметрию Aspire
[group('prod')]
prod-infra: prod-validate-env
    echo "⚙️  Starting infrastructure layer (Postgres + Aspire)..."
    docker compose -f {{ comp_infra }} up -d
    echo "✅ Infrastructure is running."

# ==============================================================================
# 🏗️  BUILD
# ==============================================================================

# Собрать образ webcrawler (worker)
[group('prod')]
prod-build-worker:
    echo "🔨 Building webcrawler worker image..."
    docker build -t {{ registry }}webcrawler:{{ image_tag }} -f Dockerfile .
    echo "✅ webcrawler built"

# Собрать образ webcrawler-admin (Blazor UI)
[group('prod')]
prod-build-admin:
    echo "🔨 Building webcrawler-admin image..."
    docker build -t {{ registry }}webcrawler-admin:{{ image_tag }} -f WebCrawler.Admin/Dockerfile .
    echo "✅ webcrawler-admin built"

# Собрать оба production-образа
[group('prod')]
prod-build: prod-build-worker prod-build-admin

# ==============================================================================
# ▶️  UP / DOWN
# ==============================================================================

# Запустить базовый стек (postgres + миграции + admin + aspire)
[group('prod')]
prod-up:
    echo "🚀 Starting app stack..."
    docker compose -f {{ comp_prod }} --env-file .env.prod up postgres migrate webcrawler-admin aspire-dashboard -d 
    echo -e "\n✅ Stack is up!\n   Admin UI:  http://localhost:8080\n   Aspire:    http://localhost:18888\n"
    echo "💡 Follow logs with: just prod-logs"
    echo "💡 Full stack (with worker): just prod-up-full"

# Запустить абсолютно всё (полный деплой приложения + инфра)
[group('prod')]
prod-up-full:
    echo "🚀 Starting full production stack (including workers)..."
    docker compose -f {{ comp_prod }} --env-file .env.prod up -d
    echo -e "\n✅ Full stack is up!"
    echo "   Admin UI:  http://localhost:8080"
    echo "   Aspire:    http://localhost:18888"

# Остановить production стек
[group('prod')]
prod-down:
    echo "🛑 Stopping production stack..."
    docker compose -f {{ comp_prod }} down
    echo "✅ Stack stopped"

# Полная очистка (останавливает стек и удаляет volumes базы данных)
[group('prod')]
prod-down-v:
    echo "🛑 Stopping production stack (with volumes)..."
    docker compose -f {{ comp_prod }} down -v
    echo "✅ Stack stopped, volumes removed"

# ==============================================================================
# 📜 LOGS
# ==============================================================================

# Стриминг логов из всех контейнеров
[group('prod')]
prod-logs:
    docker compose -f {{ comp_prod }} logs -f

# Последние 50 строк из каждого контейнера
[group('prod')]
prod-logs-tail:
    docker compose -f {{ comp_prod }} logs --tail=50

# ==============================================================================
# 🔄  REBUILD & RESTART
# ==============================================================================

# Пересобрать образы и перезапустить стек
[group('prod')]
prod-rebuild: prod-build prod-down prod-up
    echo "✅ Rebuild complete"

# Перезапустить admin UI
[group('prod')]
prod-restart-admin:
    echo "🔄 Restarting webcrawler-admin..."
    docker compose -f {{ comp_prod }} restart webcrawler-admin
    echo "✅ webcrawler-admin restarted"

# ==============================================================================
# 🗄️  DATABASE
# ==============================================================================

# Запустить миграции БД
[group('prod')]
prod-migrate:
    echo "🔄 Running database migrations..."
    docker compose -f {{ comp_prod }} up migrate
    echo "✅ Migrations applied"
