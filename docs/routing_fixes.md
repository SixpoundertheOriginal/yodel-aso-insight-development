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
curl -i -X POST "$HOST/api/authorize" -H 'Content-Type: application/json' -d '{"path":"/aso-ai-hub","method":"GET"}'
```
Expect `Content-Type: application/json` and never HTML payloads.

