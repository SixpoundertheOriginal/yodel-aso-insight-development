export interface SerpOptions {
  cc: string; // country code, e.g., 'us', 'gb'
  term: string; // search term
  limit?: number; // max results to return (best effort)
  maxPages?: number; // best-effort page attempts
}

export interface SerpItem {
  rank: number;
  appId: string;
  name?: string;
  url: string;
}

export interface SerpResult {
  items: SerpItem[];
}

export class AppStoreSerpService {
  private buildUrl(cc: string, term: string): string {
    // App Store search web page (not JSON API). We'll target the localized domain path.
    // Example: https://apps.apple.com/gb/search?term=marks%20and%20spencer
    const enc = encodeURIComponent(term);
    // Add platform hint for server-rendered results
    return `https://apps.apple.com/${cc}/search?term=${enc}&entity=software&platform=iphone`;
  }

  private async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`App Store SERP fetch failed: ${res.status}`);
    }
    return await res.text();
  }

  private parseItemsFromHtml(html: string, cc: string, limit: number, offsetRank: number = 0): SerpItem[] {
    const linkRegex = /href=\"https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/[^"]*?id(\d{5,})[^\"]*\"/gi;
    const nameRegex = /<a[^>]*href=\"https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/([^\"]*?)\"[^>]*>/i;

    const items: SerpItem[] = [];
    const seenLocal = new Set<string>();
    let m: RegExpExecArray | null;
    let idx = 0;
    while ((m = linkRegex.exec(html)) !== null && items.length < limit) {
      const appId = m[1];
      if (seenLocal.has(appId)) continue;
      seenLocal.add(appId);

      let name: string | undefined;
      try {
        const start = Math.max(0, linkRegex.lastIndex - 300);
        const snippet = html.slice(start, linkRegex.lastIndex + 300);
        const n = nameRegex.exec(snippet);
        if (n && n[1]) {
          const slug = decodeURIComponent(n[1].split('/')[0] || '').replace(/-/g, ' ');
          name = slug
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
            .trim() || undefined;
        }
      } catch {}

      items.push({
        rank: offsetRank + (++idx),
        appId,
        name,
        url: `https://apps.apple.com/${cc}/app/id${appId}`,
      });
    }

    // Fallbacks if nothing parsed
    if (items.length === 0) {
      try {
        const fallbackIds: string[] = [];
        const shoeboxRegex = /<script[^>]+type=\"fastboot\/shoebox\"[^>]*>([\s\S]*?)<\/script>/gi;
        let s: RegExpExecArray | null;
        while ((s = shoeboxRegex.exec(html)) !== null && fallbackIds.length < limit) {
          const content = s[1];
          const idRegex = /\b(id|adamId)\"?\s*[:=]\s*\"?(\d{5,})\"?/gi;
          let im: RegExpExecArray | null;
          while ((im = idRegex.exec(content)) !== null) {
            const id = im[2];
            if (!fallbackIds.includes(id)) fallbackIds.push(id);
            if (fallbackIds.length >= limit) break;
          }
        }
        if (fallbackIds.length) {
          let rank = offsetRank;
          for (const id of fallbackIds) {
            items.push({ rank: ++rank, appId: id, url: `https://apps.apple.com/${cc}/app/id${id}` });
            if (items.length >= limit) break;
          }
        }
      } catch {}
    }
    if (items.length === 0) {
      const ids = Array.from(new Set((html.match(/adamId\"?\s*[:=]\s*\"?(\d{5,})\"?/gi) || []).map((m) => {
        const mm = m.match(/(\d{5,})/); return mm ? mm[1] : '';
      }).filter(Boolean)));
      let rank = offsetRank;
      for (const id of ids) {
        items.push({ rank: ++rank, appId: id, url: `https://apps.apple.com/${cc}/app/id${id}` });
        if (items.length >= limit) break;
      }
    }
    return items;
  }

  /**
   * Fetch and parse App Store web SERP for the given term/country.
   * This parser extracts links containing /id<digits> and returns order as rank.
   */
  async fetchSerp({ cc, term, limit = 50, maxPages = 5 }: SerpOptions): Promise<SerpResult> {
    cc = cc.toLowerCase();
    const baseUrl = this.buildUrl(cc, term);
    const seen = new Set<string>();
    const combined: SerpItem[] = [];

    const collect = (items: SerpItem[]) => {
      for (const it of items) {
        if (!seen.has(it.appId)) {
          seen.add(it.appId);
          combined.push({ ...it, rank: combined.length + 1 });
          if (combined.length >= limit) break;
        }
      }
    };

    // Attempt base page
    try {
      const html = await this.fetchHtml(baseUrl);
      const items = this.parseItemsFromHtml(html, cc, limit);
      collect(items);
    } catch (e) {
      // if base fails, throw
      throw e;
    }

    // If not enough, attempt heuristic pagination patterns; stop when no new items are found
    const attempts: string[] = [];
    for (let p = 2; p <= maxPages; p++) attempts.push(`${baseUrl}&page=${p}`);
    for (let start = 11; start <= 91 && attempts.length < maxPages * 2; start += 10) attempts.push(`${baseUrl}&start=${start}`);

    for (const url of attempts) {
      if (combined.length >= limit) break;
      try {
        const html = await this.fetchHtml(url);
        const before = seen.size;
        const items = this.parseItemsFromHtml(html, cc, limit, combined.length);
        collect(items);
        const after = seen.size;
        // Break early if no progress
        if (after === before) {
          // small delay and then continue; break if repeated no-progress
          // Here we simply continue; callers control limit/maxPages
        }
      } catch {
        // ignore failed page attempts
      }
      // polite tiny delay
      await new Promise(r => setTimeout(r, 120));
    }

    return { items: combined };
  }
}
