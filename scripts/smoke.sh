#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?BASE_URL is required, e.g. https://<project>.supabase.co/functions/v1}"
: "${JWT:?JWT is required (bearer token for an authorized test user)}"
: "${ORG:?ORG is required (UUID of target org)}"
TEST_EMAIL="${TEST_EMAIL:-smoke.$(date +%s)@example.com}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install jq and re-run." >&2
  exit 1
fi

auth_header=(-H "Authorization: Bearer $JWT")
json_header=(-H "Content-Type: application/json")

fail() { echo "✗ $*"; exit 1; }
pass() { echo "✓ $*"; }

# GET wrapper that fails on non-2xx
jget() {
  local url="$1"
  local resp http_code body
  resp=$(curl -sS -w "\n%{http_code}" "${auth_header[@]}" "$url") || { echo "$resp"; fail "curl failed: $url"; }
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  [[ "$http_code" =~ ^2 ]] || { echo "$body"; fail "GET $url -> HTTP $http_code"; }
  echo "$body"
}

# PUT wrapper
jput() {
  local url="$1" data="$2"
  local resp http_code body
  resp=$(curl -sS -X PUT -w "\n%{http_code}" "${auth_header[@]}" "${json_header[@]}" -d "$data" "$url") || { echo "$resp"; fail "curl failed: $url"; }
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  [[ "$http_code" =~ ^2 ]] || { echo "$body"; fail "PUT $url -> HTTP $http_code"; }
  echo "$body"
}

# POST wrapper (accept 2xx; optionally accept 409)
jpost() {
  local url="$1" data="$2" allow409="${3:-false}"
  local resp http_code body
  resp=$(curl -sS -X POST -w "\n%{http_code}" "${auth_header[@]}" "${json_header[@]}" -d "$data" "$url") || { echo "$resp"; fail "curl failed: $url"; }
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  if [[ "$allow409" == "true" && "$http_code" == "409" ]]; then
    echo "$body"; return 0
  fi
  [[ "$http_code" =~ ^2 ]] || { echo "$body"; fail "POST $url -> HTTP $http_code"; }
  echo "$body"
}

# Resolve endpoints (expect BASE_URL to be functions base)
UI_PERMS_GET="$BASE_URL/admin-ui-permissions"
UI_PERMS_PUT="$BASE_URL/admin-ui-permissions"
ORGS_BASE="$BASE_URL/admin-organizations"
USERS_BASE="$BASE_URL/admin-users"
INVITE_BASE="$BASE_URL/admin-users-invite"

echo "== Smoke: admin-ui-permissions GET =="
body=$(jget "$UI_PERMS_GET?org_id=$ORG")
echo "$body" | jq -e '.resolved and .orgDefaults' >/dev/null || { echo "$body"; fail "Missing keys in GET ui-permissions"; }
pass "ui-permissions GET returned resolved+orgDefaults"

echo "== Smoke: admin-ui-permissions PUT (toggle OFF) =="
body=$(jput "$UI_PERMS_PUT" "{\"org_id\":\"$ORG\",\"updates\":{\"ui.admin.show_user_management\":false}}")
echo "$body" | jq -e '.orgDefaults["ui.admin.show_user_management"] == false' >/dev/null || { echo "$body"; fail "Toggle OFF not applied"; }
pass "ui.admin.show_user_management set to false"

echo "== Confirm GET reflects toggle OFF =="
body=$(jget "$UI_PERMS_GET?org_id=$ORG")
echo "$body" | jq -e '.resolved["ui.admin.show_user_management"] == false' >/dev/null || { echo "$body"; fail "Resolved not reflecting OFF"; }
pass "resolved reflects OFF"

echo "== Smoke: GET organizations =="
body=$(jget "$ORGS_BASE?limit=5")
echo "$body" | jq -e '.data | type=="array"' >/dev/null || { echo "$body"; fail "Organizations response not array"; }
pass "organizations list ok"

echo "== Smoke: POST create organization (SUPER only; allow 409 duplicate) =="
slug="smoke-$RANDOM-$RANDOM"
body=$(jpost "$ORGS_BASE" "{\"name\":\"Smoke Org\",\"slug\":\"$slug\"}" true)
if echo "$body" | jq -e '.data.slug == '"\"$slug\"" >/dev/null 2>&1; then
  pass "created organization $slug"
else
  if echo "$body" | jq -e '.error=="conflict"' >/dev/null 2>&1; then
    pass "slug conflict treated as acceptable (duplicate)"
  else
    echo "$body"; fail "Unexpected org create response"
  fi
fi

echo "== Smoke: GET users (scoped) =="
body=$(jget "$USERS_BASE?org_id=$ORG&limit=20")
echo "$body" | jq -e '.data | type=="array"' >/dev/null || { echo "$body"; fail "Users response not array"; }
pass "users list ok"

echo "== Smoke: POST invite user (accept 409 already member) =="
body=$(jpost "$INVITE_BASE" "{\"email\":\"$TEST_EMAIL\",\"org_id\":\"$ORG\",\"role\":\"MEMBER\"}" true)
if echo "$body" | jq -e '.data.invited == true' >/dev/null 2>&1; then
  pass "invite accepted for $TEST_EMAIL"
else
  if echo "$body" | jq -e '.error=="conflict"' >/dev/null 2>&1; then
    pass "invite conflict treated as acceptable (already member/invited)"
  else
    echo "$body"; fail "Unexpected invite response"
  fi
fi

echo "== Restore: admin-ui-permissions PUT (toggle ON) =="
body=$(jput "$UI_PERMS_PUT" "{\"org_id\":\"$ORG\",\"updates\":{\"ui.admin.show_user_management\":true}}")
echo "$body" | jq -e '.orgDefaults["ui.admin.show_user_management"] == true' >/dev/null || { echo "$body"; fail "Toggle ON not applied"; }
pass "ui.admin.show_user_management restored to true"

echo "ALL SMOKE CHECKS PASSED ✓"

