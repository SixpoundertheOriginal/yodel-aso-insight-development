# Web Rank (Apps)

Minimal MVP page to check web SERP rank for an App Store URL by keyword.

## Route
- Navigate to `/growth/web-rank-apps` (visible under Growth Accelerators in the sidebar).

## Env Config
- API base env: `VITE_SERP_API_BASE`
  - Default fallback in code: `http://localhost:8787`
  - If missing or unreachable, the page shows an inline warning.

## Backend Endpoint
- POST `${VITE_SERP_API_BASE}/rank`
- Body: `{ appUrl: string, keyword: string, gl: string, hl: string }`
- Response: `{ appUrl, keyword, gl, hl, rank: number | null, matchedUrl?: string }`

## Usage
1. Fill App Store URL and keyword (defaults provided for TUI DK).
2. Select market: `gl` (country) and `hl` (language), defaults: `dk` and `da`.
3. Click "Run Scan" to fetch rank with a 10s timeout.
4. View rank (1..100 or Not found in top 100) and matched hostname (clickable) if available.

## Notes
- Client uses `zod` to validate the response.
- Graceful error states are shown and detailed errors logged to console.

## Edge Function Backend
- See `supabase/functions/webrank/README.md` for the Supabase Edge Function that powers rank, Top-10 results, optional storage, and history endpoints.
