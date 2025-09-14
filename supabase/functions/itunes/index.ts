import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin');
  const allowedOrigins = (Deno.env.get('CORS_ALLOW_ORIGIN') || 'http://localhost:8080').split(',').map(o => o.trim());
  
  let allowOrigin = 'http://localhost:8080';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (allowedOrigins.length > 0) {
    allowOrigin = allowedOrigins[0];
  }
  
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Content-Type": "application/json"
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
  const projectBase = supabaseUrl || `${url.protocol}//${url.host}`;
  const targetBase = `${projectBase}/functions/v1/app-store-scraper`;

  try {
    // Proxy: GET /functions/v1/itunes/reviews -> /functions/v1/app-store-scraper/itunes/reviews
    if (req.method === "GET" && url.pathname.endsWith("/reviews")) {
      const forwardUrl = `${targetBase}/itunes/reviews${url.search}`;
      const resp = await fetch(forwardUrl, { headers: { "Content-Type": "application/json" } });
      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        console.error(`[itunes] Upstream non-JSON content-type on GET /reviews: ${ct}`);
        return json({ success: false, error: `Upstream returned non-JSON content-type: ${ct}` }, 502);
      }
      const body = await resp.text();
      return new Response(body, { status: resp.status, headers: corsHeaders });
    }

    // POST router: op-based
    if (req.method === "POST") {
      const raw = await req.text();
      let payload: any = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch {}

      // op: 'search' → forward to app-store-scraper with expected keys
      if (payload?.op === 'search') {
        const term = payload.term ?? payload.searchTerm;
        const country = payload.country ?? 'us';
        const limit = payload.limit ?? 5;
        const body = {
          searchTerm: term,
          searchType: 'keyword',
          organizationId: payload.organizationId || 'itunes-proxy',
          country,
          limit,
        };
        const resp = await fetch(`${targetBase}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          console.error(`[itunes] Upstream non-JSON content-type on POST op=search: ${ct}`);
          return json({ error: `Upstream returned non-JSON content-type: ${ct}` }, 502);
        }
        const pass = await resp.text();
        return new Response(pass, { status: resp.status, headers: corsHeaders });
      }

      // op: 'reviews' → forward to app-store-scraper/itunes/reviews
      if (payload?.op === 'reviews') {
        const cc = payload.cc ?? 'us';
        const appId = payload.appId;
        const page = payload.page ?? 1;
        if (!appId) return json({ error: 'Missing appId' }, 400);
        const forwardUrl = `${targetBase}/itunes/reviews?cc=${encodeURIComponent(cc)}&appId=${encodeURIComponent(appId)}&page=${encodeURIComponent(page)}`;
        const resp = await fetch(forwardUrl, { headers: { 'Content-Type': 'application/json' } });
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          console.error(`[itunes] Upstream non-JSON content-type on POST op=reviews: ${ct}`);
          return json({ error: `Upstream returned non-JSON content-type: ${ct}` }, 502);
        }
        const pass = await resp.text();
        return new Response(pass, { status: resp.status, headers: corsHeaders });
      }

      // Default: proxy raw to app-store-scraper
      const resp = await fetch(`${targetBase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw || '{}',
      });
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        console.error(`[itunes] Upstream non-JSON content-type on POST default: ${ct}`);
        return json({ error: `Upstream returned non-JSON content-type: ${ct}` }, 502);
      }
      const bodyText = await resp.text();
      return new Response(bodyText, { status: resp.status, headers: corsHeaders });
    }

    return json({ error: "Not Found" }, 404);
  } catch (err) {
    console.error('[itunes] Proxy error:', err);
    return json({ error: `Proxy error: ${err?.message || String(err)}` }, 500);
  }
});
