#!/usr/bin/env node
/**
 * Docker HEALTHCHECK — instant health probe.
 *
 * Same logic as the old /workspace/frontend/healthcheck.js: 5 attempts with
 * 2 s delay, each up to 15 s request timeout. Exits 0 on first HTTP 200.
 *
 * Reaches into /api/health, which is a Next.js static route handler (no DB,
 * no Payload init) — fast enough that cold start still returns green within
 * the first 1-2 attempts.
 */
const http = require("http");

const PORT = process.env.PORT || 3000;
const PATH = process.env.HEALTHCHECK_PATH || "/api/health";
const target = `http://127.0.0.1:${PORT}${PATH}`;
const TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

let attempt = 0;

function tryOnce() {
  const req = http.get(target, (res) => {
    res.resume();
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      scheduleRetry();
    }
  });

  req.on("error", () => {
    scheduleRetry();
  });

  req.setTimeout(TIMEOUT_MS, () => {
    req.destroy();
    scheduleRetry();
  });
}

function scheduleRetry() {
  if (++attempt >= MAX_ATTEMPTS) {
    process.exit(1);
  }
  setTimeout(tryOnce, RETRY_DELAY_MS);
}

tryOnce();