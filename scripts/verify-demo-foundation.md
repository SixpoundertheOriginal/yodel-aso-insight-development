# Verify Demo Foundation (Manual)

export BASE="https://<project>.supabase.co/functions/v1"
export TOKEN="<viewer_jwt>"
export ADMIN_TOKEN="<admin_or_super_admin_jwt>"

# 1) WhoAmI (viewer)
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/admin-whoami" | jq .
# Expect: { user_id, org_id, is_demo:true, features:[...] }

# 2) Authorize demo route (viewer)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"path":"/demo/creative-review","method":"GET"}' "$BASE/authorize" | jq .

# 3) Preflight + content-type (no HTML)
curl -i -X OPTIONS "$BASE/authorize"
curl -i -X POST "$BASE/authorize" -H "Authorization: Bearer $TOKEN"
# Expect: application/json

# 4) RLS scope sanity (viewer)
curl -i -H "Authorization: Bearer $TOKEN" "$BASE/admin-organizations"

# 5) Admin CRUD sanity (admin)
curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"name":"QA Org"}' "$BASE/admin-organizations" | jq .

