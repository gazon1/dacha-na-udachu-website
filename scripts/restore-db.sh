#!/usr/bin/env bash
#
# Restore a database backup taken by the `backup` service in docker-compose.yml.
#
# A backup that was never restored is not a backup, so this script exists to
# make restoring a routine, verified operation rather than an archaeology task
# at 3am.
#
# Two modes:
#   --check <dump>          restore into a scratch database, verify, drop it.
#                           Nothing touches the production database.
#   --restore <dump>        restore into the PRODUCTION database. Requires
#                           --yes, because this destroys live data.
#
# Runs inside the `backup` service (it has pg_dump/psql and DATABASE_URI):
#
#   docker compose run --rm backup /backups/restore-db.sh --check pre-....sql.gz
#   docker compose run --rm backup /backups/restore-db.sh --restore pre-....sql.gz --yes
#
# Credentials are parsed out of DATABASE_URI rather than taken from separate
# variables, so the password never appears in a process listing.

set -euo pipefail

SCRATCH_DB="restore_check_tmp"

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

mode=""
dump=""
confirmed="no"

while [ $# -gt 0 ]; do
  case "$1" in
    --check|--restore) mode="$1"; shift ;;
    --yes|-y) confirmed="yes"; shift ;;
    -h|--help) usage ;;
    -*) echo "unknown option: $1" >&2; usage ;;
    *) dump="$1"; shift ;;
  esac
done

[ -n "$mode" ] && [ -n "$dump" ] || usage
[ -f "$dump" ] || { echo "no such dump: $dump" >&2; exit 1; }

# Parse postgres://user:password@host:port/db — password may contain neither
# ':' nor '@', which is what URI userinfo allows.
uri="${DATABASE_URI:?DATABASE_URI is not set}"
pw=$(printf %s "$uri" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
host=$(printf %s "$uri" | sed 's|.*@\([^:/]*\):.*|\1|')
port=$(printf %s "$uri" | sed 's|.*@[^:]*:\([0-9]*\)/.*|\1|')
db=$(printf %s "$uri" | sed 's|.*/||')
user=$(printf %s "$uri" | sed 's|.*://\([^:]*\):.*|\1|')
export PGPASSWORD="$pw"

# A dump smaller than this cannot hold a real schema. Checking up front means a
# truncated or empty archive fails immediately with a clear message instead of
# halfway through a restore.
size=$(wc -c < "$dump")
if [ "$size" -lt 1024 ]; then
  echo "refusing to restore ${dump}: ${size} bytes is too small to be a schema dump" >&2
  exit 1
fi

run_dump() {
  # ON_ERROR_STOP makes psql exit non-zero on the first failed statement, and
  # `set -o pipefail` propagates that through the pipe into the grep. Without
  # pipefail the exit status would come from grep — a failed restore would look
  # like a successful one, which is the exact bug this runbook exists to
  # prevent. Errors are still filtered out of the visible output.
  local err
  err=$(mktemp)
  # stdout goes nowhere: -q still prints setval()/set_config() results, which
  # are noise here. Anything that actually matters comes out on stderr.
  if ! zcat "$dump" | psql -h "$host" -p "$port" -U "$user" -d "$1" \
      -q -v ON_ERROR_STOP=1 >/dev/null 2>"$err"; then
    echo "restore FAILED — psql reported:" >&2
    grep -viE '^(NOTICE|--|\s)' "$err" | head -20 >&2 || true
    rm -f "$err"
    return 1
  fi
  grep -viE '^(NOTICE|--|\s)' "$err" | head -5 || true
  rm -f "$err"
}

verify() {
  local target="$1"
  local tables rows
  tables=$(psql -h "$host" -p "$port" -U "$user" -d "$target" \
    -tAc "select count(*) from information_schema.tables where table_schema='public'")
  rows=$(psql -h "$host" -p "$port" -U "$user" -d "$target" -tAc \
    'select coalesce((select count(*) from users),0)')
  echo "verified ${target}: ${tables} tables, ${rows} users"
  [ "$tables" -gt 0 ] || { echo "restored database has no tables" >&2; return 1; }
}

case "$mode" in
  --check)
    echo "→ checking ${dump} (${size} bytes) in a scratch database"
    psql -h "$host" -p "$port" -U "$user" -d "$db" -q \
      -c "DROP DATABASE IF EXISTS ${SCRATCH_DB}" \
      -c "CREATE DATABASE ${SCRATCH_DB}" >/dev/null
    # The scratch database is dropped even if the restore fails, so a broken
    # dump cannot leave a half-restored database behind.
    trap 'psql -h "$host" -p "$port" -U "$user" -d "$db" -q -c "DROP DATABASE IF EXISTS ${SCRATCH_DB}" >/dev/null 2>&1 || true' EXIT

    run_dump "$SCRATCH_DB"
    verify "$SCRATCH_DB"

    psql -h "$host" -p "$port" -U "$user" -d "$db" -q \
      -c "DROP DATABASE ${SCRATCH_DB}" >/dev/null
    trap - EXIT
    echo "✅ dump is restorable; scratch database dropped"
    ;;

  --restore)
    if [ "$confirmed" != "yes" ]; then
      echo "refusing to overwrite production database '${db}' without --yes" >&2
      echo "read-only equivalent: --check ${dump}" >&2
      exit 1
    fi
    echo "→ RESTORING ${dump} into production database '${db}'"
    # The dump was taken with --clean --if-exists, so existing objects are
    # dropped and the schema is rebuilt rather than merged.
    #
    # Stop the app BEFORE running this, from the host:
    #   docker compose stop app
    # It holds open connections to the tables being dropped, and letting it
    # write while the schema is half-rebuilt is how a restore turns a bad day
    # into a corrupted one. This container has no access to the docker socket,
    # so it cannot do that for you.
    run_dump "$db"
    verify "$db"
    echo "✅ restored — now run: docker compose up -d app"
    ;;
esac