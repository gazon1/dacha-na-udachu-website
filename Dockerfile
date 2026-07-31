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

# Build Payload types + Next.js build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Sharp runtime deps
RUN apt-get update --yes --quiet && apt-get install --yes --quiet --no-install-recommends \
    python3 \
 && rm -rf /var/lib/apt/lists/*

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/payload.config.ts ./payload.config.ts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/healthcheck.js ./healthcheck.js

# Runtime dirs
RUN mkdir -p /app/media && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node_modules/next/dist/bin/next", "start"]