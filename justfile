# ==============================================================================
# 🏠 DACHA-NA-UDACHU — Justfile
# Next.js 15 + Payload CMS 3 production
# ==============================================================================
set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]
set export
set positional-arguments
set quiet

# ---- GLOBAL -----------------------------------------------------------------
# No TAG variable here on purpose. just evaluates these once when it loads
# the file, so any recipe that changes HEAD would then compose against a
# stale value. Recipes that need the tag compute it themselves, at the point
# of use — see docker-build and local-up.

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

[doc("Start Next.js dev server (http://localhost:3000)")]
dev:
    npm run dev

# ---- APP ----
[doc("Build production bundle (output: .next/)")]
build:
    NEXT_TELEMETRY_DISABLED=1 npm run build


# ---- BOT ----
[doc("Install Telegram bot dependencies (bot/node_modules)")]
bot-install:
    cd bot && npm install

[doc("Run Telegram bot locally (long polling, http://localhost:3001/healthz)")]
bot-dev:
    cd bot && npm run dev


# ---- DOCKER ----
[doc("Validate docker-compose.yml syntax")]
docker-validate:
    # TAG is required by the compose file; it is not used here, but compose
    # refuses to render the config without it.
    TAG=validate docker compose -f docker-compose.yml config

[doc("Build the image locally (CI is the only publisher — this is for debugging)")]
docker-build:
    #!/usr/bin/env bash
    set -euo pipefail
    # Computed here, not via the TAG variable at the top of this file: just
    # evaluates those once at load time, which is stale by the time a recipe
    # that changed HEAD runs.
    tag=$(git rev-parse --short HEAD)
    # Tagged with the GHCR name on purpose: docker-compose.yml pins
    # ghcr.io/gazon1/dacha-app:${TAG} with pull_policy: missing, so a local
    # build under that exact name is used as-is instead of being pulled.
    docker build -t "ghcr.io/gazon1/dacha-app:${tag}" .
    echo "Built ghcr.io/gazon1/dacha-app:${tag}"


# ---- DEPLOY ------------------------------------------------------------------
# Production has exactly ONE path: CI. Push to main builds the image and
# publishes it to GHCR; the deploy workflow (workflow_dispatch) pulls it onto
# the VPS, runs the one-shot jobs and waits for health. Nothing on a laptop
# deploys to production, so there is no second opinion about what is running.
#
#   just local-up     build and run the stack here, for debugging
#   just caddy-route  apply deploy/caddy.conf.caddy to the shared proxy
#
# The shared reverse proxy is NOT this project's business. It is provisioned
# by the Caddy-vps Ansible repository (gazon1/Caddy-vps), which backs the
# snippet up, validates the result and rolls back on failure. Nothing here
# touches caddy_global.
#
# CADDY_REPO points at a checkout of Caddy-vps and defaults to a sibling
# directory, which is where it sits on a developer machine.
CADDY_REPO := env("CADDY_REPO", justfile_directory() / ".." / "Caddy-vps")
ROUTE_NAME := "dacha"

[doc("Apply this project's route to the global Caddy proxy (via Ansible)")]
caddy-route *args:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{ CADDY_REPO }}/site.yml" ]; then
      echo "error: no Caddy-vps checkout at {{ CADDY_REPO }}" >&2
      echo "       git clone git@github.com:gazon1/Caddy-vps.git, or set" >&2
      echo "       CADDY_REPO=/path/to/Caddy-vps and re-run." >&2
      exit 1
    fi
    just --justfile "{{ CADDY_REPO }}/justfile" route "{{ ROUTE_NAME }}" \
      "{{ justfile_directory() }}/deploy/caddy.conf.caddy" {{ args }}

[doc("Compare this repo's route snippet with the copy installed on the VPS")]
route-drift host="" user="":
    #!/usr/bin/env bash
    set -euo pipefail
    local_file="deploy/caddy.conf.caddy"
    if [ -z "{{ host }}" ]; then
      echo "usage: just route-drift <host> [user]"
      echo "  compares $local_file against /opt/caddy/conf.d/{{ ROUTE_NAME }}.caddy"
      exit 0
    fi
    target="{{ user }}"
    [ -n "$target" ] || target="root"
    local_sum=$(sha256sum "$local_file" | cut -d' ' -f1)
    remote_sum=$(ssh "$target@{{ host }}" \
      "sha256sum /opt/caddy/conf.d/{{ ROUTE_NAME }}.caddy 2>/dev/null | cut -d' ' -f1" \
      || echo "<unreadable>")
    echo "repo      $local_sum"
    echo "installed $remote_sum"
    if [ "$local_sum" = "$remote_sum" ]; then
      echo "in sync"
    else
      echo "OUT OF SYNC — apply it with: just caddy-route"
      exit 1
    fi

[doc("Build and run the stack locally for debugging (never touches production)")]
local-up:
    #!/usr/bin/env bash
    set -euo pipefail

    # The tag is derived from the CURRENT commit. It must be computed inside
    # the recipe: `TAG := ...` at the top of this file is evaluated when just
    # loads the file, so it is already stale by the time a recipe runs.
    tag=$(git rev-parse --short HEAD)
    export TAG="$tag"

    # compose reads env_file: .env for every service and exits with a bare
    # "env file not found" otherwise.
    if [ ! -f .env ]; then
      echo "error: .env is missing — the compose file needs it for DATABASE_URI," >&2
      echo "       TELEGRAM_BOT_TOKEN and the rest. Start from the template:" >&2
      echo "         cp .env.example .env && \$EDITOR .env" >&2
      exit 1
    fi

    # caddy_net is declared `external: true` because on the VPS it is created
    # by the Caddy-vps Ansible role. Locally nothing creates it, so compose
    # would fail with a bare "network not found".
    if ! docker network inspect caddy_net >/dev/null 2>&1; then
      echo "→ Creating the local caddy_net network..."
      docker network create caddy_net >/dev/null
    fi

    # The image is built locally and tagged with the exact GHCR name the
    # compose file pins, so `pull_policy: missing` uses the local build
    # instead of fetching from the registry.
    echo "🔨 Building ghcr.io/gazon1/dacha-app:${tag}..."
    docker build -t "ghcr.io/gazon1/dacha-app:${tag}" .

    echo "⤓️  Starting the stack..."
    docker compose up -d --remove-orphans

    # Same script the deploy workflow runs on the VPS, so "healthy" means
    # exactly the same thing in both places.
    "{{ justfile_directory() }}/scripts/wait-healthy.sh" dacha-app 300

    port=$(grep -E '^PORT=' .env | head -1 | cut -d= -f2 || echo "")
    port="${port:-3000}"
    echo "✅ Stack is up locally. App: http://localhost:${port}"
    echo "   ps:     docker compose ps"
    echo "   logs:   docker compose logs -f app"
    echo "   stop:   docker compose down"


[doc("Verify a DB backup restores, without touching production (usage: just db-check <dump>)")]
db-check dump:
    #!/usr/bin/env bash
    set -euo pipefail
    # Runs inside the backup service because that is where pg_dump/psql and
    # DATABASE_URI live. Checked, not restored: the scratch database is
    # dropped again, so this is safe to run against a live database.
    docker compose run --rm -v "$(pwd)/scripts/restore-db.sh:/restore-db.sh:ro" \
      --entrypoint sh backup -c "sh /restore-db.sh --check /backups/{{dump}}"


[doc("Restore a DB backup over production (usage: just db-restore <dump>)")]
db-restore dump:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "⚠️  This overwrites the production database '{{dump}}'."
    docker compose stop app
    docker compose run --rm -v "$(pwd)/scripts/restore-db.sh:/restore-db.sh:ro" \
      --entrypoint sh backup -c "sh /restore-db.sh --restore /backups/{{dump}} --yes"
    docker compose up -d app


[doc("Remove unused Docker assets (NOT part of a deploy)")]
docker-clean:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🧹 Removing stopped containers and dangling build cache..."
    docker system prune -f
    echo "🗑️  Removing unused images older than 7 days..."
    docker image prune -a -f --filter "until=168h"
    df -h / | tail -n 1