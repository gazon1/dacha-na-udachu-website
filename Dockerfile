# syntax=docker/dockerfile:1.6
# ---- Build stage ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install OS deps for sharp + pg client
RUN apt-get update --yes --quiet && apt-get install --yes --quiet --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install npm packages (cached layer)
COPY package*.json ./
RUN npm ci

# Build Payload types + Next.js build.
# --no-lint skips the slow ESLint pass (run `pnpm lint` separately in CI).
COPY . .
RUN NEXT_TELEMETRY_DISABLED=1 npx next build --no-lint

# Install Telegram bot dependencies (separate package.json under bot/).
# Bot runs via `tsx` at runtime — no compile step needed.
RUN npm install --prefix bot --omit=dev

# Cleanup — strip everything the runtime image does not need.
# Done in the builder so the runtime stage can use a single `COPY`.
# `scripts/` is kept so the `seed` one-shot service in docker-compose can
# call `pnpm seed` on deploy. `src/` is kept so `payload migrate` can find
# src/migrations/ at runtime.
RUN rm -rf \
        .git \
        .claude \
        .next/cache \
        .vscode \
        .idea \
        backend \
        media \
        tests \
        tmp \
        Dockerfile* \
        docker-compose*.yml \
        docker-compose*.yaml \
        .dockerignore \
        Caddyfile \
        justfile \
        pytest.ini \
        *.md

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Configurable at build time: `docker build --build-arg PORT=8080 .`
ARG NODE_ENV=production
ARG PORT=3000
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

# Sharp runtime deps
RUN apt-get update --yes --quiet && apt-get install --yes --quiet --no-install-recommends \
    curl ca-certificates update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# Runtime dirs
RUN mkdir -p /app/media && chown -R node:node /app

# Single COPY — builder stage already removed everything we don't need.
COPY --from=builder /app ./

USER node

# Port and command are managed in docker-compose.yml.
# Defaults here for `docker run` outside compose.
