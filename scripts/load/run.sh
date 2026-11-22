#!/usr/bin/env bash
# Creates 50 voter accounts, runs the match-day k6 test in Docker, then deletes them.
# Usage: scripts/load/run.sh <api url as seen from Docker, e.g. http://host.docker.internal:4300>
set -euo pipefail
db=${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/aced}
psql "$db" -qc "insert into users (id, name, email, handle)
  select gen_random_uuid(), 'Load ' || i, 'load_' || i || '@load.test', 'load_' || i
  from generate_series(0, 49) i on conflict do nothing"
trap 'psql "$db" -qc "delete from users where email like '"'"'%@load.test'"'"'"' EXIT
docker run --rm -i -e API="$1" grafana/k6:1.4.2 run \
  --summary-trend-stats='avg,p(50),p(95),p(99),max' - < "$(dirname "$0")/match-day.js"
