---
name: security-review
description: Security review checklist for security-sensitive changes — credentials, webhooks, auth, PII exposure, uploads, CSP, rate limits. Use before merging any auth, payment, or personal-data change.
---

# Security Review

## When to use

Use this skill when reviewing a PR that touches:
- Secrets and env handling (`.env`, GitHub secrets, `docker-compose.yml` env passthrough)
- Webhook endpoints (YooMoney, Telegram, cron)
- Payload access control (`lib/access.ts`, collection `access` fields)
- Routes that return user-submitted data (`/by-secret`, RSVP, contributions)
- Media upload rules
- CSP / middleware / `next.config.mjs` headers
- Rate limiting

Also use this skill when authoring a PR with such changes.

## Step-by-step

### Step 1 — Identify the change type

```
CHANGE TYPE
  │
  ├─── Secret / env handling → go to Secrets Checklist
  ├─── Webhook or cron endpoint → go to Webhook Checklist
  ├─── Auth / access control → go to Access Control Checklist
  ├─── Personal-data route → go to PII Checklist
  ├─── Upload rules → go to Upload Checklist
  ├─── Headers / CSP → go to Headers Checklist
  └─── New public route → add Rate Limit Checklist
```

### Step 2 — Secrets Checklist

- [ ] No secret value in the repo — not in `.env.example` either; it holds empty placeholders only
- [ ] No secret logged (check `console.log`, `logger.info`, error payloads in the diff)
- [ ] No secret in a URL path or query parameter — POST body or `Authorization`/custom header only
- [ ] No hardcoded fallback secret "for testing" that survives when the env var is unset
- [ ] Missing secret fails **closed** (bot refuses to start) rather than degrading to unauthenticated
- [ ] `docker-compose.yml` passes the variable through; the value lives only in the VPS `.env`
- [ ] Secret is set as a GitHub secret (not a variable) when CI needs it

### Step 3 — Webhook Checklist

For any externally callable endpoint that mutates state or returns data:

- [ ] Signature is verified **before** any parsing or side effect
- [ ] Verification uses a timing-safe compare (`crypto.timingSafeEqual`) or a well-reviewed HMAC lib
- [ ] The signing secret never reaches the client bundle
- [ ] Failure mode is 401/403 with no detail about what was wrong
- [ ] The endpoint is not reachable without the header (Telegram `secret_token` / cron bearer)
- [ ] Handled provider errors do not leak stack traces to the caller
- [ ] The whole handler fits inside a timeout budget (`AbortSignal.timeout`)

### Step 4 — Access Control Checklist

- [ ] Every collection/query route runs through `lib/access.ts` helpers (`isAdmin`, `adminOrPublished`)
- [ ] `overrides` in Payload access functions, not plain booleans
- [ ] Hidden fields on the client side are also enforced server-side — the UI hiding is not the control
- [ ] Admin-only routes return 404/403, not a redirect loop
- [ ] Cross-tenant/cross-user isolation cannot be bypassed by changing a URL parameter

### Step 5 — PII Checklist

For any route that returns records a user submitted (contributions, RSVPs, bookings, messages):

- [ ] Response uses an **allow-list projector**, never "select all then delete a field"
- [ ] Secret keys (`secretKey`) are never present in any response
- [ ] `name`, `message`, `senderFirstname`, and nested `user` are excluded unless the route's purpose is showing them
- [ ] A negative test asserts the excluded field is absent from the payload
- [ ] Aggregates (counts, sums) do not leak more precision than intended

### Step 6 — Upload Checklist

- [ ] `beforeChange` hook enforces size/type limits — Payload's admin UI hint is not enforcement
- [ ] Uploaded files are served from a path that does not execute them
- [ ] Filenames from the client are not trusted verbatim

### Step 7 — Headers Checklist

- [ ] CSP is defined once in `lib/csp.mjs` and imported by both `next.config.mjs` and `middleware.ts`
- [ ] `frame-ancestors`, `object-src 'none'`, `base-uri 'self'`
- [ ] Admin gets its own CSP (needs inline/eval for Payload), public stays strict
- [ ] HSTS present in production, absent in local dev
- [ ] No `unsafe-eval` in the public policy

### Step 8 — Rate Limit Checklist

- [ ] New public POST route has a limiter (in-memory per process is acceptable at this scale — document that)
- [ ] Limiter keys on a trustworthy client IP (`X-Real-IP` set by the proxy, not `X-Forwarded-For` splicing)
- [ ] Limits do not apply to admin-authenticated traffic

## What to do if a finding fails

1. **Block the PR** with a specific comment: which item failed and why
2. **Propose a fix** in the same comment
3. **If the risk is acceptable** (e.g., test-only code): document the exception and get explicit sign-off

## Common security mistakes

1. **Logging credentials** — `console.log("token", token)` compiles and ships
2. **A secret in a GET URL** — lands in Caddy access logs and browser history; move it to a POST body
3. **Filtering by deletion instead of projection** — `const { user, ...rest } = row` misses nested fields added later
4. **Fail-open webhook** — an unset secret that skips verification is worse than a down endpoint
5. **Trusting `X-Forwarded-For`** — a client can spoof it unless the proxy overwrites the header
6. **Treating the admin UI as the access control** — the REST API is open regardless
7. **Upload limits as a config hint** — anything not enforced in a hook is unenforced

## Output template

```
## Security Review: PR-XXX

**Change type:** Secrets / Webhook / Access control / PII / Upload / Headers / Rate limit

**Checklist:**
- [ ] Secrets Checklist: PASS
- [ ] Webhook Checklist: FAIL — no signature check before parsing
- [ ] PII Checklist: PASS
- [ ] Headers Checklist: N/A

**Blocking issues:**
1. **Webhook unauthenticated**: verify HMAC before `payload.create()`
2. **CSP duplicated**: moved into `lib/csp.mjs`

**Non-blocking recommendations:**
1. Consider an explicit `maxDuration` on the long-running route
```