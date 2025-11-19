# Lovable Prompting Guide (Updates)

## Implementation Template – Success Criteria (Extended)
- [ ] `/functions/v1/authorize` returns `{ allow, reason }` for all demo + admin paths
- [ ] `whoami` includes `features[]` array from `organization_features`
- [ ] All endpoints return JSON (no HTML); content-type checked client-side

## Debug Template – CORS/JSON Verification
```
curl -i -X OPTIONS "$BASE/authorize"
curl -i -X POST "$BASE/authorize" -H "Authorization: Bearer $TOKEN"
# Expect: Access-Control-Allow-* headers and Content-Type: application/json
```

