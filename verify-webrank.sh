#!/usr/bin/env bash
set -u

# -------- Settings --------
BACKEND_URL="${VITE_SERP_API_BASE:-http://localhost:8787}"
BACKEND_DIR="webrank-api"                # change if your backend folder is named differently
FRONT_ENV_FILE=".env.local"           # in the frontend repo root
APP_URL="https://apps.apple.com/gb/app/tui-danmark-din-rejseapp/id1099791895"
KW="${1:-tui danmark}"
GL="${2:-dk}"
HL="${3:-da}"

PASS=(); FAIL=()
has() { command -v "$1" >/dev/null 2>&1; }

section() { echo -e "\n\033[1m=== $1 ===\033[0m"; }
ok()      { echo "✅ $1"; PASS+=("$1"); }
bad()     { echo "❌ $1"; FAIL+=("$1"); }

section "Node & ports"
node -v || true
if has lsof; then lsof -i :${BACKEND_URL##*:} || true; fi

section "Backend directory & env"
if [ -d "$BACKEND_DIR" ]; then
  echo "Dir: $BACKEND_DIR (ok)"
  if [ -f "$BACKEND_DIR/.env" ]; then
    sed -n '1,200p' "$BACKEND_DIR/.env" | sed 's/\(GOOGLE_.*=\).*/\1[hidden]/'
    ok "serp-mvp/.env present"
  else
    bad "Missing $BACKEND_DIR/.env (GOOGLE_API_KEY & GOOGLE_CSE_CX)"
  fi
else
  bad "Backend dir '$BACKEND_DIR' not found (adjust BACKEND_DIR)"
fi

section "Health check -> $BACKEND_URL/health"
code=$(curl -s -o /tmp/health.json -w "%{http_code}" "$BACKEND_URL/health" || true)
if [ "$code" = "200" ]; then cat /tmp/health.json; ok "health ok"; else echo "HTTP $code"; bad "health failed"; fi

section "CORS Preflight OPTIONS /rank"
code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BACKEND_URL/rank" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" || true)
if [ "$code" = "200" ] || [ "$code" = "204" ]; then ok "preflight ok ($code)"; else echo "HTTP $code"; bad "preflight failed"; fi

section "POST /rank (real call)"
if has jq; then
  body=$(jq -n --arg app "$APP_URL" --arg kw "$KW" --arg gl "$GL" --arg hl "$HL" '{appUrl:$app, keyword:$kw, gl:$gl, hl:$hl}')
else
  body="{\"appUrl\":\"$APP_URL\",\"keyword\":\"$KW\",\"gl\":\"$GL\",\"hl\":\"$HL\"}"
fi
code=$(curl -s -o /tmp/rank.json -w "%{http_code}" -H "content-type: application/json" -d "$body" "$BACKEND_URL/rank" || true)
echo "HTTP $code"
if [ "$code" = "200" ]; then
  if has jq; then cat /tmp/rank.json | jq .; else cat /tmp/rank.json; fi
  grep -q '"rank":' /tmp/rank.json && ok "rank field present" || bad "no rank field in response"
else
  cat /tmp/rank.json || true
  bad "POST /rank failed"
fi

section "Frontend env check (.env.local)"
if [ -f "$FRONT_ENV_FILE" ]; then
  (grep -E '^VITE_SERP_API_BASE=' "$FRONT_ENV_FILE" || echo "VITE_SERP_API_BASE not set") && ok ".env.local present"
else
  echo "No .env.local found in repo root"
fi

section "Summary"
echo "PASS: ${#PASS[@]}  FAIL: ${#FAIL[@]:-0}"
for f in "${FAIL[@]:-}"; do echo " - $f"; done
[ "${#FAIL[@]:-0}" -eq 0 ] || exit 1
