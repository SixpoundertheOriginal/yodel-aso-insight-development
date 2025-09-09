import { z } from 'zod';

export type WebRankRequest = {
  appUrl: string;
  keyword: string;
  gl?: string; // country code
  hl?: string; // language code
};

export type SerpItem = {
  pos: number;
  title: string;
  link: string;
  displayLink: string;
  snippet?: string;
  isTarget: boolean;
};

export type WebRankResponse = {
  appUrl: string;
  keyword: string;
  gl: string;
  hl: string;
  rank: number | null;
  matchedUrl?: string;
  serpTop?: SerpItem[];
};

const BASE: string = (import.meta as any).env?.VITE_SERP_API_BASE ?? 'http://localhost:8787';

const serpItemSchema = z.object({
  pos: z.number().int().min(1),
  title: z.string(),
  link: z.string().url(),
  displayLink: z.string(),
  snippet: z.string().optional(),
  isTarget: z.boolean(),
});

const webRankResponseSchema = z.object({
  appUrl: z.string().url(),
  keyword: z.string().min(1),
  gl: z.string().min(1),
  hl: z.string().min(1),
  rank: z.number().int().min(1).max(100).nullable(),
  matchedUrl: z.string().url().optional(),
  serpTop: z.array(serpItemSchema).optional(),
});

export async function getAppWebRank({ appUrl, keyword, gl = 'dk', hl = 'da' }: WebRankRequest): Promise<Pick<WebRankResponse, 'rank' | 'matchedUrl' | 'serpTop'>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${BASE}/rank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appUrl, keyword, gl, hl }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
    }

    const json = await res.json();
    const parsed = webRankResponseSchema.parse(json);
    return { rank: parsed.rank, matchedUrl: parsed.matchedUrl, serpTop: parsed.serpTop };
  } catch (err) {
    console.error('getAppWebRank error:', err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function getSerpApiBase(): string {
  return BASE;
}
