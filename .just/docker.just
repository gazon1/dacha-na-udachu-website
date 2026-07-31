# ==============================================================================
# 🐳 DEVCONTAINER & DOCKER MANAGEMENT
# ==============================================================================

[doc('Rebuild devcontainer (force no cache)')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-rebuild:
    #!/usr/bin/env bash
    set -e
    echo "♻️  Rebuilding with no cache..."
    docker build --no-cache -t my-crawler-base:latest -f Dockerfile.base ..
    docker build --no-cache -t singularity-dev:latest -f Dockerfile .
    echo "✅ Clean rebuild complete"

[doc('Start devcontainer in background')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-up:
    docker compose up -d
    @echo "✅ Container started. Attach with: docker compose exec develop zsh"

[doc('Stop devcontainer')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-down:
    docker compose down
    @echo "✅ Container stopped"

[doc('Restart devcontainer')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-restart: docker-down docker-up
    @echo "✅ Container restarted"

[doc('Show container logs')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-logs:
    docker compose logs -f develop

[doc('Enter running container shell')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-shell:
    docker compose exec develop zsh

[doc('Prune devcontainer volumes (free disk space)')]
[group('docker')]
[working-directory("/workspace/.devcontainer")]
docker-prune:
    #!/usr/bin/env bash
    set -e
    echo "⚠️  This will remove:"
    echo "   - Stopped containers"
    echo "   - Unused volumes"
    echo "   - Dangling images"
    read -p "Continue? [y/N] " confirm
    if [ "$confirm" = "y" ]; then
        docker compose down -v
        docker system prune -f
        echo "✅ Pruning complete"
    else
        echo "❌ Cancelled"
    fi

[doc('Validate .env file exists and has required variables')]
[group('docker')]
docker-validate-env:
    #!/usr/bin/env bash
    set -e
    ENV_FILE=".devcontainer/.env"
    REQUIRED_VARS="DEVELOPER_USERNAME DEVELOPER_USER_UID DEVELOPER_USER_GID"

    if [ ! -f "$ENV_FILE" ]; then
        echo "❌ .env file not found at $ENV_FILE"
        echo "💡 Run 'just docker-init-env' to create it"
        exit 1
    fi

    echo "🔍 Validating $ENV_FILE..."
    missing=()
    for var in $REQUIRED_VARS; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            missing+=("$var")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo "❌ Missing required variables: ${missing[*]}"
        echo "💡 Run 'just docker-init-env' to fix"
        exit 1
    fi

    echo "✅ Environment validation passed"

[doc('Create .env from template with auto-detected values')]
[group('docker')]
docker-init-env:
    #!/usr/bin/env bash
    set -e
    ENV_FILE=".devcontainer/.env"
    TEMPLATE="/workspace/.just/templates/env.template"

    if [ -f "$ENV_FILE" ]; then
        read -p "⚠️  $ENV_FILE exists. Overwrite? [y/N] " confirm
        if [ "$confirm" != "y" ]; then
            echo "❌ Cancelled"
            exit 0
        fi
    fi

    # Auto-detect UID/GID
    CURRENT_UID=$(id -u)
    CURRENT_GID=$(id -g)
    CURRENT_USER=$(whoami)

    # Replace placeholders in template using different delimiters
    sed -e "s|__USERNAME__|$CURRENT_USER|g" \
        -e "s|__UID__|$CURRENT_UID|g" \
        -e "s|__GID__|$CURRENT_GID|g" \
        "$TEMPLATE" > "$ENV_FILE"

    echo "✅ Created $ENV_FILE with:"
    echo "   DEVELOPER_USERNAME=$CURRENT_USER"
    echo "   DEVELOPER_USER_UID=$CURRENT_UID"
    echo "   DEVELOPER_USER_GID=$CURRENT_GID"

# ==============================================================================
# 🗄️ DATABASE MANAGEMENT (Drift + Dolt + Beads)
# ==============================================================================

[doc('Backup SQLite database to timestamped file')]
[group('db')]
db-backup:
    #!/usr/bin/env bash
    set -e
    DB_FILE="singularity_todo_app/database/db.sqlite"
    BACKUP_DIR="singularity_todo_app/database/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)

    mkdir -p "$BACKUP_DIR"

    if [ ! -f "$DB_FILE" ]; then
        echo "❌ Database not found at $DB_FILE"
        exit 1
    fi

    cp "$DB_FILE" "$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"
    echo "✅ Backup created: $BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"

[doc('List all database backups')]
[group('db')]
db-list-backups:
    #!/usr/bin/env bash
    set -e
    BACKUP_DIR="singularity_todo_app/database/backups"

    if [ ! -d "$BACKUP_DIR" ]; then
        echo "ℹ️  No backups directory"
        exit 0
    fi

    echo "📦 Database backups:"
    ls -lh "$BACKUP_DIR"/*.sqlite 2>/dev/null || echo "   (none found)"

[doc('Restore database from backup (latest by default)')]
[group('db')]
db-restore BACKUP='latest':
    #!/usr/bin/env bash
    set -e
    DB_FILE="singularity_todo_app/database/db.sqlite"
    BACKUP_DIR="singularity_todo_app/database/backups"

    if [ "$BACKUP" = "latest" ]; then
        BACKUP=$(ls -t "$BACKUP_DIR"/*.sqlite 2>/dev/null | head -n1)
        if [ -z "$BACKUP" ]; then
            echo "❌ No backups found"
            exit 1
        fi
        echo "🔄 Restoring from latest backup: $BACKUP"
    else
        BACKUP="$BACKUP_DIR/$BACKUP"
        if [ ! -f "$BACKUP" ]; then
            echo "❌ Backup not found: $BACKUP"
            exit 1
        fi
        echo "🔄 Restoring from: $BACKUP"
    fi

    cp "$BACKUP" "$DB_FILE"
    echo "✅ Database restored"

[doc('Run Dolt SQL server for beads')]
[group('db')]
db-dolt-server:
    #!/usr/bin/env bash
    set -e
    echo "🚀 Starting Dolt SQL server on port 3307..."

    if pgrep -x "dolt" > /dev/null 2>&1; then
        echo "✅ Dolt server already running"
        exit 0
    fi

    cd /workspace
    nohup dolt sql-server --port 3307 > /workspace/.beads/dolt-server.log 2>&1 &
    sleep 2

    if pgrep -x "dolt" > /dev/null 2>&1; then
        echo "✅ Dolt server started (port 3307)"
    else
        echo "❌ Failed to start Dolt server"
        cat /workspace/.beads/dolt-server.log 2>/dev/null | tail -20
        exit 1
    fi

[doc('Stop Dolt SQL server')]
[group('db')]
db-dolt-stop:
    #!/usr/bin/env bash
    set -e
    echo "🛑 Stopping Dolt server..."
    pkill -x "dolt" || true
    sleep 1

    if ! pgrep -x "dolt" > /dev/null 2>&1; then
        echo "✅ Dolt server stopped"
    else
        echo "⚠️  Dolt server still running"
    fi

[doc('Show Dolt server status')]
[group('db')]
db-dolt-status:
    #!/usr/bin/env bash
    set -e
    if pgrep -x "dolt" > /dev/null 2>&1; then
        echo "✅ Dolt server is running"
        echo "📍 Port: 3307"
        pgrep -x "dolt"
    else
        echo "❌ Dolt server is not running"
    fi

[doc('Push beads to Dolt remote')]
[group('db')]
db-push:
    @echo "📤 Pushing beads to remote..."
    bd sync
    @echo "✅ Push complete"

[doc('Run database migrations')]
[group('db')]
db-migrate:
    #!/usr/bin/env bash
    set -e
    cd /workspace/singularity_todo_app
    dart run scripts/run_migration.dart
    cp tmp/migrated.db database/db.sqlite
    echo "✅ Migrations applied"

# ==============================================================================
# 🎯 AI CONTEXT & DOCUMENTATION
# ==============================================================================

[doc('Extract project context for AI (Dart + Python)')]
[group('ai')]
ai-context:
    #!/usr/bin/env bash
    set -e
    OUTPUT_DIR="singularity_todo_app/tmp"
    mkdir -p "$OUTPUT_DIR"

    echo "📝 Extracting Dart context..."
    just sing-dart-context

    echo "📝 Extracting Python context..."
    just sing-py-context

    echo "✅ Context files created in $OUTPUT_DIR"

[doc('Generate architecture diagram (mermaid)')]
[group('ai')]
ai-arch-diagram:
    #!/usr/bin/env bash
    set -e
    OUTPUT="singularity_todo_app/docs/architecture.md"
    mkdir -p "$(dirname "$OUTPUT")"

    cp /workspace/.just/templates/architecture.md "$OUTPUT"
    echo "✅ Architecture diagram created: $OUTPUT"

# ==============================================================================
# 🔒 PRE-COMMIT & CI
# ==============================================================================

[doc('Install git pre-commit hook')]
[group('ci')]
ci-install-hook:
    #!/usr/bin/env bash
    set -e
    HOOK_FILE=".git/hooks/pre-commit"

    cp /workspace/.just/templates/pre-commit-hook.sh "$HOOK_FILE"
    chmod +x "$HOOK_FILE"
    echo "✅ Pre-commit hook installed"

[doc('Remove git pre-commit hook')]
[group('ci')]
ci-remove-hook:
    #!/usr/bin/env bash
    set -e
    rm -f .git/hooks/pre-commit
    echo "✅ Pre-commit hook removed"

[doc('Run full CI pipeline locally')]
[group('ci')]
ci-run:
    #!/usr/bin/env bash
    set -e
    echo "🚀 Running CI pipeline..."

    echo "📋 Step 1/5: Formatting..."
    just fmt-check

    echo "📋 Step 2/5: Static analysis..."
    just analyze

    echo "📋 Step 3/5: Bloc lint..."
    just bloc-lint || true

    echo "📋 Step 4/5: Tests..."
    just test

    echo "📋 Step 5/5: Build check..."
    just build-debug

    echo "✅ CI pipeline passed!"

# ==============================================================================
# 🧹 MAINTENANCE
# ==============================================================================

[doc('Clean all build artifacts (Flutter + Rust)')]
[group('maint')]
maint-clean-all:
    #!/usr/bin/env bash
    set -e
    echo "🧹 Cleaning all build artifacts..."

    just clean-all
    just rust-clean

    echo "✅ Full clean complete"

[doc('Fix file permissions in workspace')]
[group('maint')]
maint-fix-permissions:
    #!/usr/bin/env bash
    set -e
    echo "🔧 Fixing permissions..."
    sudo chown -R $(whoami):$(whoami) /workspace
    sudo chown -R $(whoami):$(whoami) /home/$(whoami)
    echo "✅ Permissions fixed"

[doc('Show disk usage by directory')]
[group('maint')]
maint-disk-usage:
    #!/usr/bin/env bash
    set -e
    echo "💾 Disk usage in /workspace:"
    du -sh /workspace/* 2>/dev/null | sort -hr | head -20
