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
TAG := `git rev-parse --short HEAD`
PROJECT_CADDY_SNIPPET := "dacha"
SMOKE_URL := "https://dacha.maxdrobin.ru/"

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
[doc("Build and tag by commit SHA for immutable deployments")]
docker-build:
    docker build -t dacha-app:{{TAG}} .
    docker tag dacha-app:{{TAG}} dacha-app:latest

[doc("Validate docker-compose.yml syntax")]
docker-validate:
    docker compose -f docker-compose.yml config

[doc("Build and tag by commit SHA for immutable deployments")]
docker-build-sha:
    #!/usr/bin/env bash
    set -e
    TAG=$(git rev-parse --short HEAD)
    docker build -t dacha-app:$TAG .

[doc("Push image to GHCR (requires GHCR_TOKEN env var)")]
docker-push:
    #!/usr/bin/env bash
    set -e
    TAG=$(git rev-parse --short HEAD)
    OWNER=$(gh api user --jq .login)
    echo $GHCR_TOKEN | docker login ghcr.io -u $OWNER --password-stdin
    docker tag dacha-app:$TAG ghcr.io/$OWNER/dacha-app:$TAG
    docker push ghcr.io/$OWNER/dacha-app:$TAG


# ---- PRODUCTION DEPLOY -------------------------------------------------------
# The shared reverse proxy is NOT this project's business any more. It is
# provisioned by the Caddy-vps Ansible repository (gazon1/Caddy-vps), which
# backs the snippet up, validates the result and rolls back on failure. Nothing
# here touches caddy_global.
#
#   just caddy-route   apply deploy/caddy.conf.caddy as the "dacha" route
#   just prod-deploy   pull + compose up + wait for health + smoke test
#
# The image is built and published by CI; the server only pulls.
#
# CADDY_REPO points at a checkout of Caddy-vps and defaults to a sibling
# directory, which is where it sits on a developer machine.
CADDY_REPO := env("CADDY_REPO", justfile_directory() / ".." / "Caddy-vps")

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
    just --justfile "{{ CADDY_REPO }}/justfile" route dacha \
      "{{ justfile_directory() }}/deploy/caddy.conf.caddy" {{ args }}

[doc("Compare this repo's route snippet with the copy installed on the VPS")]
route-drift host="" user="":
    #!/usr/bin/env bash
    set -euo pipefail
    local_file="deploy/caddy.conf.caddy"
    if [ -z "{{ host }}" ]; then
      echo "usage: just route-drift <host> [user]"
      echo "  compares $local_file against /opt/caddy/conf.d/dacha.caddy"
      exit 0
    fi
    target="{{ user }}"
    [ -n "$target" ] || target="root"
    local_sum=$(sha256sum "$local_file" | cut -d' ' -f1)
    remote_sum=$(ssh "$target@{{ host }}" \
      "sha256sum /opt/caddy/conf.d/dacha.caddy 2>/dev/null | cut -d' ' -f1" \
      || echo "<unreadable>")
    echo "repo      $local_sum"
    echo "installed $remote_sum"
    if [ "$local_sum" = "$remote_sum" ]; then
      echo "in sync"
    else
      echo "OUT OF SYNC — apply it with: just caddy-route"
      exit 1
    fi

[doc("Deploy to VPS: pull + compose up + wait for health + smoke test")]
prod-deploy:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "📦 Pulling latest from main..."
    git pull origin main

    # The image is published by CI under an immutable commit-SHA tag; the server
    # pulls it instead of building. Compose recreates only the services whose
    # configuration changed, so the stack is not taken down.
    echo "⤓️  Pulling images..."
    docker compose pull
    docker compose up -d --remove-orphans

    # Wait for the app's own healthcheck. NOT `docker compose wait`: that
    # blocks until containers STOP, so against a long-running service it would
    # burn the whole timeout on every deploy.
    #
    # docker ps --filter is used instead of docker inspect -f on purpose: a Go
    # template contains doubled braces, which just tries to interpolate.
    # Quoting them does not help (they are emitted verbatim) and a backtick
    # string is evaluated as a shell command instead.
    #
    # The name filter is anchored (^/dacha-app) so dacha-bot cannot match.
    echo "⏳ Waiting for dacha-app to become healthy (timeout 300s)..."
    state=missing
    deadline=$(( $(date +%s) + 300 ))
    while [ "$(date +%s)" -lt "$deadline" ]; do
      # Order matters. health=none is checked BEFORE the plain "is it
      # running" test, otherwise a container without a healthcheck would
      # look like a perfectly normal starting one and we would sit here for
      # the full timeout.
      if docker ps --filter "name=^/dacha-app$" --filter "health=healthy" -q | grep -q .; then
        state=healthy
      elif docker ps --filter "name=^/dacha-app$" --filter "health=unhealthy" -q | grep -q .; then
        state=unhealthy
      elif docker ps --filter "name=^/dacha-app$" --filter "health=none" -q | grep -q .; then
        state=no-healthcheck
      elif docker ps --filter "name=^/dacha-app$" -q | grep -q .; then
        state=starting
      elif docker ps -a --filter "name=^/dacha-app$" -q | grep -q .; then
        # Exists but is not running. Keep waiting — a restart policy may
        # still bring it back — but say so, so the timeout message is useful.
        state=exited
      else
        state=missing
      fi

      case "$state" in
        healthy)
          echo "✅ dacha-app is healthy"
          break
          ;;
        unhealthy)
          echo "❌ dacha-app reported unhealthy" >&2
          docker logs --tail 50 dacha-app >&2 || true
          exit 1
          ;;
        no-healthcheck)
          echo "❌ dacha-app is running but has no healthcheck — check docker-compose.yml" >&2
          exit 1
          ;;
      esac
      sleep 5
    done

    if [ "$state" != "healthy" ]; then
      echo "❌ dacha-app did not become healthy within 300s (last state: $state)" >&2
      docker compose ps >&2 || true
      docker logs --tail 50 dacha-app >&2 || true
      exit 1
    fi

    # Smoke test through the public domain: this proves Caddy, TLS and the
    # network path are healthy — not just the container.
    echo "🚦 Smoke testing {{ SMOKE_URL }}..."
    curl -fsSI --max-time 15 "{{ SMOKE_URL }}" > /dev/null
    echo "✅ Deploy completed successfully."

[doc("Remove unused Docker assets (NOT part of a deploy)")]
docker-clean:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "🧹 Removing stopped containers and dangling build cache..."
    docker system prune -f
    echo "🗑️  Removing unused images older than 7 days..."
    docker image prune -a -f --filter "until=168h"
    df -h / | tail -n 1