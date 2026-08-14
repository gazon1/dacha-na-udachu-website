#!/usr/bin/env bash
# ==============================================================================
# Idempotent deploy for Dacha — Next.js + Payload CMS + Telegram bot
# ==============================================================================
# Ensures a shared global Caddy is running on the host, then deploys this
# project's containers and registers its routes without touching anyone else's.
#
# Usage (on VPS):
#   just prod-deploy-caddy
#   # or directly:
#   TAG=$(git rev-parse --short HEAD) bash deploy/deploy.sh
#
# Requirements:
#   - Docker with docker compose plugin (v2+)
#   - /opt/caddy/ directory (bootstrap is automatic on first run)
#   - Caddy v2 image available locally (pulled on first caddy start)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CADDY_BASE="/opt/caddy"
CADDY_COMPOSE="$CADDY_BASE/docker-compose.caddy.yml"
CONF_D="$CADDY_BASE/conf.d"
BACKUP_TTL=5  # keep last N backups

# ---- Colours ----------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*" >&2; }
die()  { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ---- 1. Bootstrap global Caddy infrastructure -------------------------------
bootstrap_caddy() {
    log "Checking global Caddy infrastructure..."

    # External network shared by all projects
    if ! docker network inspect caddy_net &>/dev/null; then
        log "Creating shared caddy_net..."
        docker network create --driver bridge caddy_net
    else
        log "caddy_net already exists"
    fi

    # Directory layout
    mkdir -p "$CONF_D" "$CADDY_BASE/data" "$CADDY_BASE/config"

    # Base Caddyfile (copy from deploy bootstrap if missing)
    if [ ! -f "$CADDY_BASE/Caddyfile" ]; then
        log "Initialising base Caddyfile..."
        cp "$SCRIPT_DIR/caddy.bootstrap/Caddyfile" "$CADDY_BASE/Caddyfile"
    fi

    # docker-compose for the global Caddy (not managed by any project)
    if [ ! -f "$CADDY_COMPOSE" ]; then
        log "Creating $CADDY_COMPOSE..."
        cat > "$CADDY_COMPOSE" << 'EOF'
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy_global
    restart: always
    networks:
      - caddy_net
    ports:
      - "80:80"
      - "443:443"
      - "127.0.0.1:2019:2019"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./conf.d:/etc/caddy/conf.d:ro
      - ./data:/data
      - ./config:/config
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]

networks:
  caddy_net:
    external: true
    name: caddy_net
EOF
    fi

    # Start or restart caddy_global
    if docker ps -a --format '{{.Names}}' | grep -qFx caddy_global; then
        local state
        state=$(docker inspect -f '{{.State.Running}}' caddy_global 2>/dev/null || echo "missing")
        if [ "$state" = "true" ]; then
            log "caddy_global already running"
        else
            warn "caddy_global exists but is not running — starting..."
            docker start caddy_global
        fi
    else
        log "Starting caddy_global..."
        # Must run from the dir where the compose file lives (volumes are relative)
        (cd "$CADDY_BASE" && docker compose up -d)
    fi

    # Wait for Caddy to be ready
    local retries=10
    while [ $retries -gt 0 ]; do
        if docker exec caddy_global caddy validate --config /etc/caddy/Caddyfile &>/dev/null; then
            log "Caddy config valid"
            return 0
        fi
        retries=$((retries - 1))
        sleep 1
    done
    die "Caddy failed to initialise after 10 retries"
}

# ---- 2. Git pull -----------------------------------------------------------
git_pull() {
    log "Pulling latest from main..."
    if [ -d "$PROJECT_DIR/.git" ]; then
        git -C "$PROJECT_DIR" pull origin main
    else
        warn "Not a git repository — skipping pull"
    fi
}

# ---- 3. Backup and write this project's Caddy snippet ----------------------
write_caddy_config() {
    local snippet="$CONF_D/dacha.caddy"
    local backup="${snippet}.bak.$(date +%Y%m%d-%H%M%S)"

    if [ -f "$snippet" ]; then
        cp "$snippet" "$backup"
        log "Backed up previous dacha.caddy → $(basename "$backup")"
    fi

    cp "$SCRIPT_DIR/caddy.conf.caddy" "$snippet"
    log "Written dacha.caddy"

    # Validate full Caddyfile (all imports)
    log "Validating global Caddy config..."
    if ! docker exec caddy_global caddy validate --config /etc/caddy/Caddyfile; then
        die "Caddy config validation failed — restoring backup and aborting"
        [ -f "$backup" ] && mv "$backup" "$snippet"
        exit 1
    fi

    # Rotate old backups (keep $BACKUP_TTL)
    local count
    count=$(ls -1t "$CONF_D/dacha.caddy".bak.* 2>/dev/null | wc -l)
    if [ "$count" -gt "$BACKUP_TTL" ]; then
        ls -1t "$CONF_D/dacha.caddy".bak.* | tail -n +$((BACKUP_TTL + 1)) | xargs -r rm --
        log "Rotated old backups (kept $BACKUP_TTL)"
    fi
}

# ---- 4. Deploy docker-compose -----------------------------------------------
deploy_compose() {
    log "Deploying docker-compose..."
    # --remove-orphans: kills the old dacha-caddy-1 container that used ports 80/443
    TAG="${TAG:-latest}" docker compose -f "$PROJECT_DIR/docker-compose.yml" \
        -f "$PROJECT_DIR/docker-compose.yml" \
        down --remove-orphans 2>/dev/null || true

    TAG="${TAG:-latest}" docker compose -f "$PROJECT_DIR/docker-compose.yml" \
        up -d --build

    log "Waiting for app to become healthy..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker exec dacha-app \
            node -e "fetch('http://127.0.0.1:${PORT:-3000}/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" \
            &>/dev/null; then
            log "App is healthy"
            return 0
        fi
        retries=$((retries - 1))
        sleep 5
    done
    warn "App healthcheck timed out — continuing anyway"
}

# ---- 5. Reload Caddy -------------------------------------------------------
reload_caddy() {
    log "Reloading Caddy config..."
    if ! docker exec caddy_global caddy reload --config /etc/caddy/Caddyfile; then
        die "Caddy reload failed"
    fi
}

# ---- 6. Smoke test ---------------------------------------------------------
smoke_test() {
    log "Smoke testing HTTPS endpoints..."
    local endpoints="https://dacha.maxdrobin.ru/ https://jellyfin.maxdrobin.ru/webhook"
    local failed=0
    for url in $endpoints; do
        if curl -fsSI --max-time 15 "$url" > /dev/null 2>&1; then
            log "  ✓ $url"
        else
            warn "  ✗ $url (not reachable yet — may need warm-up)"
            failed=$((failed + 1))
        fi
    done
    if [ $failed -eq 0 ]; then
        log "All smoke tests passed"
    fi
}

# ---- 7. Status --------------------------------------------------------------
show_status() {
    log "Container status:"
    docker compose -f "$PROJECT_DIR/docker-compose.yml" ps
    echo ""
    log "Caddy routes:"
    docker exec caddy_global caddy list 2>/dev/null | head -20 || true
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    log "=== Dacha deploy started ==="
    log "Project: $PROJECT_DIR"
    log "Tag:     ${TAG:-latest}"

    bootstrap_caddy
    git_pull
    write_caddy_config
    deploy_compose
    reload_caddy
    smoke_test
    show_status

    log "=== Deploy complete ==="
}

main "$@"
