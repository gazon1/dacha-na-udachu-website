# syntax=docker/dockerfile:1.6
# ---- Build stage ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install OS deps for sharp + pg client
RUN apt-get update --yes --quiet && apt-get install --yes --quiet --no-install-recommends \
    make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install npm packages (cached layer)
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Build Payload types + Next.js build.
# --no-lint skips the slow ESLint pass; the `typecheck` job in ci.yml is the
# gate that runs first (there is no `lint` script in package.json).
# NODE_OPTIONS limits memory to prevent OOM hangs.
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=2048" \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_SKIP_TELEMETRY=1 \
    npx next build --no-lint

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

# Drop build-only dependencies from the tree the runtime stage copies.
#
# NOT `output: standalone`, which would be the bigger win, because this one
# image also runs `payload migrate` and `payload seed` at deploy time — the
# Next.js trace only follows what `next start` imports and would leave the
# payload CLI behind, taking the migrate/seed services down with it. Keeping
# one image is also what guarantees migrate/seed run against exactly the schema
# the app was built from.
#
# The dev dependency set is small (@types/*, typescript, vitest) but not free:
# it drags in happy-dom and friends. Everything `migrate`/`seed` need — payload,
# drizzle, sharp — is a real dependency and stays. (typescript remains because
# payload depends on it: the seed and migrations are TypeScript.)
RUN npm prune --omit=dev --no-audit --no-fund

# @next/swc ships a native binary per libc. Both -musl and -gnu match
# `os=linux, cpu=x64`, so npm installs both even though this image is Debian and
# can only ever load the gnu one. The unused copy is 136 MB of the final image.
# Deleting it here is safe precisely because the base is bookworm-slim (glibc);
# switching the runtime base to alpine would need the opposite deletion.
RUN rm -rf node_modules/@next/swc-linux-x64-musl \
 && node -e "require('next/dist/build/swc').loadBindings().then(() => console.log('swc bindings load OK')).catch(e => { console.error('swc FAILED to load:', e.message); process.exit(1) })"

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
    curl ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# Runtime dirs
RUN mkdir -p /app/media && chown -R node:node /app

# Single COPY — builder stage already removed everything we don't need.
COPY --from=builder /app ./

USER node

# Port and command are managed in docker-compose.yml.
# Defaults here for `docker run` outside compose — without a CMD the image
# would exit immediately when run standalone (e.g. pulled from GHCR).
CMD ["node_modules/next/dist/bin/next", "start"]
