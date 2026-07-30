#!/usr/bin/env node
/**
 * Lightweight healthcheck — equivalent to `curl -f http://localhost:3000`.
 * Uses Node.js built-in http module, no external dependencies.
 */
const http = require("http");

const target = `http://localhost:${process.env.PORT || 3000}/`;
const timeout = 5000;

const req = http.get(target, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});

req.setTimeout(timeout);
