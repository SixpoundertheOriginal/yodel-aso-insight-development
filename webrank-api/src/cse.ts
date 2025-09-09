import 'dotenv/config';
import { fetch as undiciFetch } from 'undici';
import { isAppStoreMatch } from './match.js';

const doFetch: typeof fetch = (globalThis as any).fetch ?? (undiciFetch as any);
const API = "https://www.googleapis.com/customsearch/v1";

export type SerpItem = {
  pos: number;
  title: string;
  link: string;
  displayLink: string;
  snippet?: string;
  isTarget: boolean;
};

export type RankAndTop = {
  rank: number | null;
  matchedUrl?: string;
  serpTop: SerpItem[];
};

async function fetchPage({ key, cx, q, start, gl, hl }: any) {
  const qs = new URLSearchParams({ key, cx, q, num: '10', start: String(start), gl, hl, safe: 'off' });
  const res = await doFetch(`${API}?${qs.toString()}`);
  if (!res.ok) throw new Error(`CSE ${res.status} ${res.statusText}`);
  return res.json();
}

export async function keywordRankAndTop(p: {
  keyword: string; appId: string; gl: string; hl: string; apiKey?: string; cx?: string;
}): Promise<RankAndTop> {
  const key = p.apiKey ?? process.env.GOOGLE_API_KEY!;
  const cx  = p.cx    ?? process.env.GOOGLE_CSE_CX!;
  if (!key || !cx || key === 'REPLACE_ME' || cx === 'REPLACE_ME') {
    throw new Error('Missing GOOGLE_API_KEY or GOOGLE_CSE_CX');
  }

  let rank: number | null = null;
  let matchedUrl: string | undefined;
  const serpTop: SerpItem[] = [];

  // Page 1 (positions 1..10) — also build Top 10 list
  const first = await fetchPage({ key, cx, q: p.keyword, start: 1, gl: p.gl, hl: p.hl });
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

  // If not in top-10, scan 11..100
  if (rank == null) {
    let globalPos = 11;
    for (let start = 11; start <= 91; start += 10) {
      const page = await fetchPage({ key, cx, q: p.keyword, start, gl: p.gl, hl: p.hl });
      const items: Array<any> = page.items || [];
      for (let i = 0; i < items.length; i++) {
        const link = items[i].link;
        if (isAppStoreMatch(link, p.appId)) { rank = globalPos + i; matchedUrl = link; break; }
      }
      if (rank != null || !items.length) break;
      globalPos += items.length;
    }
  }

  return { rank, matchedUrl, serpTop };
}

// Backwards-compatible thin wrapper
export type RankResult = { keyword: string; rank: number | null; matchedUrl?: string };
export async function rankForKeywordCSE(p: { keyword: string; appId: string; gl: string; hl: string; apiKey?: string; cx?: string; }): Promise<RankResult> {
  const out = await keywordRankAndTop(p);
  return { keyword: p.keyword, rank: out.rank, matchedUrl: out.matchedUrl };
}
