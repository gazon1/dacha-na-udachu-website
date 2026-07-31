#!/usr/bin/env node
/**
 * Docker HEALTHCHECK — equivalent to `curl -fsS http://localhost:3000/api/health`.
 *
 * Why we don't use `curl -f`:
 *   1. The Alpine base image we use for the frontend container doesn't include
 *      curl by default (saves ~200 KB). Node is already in the image.
 *   2. Node's built-in http gives us retry semantics without spawning a new
 *      process per attempt — important during cold start when Next.js is
 *      listening on the port but the app hasn't fully compiled yet.
 *
 * Behaviour:
 *   - Up to 5 attempts, 2 s apart, each with a 15 s request timeout.
 *   - Exits 0 on the first HTTP 200 response.
 *   - Exits 1 only after all attempts fail.
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
    // Drain the response body so the socket can be released.
    res.resume();
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      scheduleRetry();
    }
  });

  req.on("error", () => {
    // ECONNREFUSED is expected during cold start — retry silently.
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