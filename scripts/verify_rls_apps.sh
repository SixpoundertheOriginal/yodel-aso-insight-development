#!/usr/bin/env bash
set -euo pipefail

USER_ID="48977685-7795-49fa-953e-579d6a6739cb"
ORG_ID="dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f"
DB_URL="${SUPABASE_DB_URL:-}"
SQL_TEMPLATE=$(
  cat <<SQL
set local request.jwt.claims = '{"sub":"${USER_ID}","role":"authenticated","is_superadmin":false}';
select count(*) from public.apps where organization_id='${ORG_ID}';
SQL
)

if [ -n "$DB_URL" ] && command -v psql >/dev/null 2>&1; then
  count="$(psql "$DB_URL" -v "ON_ERROR_STOP=1" -qAt <<<"$SQL_TEMPLATE" | tr -d '[:space:]')"
else
  if ! command -v supabase >/dev/null 2>&1; then
    echo "Install the supabase CLI or set SUPABASE_DB_URL for psql." >&2
    exit 2
  fi
  raw="$(supabase db query <<<"$SQL_TEMPLATE")"
  count="$(printf '%s\n' "$raw" | awk '/^[[:space:]]*[0-9]+$/ {gsub(/^[[:space:]]+/, \"\", $1); print $1}' | tail -n1)"
fi

echo "Accessible apps in ${ORG_ID} for ${USER_ID}: ${count}"

if [ "${count}" = "" ] || [ "${count}" = "0" ]; then
  exit 1
fi
