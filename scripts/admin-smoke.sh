#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:8080}"
SUPER="${2:-}"
ORGADM="${3:-}"
ORGID="${4:-}"

red(){ printf "\033[31m%s\033[0m\n" "$*"; }
grn(){ printf "\033[32m%s\033[0m\n" "$*"; }
hdr(){ printf "\n\033[36m== %s ==\033[0m\n" "$*"; }

jqtype(){ grep -i "^content-type:" | grep -qi "application/json" || { red "❌ Not JSON"; exit 1; }; }

hdr "Health"
curl -sS -i "$BASE/api/health" | tee /tmp/health.h | jqtype >/dev/null

[ -n "$SUPER" ] || { red "Provide SUPER token as arg 2"; exit 1; }
hdr "WhoAmI (SUPER_ADMIN)"
curl -sS -i -H "Authorization: Bearer $SUPER" "$BASE/api/admin/whoami" | tee /tmp/whoami_super.h | jqtype >/dev/null

[ -n "$ORGADM" ] || { red "Provide ORG_ADMIN token as arg 3"; exit 1; }
hdr "WhoAmI (ORG_ADMIN)"
curl -sS -i -H "Authorization: Bearer $ORGADM" "$BASE/api/admin/whoami" | tee /tmp/whoami_org.h | jqtype >/dev/null

hdr "Organizations (SUPER_ADMIN)"
curl -sS -i -H "Authorization: Bearer $SUPER" "$BASE/api/admin/organizations" | tee /tmp/orgs_super.h | jqtype >/dev/null

[ -n "$ORGID" ] || { red "Provide ORG_ID as arg 4"; exit 1; }
hdr "Organizations (ORG_ADMIN scoped)"
curl -sS -i -H "Authorization: Bearer $ORGADM" -H "X-Org-Id: $ORGID" "$BASE/api/admin/organizations" | tee /tmp/orgs_org.h | jqtype >/dev/null

hdr "Users (SUPER_ADMIN)"
curl -sS -i -H "Authorization: Bearer $SUPER" "$BASE/api/admin/users" | tee /tmp/users_super.h | jqtype >/dev/null

hdr "Users (ORG_ADMIN scoped)"
curl -sS -i -H "Authorization: Bearer $ORGADM" -H "X-Org-Id: $ORGID" "$BASE/api/admin/users" | tee /tmp/users_org.h | jqtype >/dev/null

grn "✅ Smoke tests completed (see /tmp/*_*.h)."