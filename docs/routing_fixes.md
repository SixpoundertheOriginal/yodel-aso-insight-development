## API Routing in Preview/Prod

Goal: Ensure `/api/*` never resolves to SPA `index.html`.

Approach: Route API calls to Supabase Edge Functions, not the Vite SPA.

Examples
- Nginx/Netlify/Vercel rewrites:
  - `/api/whoami` → `${SUPABASE_URL}/functions/v1/admin-whoami`
  - `/api/authorize` → `${SUPABASE_URL}/functions/v1/authorize`

Vite dev proxy (local only):
```
server: {
  proxy: {
    '/api/whoami': `${process.env.VITE_SUPABASE_URL}/functions/v1/admin-whoami`,
    '/api/authorize': `${process.env.VITE_SUPABASE_URL}/functions/v1/authorize`,
  }
}
```

Sanity checks (manual)
```
curl -i "$HOST/api/whoami"
curl -i -X OPTIONS "$HOST/functions/v1/authorize"
curl -i -X POST "$HOST/functions/v1/authorize" -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' -d '{"path":"/demo/creative-review","method":"GET"}'
```
Expect `Content-Type: application/json` (never HTML) and proper CORS headers for OPTIONS/POST.

Client guard (JSON‑only): before `res.json()`, assert the content‑type contains `application/json`. See `src/lib/http/assertJsonResponse.ts` for a reference helper.
