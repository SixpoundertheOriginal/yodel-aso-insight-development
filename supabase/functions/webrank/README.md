WebRank Edge Function (Google CSE)

Overview
- Provides rank lookup for an App Store URL by keyword via Google Custom Search JSON API (CSE).
- Returns rank, matchedUrl, and Top‑10 SERP with target highlighting.
- Optional persistence: stores scan and daily rollups in Supabase tables.

Endpoints
- POST /webrank (alias of /rank)
- POST /webrank/rank → { appUrl, keyword, gl, hl, rank, matchedUrl, serpTop[] }
- POST /webrank/rank/store → ranks + stores; returns saved ids in addition to rank payload
- GET  /webrank/history?orgId=&appUrl=&keyword=&gl=&hl=&days=30 → time‑series points + KPIs

Local Development
1) Create env file (already scaffolded): supabase/.env.webrank
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - GOOGLE_API_KEY
   - GOOGLE_CSE_CX
   - DEFAULT_ORG_ID (fallback for store)
2) Serve locally (no JWT verification):
   supabase functions serve webrank \
     --env-file supabase/.env.webrank \
     --no-verify-jwt

3) Test locally (examples):
   curl -s -X POST http://127.0.0.1:54321/functions/v1/webrank/rank \
     -H 'content-type: application/json' \
     -d '{"appUrl":"https://apps.apple.com/gb/app/tui-danmark-din-rejseapp/id1099791895","keyword":"tui danmark","gl":"dk","hl":"da"}'

   curl -s -X POST http://127.0.0.1:54321/functions/v1/webrank/rank/store \
     -H 'content-type: application/json' \
     -d '{"orgId":"00000000-0000-0000-0000-000000000000","appUrl":"https://apps.apple.com/gb/app/tui-danmark-din-rejseapp/id1099791895","keyword":"tui danmark","gl":"dk","hl":"da"}'

   curl -s "http://127.0.0.1:54321/functions/v1/webrank/history?orgId=00000000-0000-0000-0000-000000000000&appUrl=https://apps.apple.com/gb/app/tui-danmark-din-rejseapp/id1099791895&keyword=tui%20danmark&gl=dk&hl=da&days=30"

Deploy
1) Link and set secrets:
   supabase link --project-ref <PROJECT_REF>
   supabase secrets set --env-file supabase/.env.webrank
2) Deploy:
   supabase functions deploy webrank
3) Public URL:
   https://<PROJECT_REF>.supabase.co/functions/v1/webrank

Frontend Integration
- Set env:
  - VITE_SERP_API_BASE=https://<PROJECT_REF>.supabase.co/functions/v1/webrank
  - VITE_SUPABASE_ANON_KEY=<anon-key>
- The client adds Authorization: Bearer <anon-key> automatically for Supabase function URLs.

Request/Response
- Request body:
  { appUrl: string; keyword: string; gl: string; hl: string }
- Response body (rank):
  { appUrl, keyword, gl, hl, rank: number|null, matchedUrl?: string, serpTop?: { pos,title,link,displayLink,snippet?,isTarget }[] }

Persistence Schema (expected tables/columns)
- apps:        id PK, org_id UUID, platform text, app_store_id text, app_url text
- keywords:    id PK, org_id UUID, text text
- tracks:      id PK, org_id UUID, app_id FK, keyword_id FK, gl text, hl text, device text, provider text, active bool
- scans:       id PK, org_id UUID, track_id FK, rank int nullable, matched_url text nullable, serp_top jsonb nullable, status text, scanned_at timestamptz default now()
- daily_track_metrics: track_id FK, date date, best_rank int nullable, first_rank int nullable, scans_count int, visibility float8, top10 bool default false, PRIMARY KEY(track_id,date)

Notes
- CORS headers are permissive by default.
- Google CSE quotas/errors will surface as 4xx with message; ensure keys are correct.
- For Android, extend extractAppId/isAppStoreMatch or add Play Store parsing as needed.

