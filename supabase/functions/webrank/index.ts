import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const CSE_API = "https://www.googleapis.com/customsearch/v1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function extractAppId(appUrl: string): string {
  const m = appUrl.match(/id(\d{5,})/);
  if (!m) throw new Error("App URL must include id<digits> (e.g., .../id1234567890)");
  return m[1];
}

function isAppStoreMatch(link: string, appId: string): boolean {
  try {
    const u = new URL(link);
    if (!u.hostname.endsWith("apps.apple.com")) return false;
    return u.pathname.includes(`id${appId}`);
  } catch { return false; }
}

type SerpItem = { pos: number; title: string; link: string; displayLink: string; snippet?: string; isTarget: boolean };
type RankTop = { rank: number | null; matchedUrl?: string; serpTop: SerpItem[] };

async function fetchPage(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${CSE_API}?${qs.toString()}`);
  if (!res.ok) throw new Error(`CSE ${res.status} ${res.statusText}`);
  return res.json();
}

async function keywordRankAndTop(p: { keyword: string; appId: string; gl: string; hl: string }): Promise<RankTop> {
  const key = Deno.env.get("GOOGLE_API_KEY")!;
  const cx  = Deno.env.get("GOOGLE_CSE_CX")!;
  if (!key || !cx) throw new Error("GOOGLE_API_KEY / GOOGLE_CSE_CX not set");

  let rank: number | null = null;
  let matchedUrl: string | undefined;
  const serpTop: SerpItem[] = [];

  // page 1 (1..10)
  const first = await fetchPage({ key, cx, q: p.keyword, num: "10", start: "1", gl: p.gl, hl: p.hl, safe: "off" });
  const items1: Array<any> = first.items || [];
  items1.forEach((it: any, i: number) => {
    const isTarget = isAppStoreMatch(it.link, p.appId);
    if (isTarget && rank == null) { rank = 1 + i; matchedUrl = it.link; }
    serpTop.push({
      pos: 1 + i,
      title: it.title ?? it.htmlTitle ?? it.displayLink ?? it.link,
      link: it.link,
      displayLink: it.displayLink ?? new URL(it.link).hostname,
      snippet: it.snippet,
      isTarget,
    });
  });

  // pages 2..10 (11..100)
  if (rank == null) {
    let globalPos = 11;
    for (let start = 11; start <= 91; start += 10) {
      const page = await fetchPage({ key, cx, q: p.keyword, num: "10", start: String(start), gl: p.gl, hl: p.hl, safe: "off" });
      const items: Array<any> = page.items || [];
      for (let i = 0; i < items.length; i++) {
        if (isAppStoreMatch(items[i].link, p.appId)) { rank = globalPos + i; matchedUrl = items[i].link; break; }
      }
      if (rank != null || !items.length) break;
      globalPos += items.length;
    }
  }

  return { rank, matchedUrl, serpTop };
}

// --- persistence helpers ---
const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function persistScan(p: {
  orgId: string; platform: "ios"|"android"; appId: string; appUrl: string;
  keyword: string; gl: string; hl: string; device: "mobile"|"desktop";
  provider: "google_cse"; rank: number | null; matchedUrl?: string; serpTop?: any[];
}) {
  // apps
  const appUp = await supa.from("apps").upsert({
    org_id: p.orgId, platform: p.platform, app_store_id: p.appId, app_url: p.appUrl
  }, { onConflict: "org_id,platform,app_store_id" }).select("id").single();
  if (appUp.error) throw appUp.error; const app_id = appUp.data.id;

  // keywords
  const kwUp = await supa.from("keywords").upsert({
    org_id: p.orgId, text: p.keyword
  }, { onConflict: "org_id,text" }).select("id").single();
  if (kwUp.error) throw kwUp.error; const keyword_id = kwUp.data.id;

  // tracks
  const trUp = await supa.from("tracks").upsert({
    org_id: p.orgId, app_id, keyword_id, gl: p.gl, hl: p.hl, device: p.device, provider: p.provider, active: true
  }, { onConflict: "org_id,app_id,keyword_id,gl,hl,device,provider" }).select("id").single();
  if (trUp.error) throw trUp.error; const track_id = trUp.data.id;

  // scans
  const scIns = await supa.from("scans").insert({
    org_id: p.orgId, track_id, rank: p.rank, matched_url: p.matchedUrl, serp_top: p.serpTop ?? null, status: "ok"
  }).select("id, scanned_at").single();
  if (scIns.error) throw scIns.error;

  // simple daily rollup (best/first/visibility)
  const today = new Date().toISOString().slice(0,10);
  const cur = await supa.from("daily_track_metrics").select("*").eq("track_id", track_id).eq("date", today).maybeSingle();
  if (cur.error) throw cur.error;
  let best_rank = cur.data?.best_rank ?? null;
  let first_rank = cur.data?.first_rank ?? null;
  const scans_count = (cur.data?.scans_count ?? 0) + 1;
  if (p.rank != null) {
    best_rank = best_rank == null ? p.rank : Math.min(best_rank, p.rank);
    if (first_rank == null) first_rank = p.rank;
  }
  const visibility = best_rank != null ? (101 - best_rank) / 100 : 0;
  const roll = await supa.from("daily_track_metrics").upsert({
    track_id, date: today, best_rank, first_rank, scans_count, visibility
  }, { onConflict: "track_id,date" });
  if (roll.error) throw roll.error;

  return { scan_id: scIns.data.id, track_id };
}

// --- routing + schemas ---
const RankBody = z.object({ appUrl: z.string().url(), keyword: z.string().min(1), gl: z.string().default("dk"), hl: z.string().default("da") });
const StoreBody = RankBody.extend({
  orgId: z.string().uuid().optional(),
  platform: z.enum(["ios","android"]).default("ios"),
  device: z.enum(["mobile","desktop"]).default("mobile")
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const u = new URL(req.url);
    // expected paths:
    //  - /functions/v1/webrank            -> treat as POST /rank
    //  - /functions/v1/webrank/rank       -> POST
    //  - /functions/v1/webrank/rank/store -> POST
    //  - /functions/v1/webrank/history    -> GET
    const segs = u.pathname.split("/").filter(Boolean);
    const tail = segs[segs.length - 1];
    const prev = segs[segs.length - 2] || "";

    if (req.method === "GET" && tail === "history") {
      const orgId = String(u.searchParams.get("orgId") || "");
      const appUrl = String(u.searchParams.get("appUrl") || "");
      const keyword = String(u.searchParams.get("keyword") || "");
      const gl = String(u.searchParams.get("gl") || "dk");
      const hl = String(u.searchParams.get("hl") || "da");
      const days = Math.max(1, Math.min(365, Number(u.searchParams.get("days") || 30)));
      if (!orgId || !appUrl || !keyword) return json({ points: [], kpis: {} });

      const appId = extractAppId(appUrl);
      // look up track
      const appRow = await supa.from("apps").select("id").eq("org_id", orgId).eq("platform","ios").eq("app_store_id", appId).maybeSingle();
      if (appRow.error) throw appRow.error;
      if (!appRow.data) return json({ points: [], kpis: {} });

      const kwRow = await supa.from("keywords").select("id").eq("org_id", orgId).eq("text", keyword).maybeSingle();
      if (kwRow.error) throw kwRow.error;
      if (!kwRow.data) return json({ points: [], kpis: {} });

      const tr = await supa.from("tracks").select("id").eq("org_id", orgId)
        .eq("app_id", appRow.data.id).eq("keyword_id", kwRow.data.id)
        .eq("gl", gl).eq("hl", hl).eq("device","mobile").eq("provider","google_cse").maybeSingle();
      if (tr.error) throw tr.error;
      if (!tr.data) return json({ points: [], kpis: {} });

      const since = new Date(); since.setDate(since.getDate() - days);
      const fromISO = since.toISOString().slice(0,10);
      const pts = await supa.from("daily_track_metrics").select("date,best_rank,visibility,top10")
        .eq("track_id", tr.data.id).gte("date", fromISO).order("date", { ascending: true });
      if (pts.error) throw pts.error;

      const ranks = (pts.data||[]).map(r => r.best_rank).filter(x => x !== null) as number[];
      const avgRank = ranks.length ? Math.round((ranks.reduce((a,b)=>a+b,0)/ranks.length)*10)/10 : null;
      const top10 = (pts.data||[]).filter(r => r.top10).length;
      const kpis = { days, points: pts.data?.length ?? 0, avgRank, top10Coverage: (pts.data?.length ?? 0) ? Math.round(top10*100/(pts.data!.length))/100 : 0 };

      return json({ points: (pts.data||[]).map(r => ({ date: r.date, best_rank: r.best_rank, visibility: r.visibility, top10: r.top10 })), kpis });
    }

    // POST /rank or bare POST to /webrank
    if (req.method === "POST" && (tail === "rank" || tail === "webrank")) {
      const b = await req.json();
      const { appUrl, keyword, gl, hl } = RankBody.parse(b);
      const appId = extractAppId(appUrl);
      const out = await keywordRankAndTop({ keyword, appId, gl, hl });
      return json({ appUrl, keyword, gl, hl, ...out });
    }

    // POST /rank/store
    if (req.method === "POST" && tail === "store" && prev === "rank") {
      const b = await req.json();
      const { appUrl, keyword, gl, hl, orgId, platform, device } = StoreBody.parse(b);
      const appId = extractAppId(appUrl);
      const out = await keywordRankAndTop({ keyword, appId, gl, hl });
      const org = orgId ?? (Deno.env.get("DEFAULT_ORG_ID") ?? "00000000-0000-0000-0000-000000000000");
      const saved = await persistScan({
        orgId: org, platform, appId, appUrl, keyword, gl, hl, device,
        provider: "google_cse", rank: out.rank, matchedUrl: out.matchedUrl, serpTop: out.serpTop
      });
      return json({ appUrl, keyword, gl, hl, ...out, ...saved });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: (e as any)?.message ?? String(e) }, 400);
  }
});

