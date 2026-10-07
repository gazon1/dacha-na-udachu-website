# Debugging & Investigation

Method for turning "something is broken in production" into a root cause you can
prove, without guessing. The steps are ordered by cost: start with what already
exists, add instrumentation only when you have ruled the cheap things out.

## Stack this repo actually runs

| Layer | What it is |
|---|---|
| App | Next.js 15 App Router, React 19, TypeScript |
| CMS | Payload CMS 3, Local API in-process, REST for the browser |
| DB | PostgreSQL, external to Compose |
| Bot | Express + grammY, own container, shares the DB |
| Runtime | Docker Compose: `backup → migrate → seed → app` + `bot` |
| CI | GitHub Actions → typecheck + `npm test` → build image → GHCR |
| Deploy | manual `deploy.yml` over SSH, then smoke-test `/api/health` |
| Tests | Vitest, `npm test` (node env) |

Knowing this up front matters: most "impossible" bugs here are a container that
never started, a migration that never ran, or a secret that is missing in one
place and present in the other.

## Step 1 — establish what actually runs

Do not start from the application log. Start from the orchestration.

```bash
# Which containers exist, and with what state?
docker compose ps
docker compose ps -a          # includes exited ones — the failing one is often here

# Which image is the container actually running?
docker inspect dacha-app --format '{{.Config.Image}}'
```

Three states explain most "the deploy did nothing" reports:

- container `created` but not `running` → it exited; read the logs in step 2
- running an image you did not intend → `TAG` was stale; see step 6
- container missing entirely → `compose up` was never run for this tag

## Step 2 — collect logs before they scroll away

```bash
# App and bot, recent output
docker compose logs --tail 300 app
docker compose logs --tail 300 bot

# One-shot services: these EXITE, so they are never in `logs --tail`
docker compose logs migrate seed backup

# Follow while reproducing
docker compose logs -f app
```

**The one-shot services are the trap.** `migrate`, `seed` and `backup` have
`restart: "no"` — when they fail they disappear from `docker compose ps`, and a
plain `logs app` shows nothing because `app` never started: compose will not
create a service whose `depends_on` failed.

```bash
# Did a one-shot job run and what did it print?
docker compose ps -a migrate seed backup
```

## Step 3 — correlate by request

The app logs a Payload operation id. To follow one request through the stack:

```bash
docker compose logs app | grep -F '<operation-id>'
```

For CI-side failures the equivalent is the workflow run:

```bash
gh run list -L 10
gh run view <run-id> --log-failed
```

## Step 4 — find the actual failure

Look for, in order:

- `ERROR` entries — the failure itself
- `WARN` entries *before* the error — usually the cause, not the symptom
- container `Exit code` — non-zero on a one-shot service means its `depends_on`
  chain halted there
- a missing service downstream of a failed one — that is a consequence, not a
  second bug

## Step 5 — crash reporting

There is none. No Sentry, no crash SDK, no error tracking service. Logs and
GitHub Actions are the only record, and they are retained only as long as the
container lives.

That is worth remembering when writing an incident report: if nobody captured
it, there is nothing to read after a restart.

## Step 6 — reproduce

```bash
# Reproduce a specific condition
curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"secretKey":"<key>"}' \
  https://dacha.maxdrobin.ru/api/event-contributions/by-secret

# Is the site reachable at all — and is it TLS or app that is broken?
curl -fsS https://dacha.maxdrobin.ru/api/health
curl -sS -o /dev/null -w '%{http_code}\n' http://dacha.maxdrobin.ru/api/health
```

Distinguishing the layer is most of the diagnosis:

| Symptom | Layer |
|---|---|
| DNS does not resolve | DNS |
| `308` on :80, nothing on :443 | TLS / Caddy certificate |
| `401` or `503` from a custom endpoint | the endpoint's own auth/config |
| container healthy, site 500 | Next.js runtime error in the logs |

## Common patterns

### Deploy "did nothing"

```
docker compose ps -a  → migrate/seed exited non-zero, app never created
  → check: docker compose logs migrate seed backup
```

### Container crash-loops on start

```
bot exits immediately with TELEGRAM_WEBHOOK_SECRET message
  → by design: fail-closed, see .env.example
```

### Healthcheck fails while the app looks fine

```
healthcheck → curl http://127.0.0.1:${PORT:-3000}/api/health
  → check: is PORT set in .env? compose interpolate ${PORT} at parse time.
```

### Request 401 from a custom endpoint

```
x-cron-secret mismatch
  → the GitHub secret and the VPS .env value must be byte-identical
```

### Data looks stale / a mutation had no effect

```
collection hook called revalidateAfter() but pages are force-dynamic
  → expected: there is no page cache, the change is already visible
  → if NOT visible, the request may have 429'd on the rate limiter
```

### Anonymity check

```
GET /api/event-contributions/by-secret → returns name/message?
  → regression: the endpoint must project to an allow-list (lib/secret-key.ts)
```

## Step 7 — hangs

A request that never returns. In this stack the causes are narrow:

```bash
# 1. Is it the app or the database?
docker compose exec app curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
docker compose exec app node -e "process.stdout.write(String(Date.now()))"
```

If `/api/health` answers and a DB-backed route does not, the hang is between
the app and PostgreSQL — check the external DB's reachability and pool
exhaustion (`max: 20` in `payload.config.ts`).

Every outbound HTTP call to a third party is supposed to carry
`AbortSignal.timeout` (see `lib/yoomoney.ts`). If a request can hang
indefinitely, that timeout was lost in a refactor — an unbounded fetch inside a
cron loop is how `/check-payments` used to burn its whole time budget on one
stuck record.

```bash
# Node: dump stacks of a running process without stopping it
kill -USR2 $(pgrep -f 'next start')
```

## Step 8 — get the data layer wrong

```bash
# What did the migration actually do?
docker compose run --rm migrate npx payload migrate:status

# Inspect data directly
docker compose exec app node -e "
  const p = require('payload').default
  p.init({ config: require('./payload.config.ts').default }).then(async () => {
    const r = await p.count({ collection: 'event-contributions' })
    console.log(r.totalDocs)
    process.exit(0)
  })
"
```

## Step 9 — regression hunt in the test suite

```bash
npm test                                   # whole suite
npx vitest run tests/yoomoney-webhook.test.ts   # one file
```

The suite covers pure functions only (payment HMAC, secret projections, CSP,
URL resolution). If a bug is in rendering, in a Payload hook or in an endpoint's
wiring, **no test will catch it** — say so in the report rather than implying
coverage exists.

## Decision tree

```
CONTAINER NOT RUNNING
  ├─── one-shot service exited non-zero? → its own logs; app is collateral
  └─── long-running service restarting?  → read startup logs

SITE UNREACHABLE
  ├─── DNS fails            → A-record
  ├─── :80 works, :443 not  → Caddy certificate  (see issue #1)
  └─── reachable, 5xx       → app logs

WRONG DATA
  ├─── migration didn't run → compose ps -a migrate
  ├─── rate limited (429)   → lib/rate-limit.ts (in-memory, resets on restart)
  └─── genuinely stale     → expected only for caches that no longer exist
```

## Writing it up

An investigation that lives only in a terminal is gone next session. Write an
incident note: what was observed (not what you assumed), the layer you proved
it at, the fix, and — importantly — **what you could not verify**, so the next
person does not mistake an unverified hypothesis for a finding.

Open it as a GitHub issue with the labels `priority:` and `area:`.