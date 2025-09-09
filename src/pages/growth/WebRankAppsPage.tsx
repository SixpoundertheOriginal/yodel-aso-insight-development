import React, { useMemo, useState } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { getAppWebRank, getSerpApiBase, type SerpItem } from '@/services/webRankService';

const DEFAULT_APP_URL = 'https://apps.apple.com/gb/app/tui-danmark-din-rejseapp/id1099791895';
const DEFAULT_KEYWORD = 'tui danmark';
const DEFAULT_GL = 'dk';
const DEFAULT_HL = 'da';

const COUNTRIES = ['dk', 'gb', 'us', 'de', 'fr', 'es', 'it', 'se', 'no'];
const LANGUAGES = ['da', 'en', 'de', 'fr', 'es', 'it', 'sv', 'no'];

function tryGetHostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const WebRankAppsPage: React.FC = () => {
  const [appUrl, setAppUrl] = useState<string>(DEFAULT_APP_URL);
  const [keyword, setKeyword] = useState<string>(DEFAULT_KEYWORD);
  const [gl, setGl] = useState<string>(DEFAULT_GL);
  const [hl, setHl] = useState<string>(DEFAULT_HL);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rank: number | null; matchedUrl?: string; serpTop?: SerpItem[] } | null>(null);

  const baseConfigured = Boolean((import.meta as any).env?.VITE_SERP_API_BASE);
  const apiBase = useMemo(() => getSerpApiBase(), []);

  const onRun = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await getAppWebRank({ appUrl, keyword, gl, hl });
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error('WebRankAppsPage scan error:', e);
      setError(`Failed to reach rank API (${apiBase}). ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const matchedHostname = tryGetHostname(result?.matchedUrl);
  const hasRank = typeof result?.rank === 'number' && result?.rank !== null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-orange-400" />
          <h1 className="text-2xl font-semibold text-foreground">Web Rank (Apps)</h1>
        </div>

        {!baseConfigured && (
          <Card className="bg-yellow-900/20 border-yellow-700">
            <CardContent className="py-4 text-yellow-300">
              Warning: VITE_SERP_API_BASE is not set. Falling back to {apiBase}. If unreachable, the scan may fail.
            </CardContent>
          </Card>
        )}

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-foreground">Run a Web Rank Scan</CardTitle>
            <CardDescription className="text-zinc-400">Search visibility for an App Store URL by a single keyword</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appUrl">App Store URL</Label>
              <Input
                id="appUrl"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://apps.apple.com/..."
                className="bg-zinc-900 border-zinc-800 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. tui danmark"
                className="bg-zinc-900 border-zinc-800 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Market (gl)</Label>
              <Select value={gl} onValueChange={setGl}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-foreground">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-foreground">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language (hl)</Label>
              <Select value={hl} onValueChange={setHl}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-foreground">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-foreground">
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button onClick={onRun} disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Running...
                  </span>
                ) : (
                  'Run Scan'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="py-6">
              <div className="text-red-300">{error}</div>
            </CardContent>
          </Card>
        ) : result ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-foreground">Result</CardTitle>
              <CardDescription className="text-zinc-400">Latest scan summary</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <div className="text-sm text-zinc-400 mb-1">Rank</div>
                <div className="text-4xl font-semibold text-foreground">
                  {hasRank ? result?.rank : 'Not found in top 100'}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-zinc-400 mb-1">Matched URL</div>
                {result?.matchedUrl ? (
                  <a
                    href={result.matchedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-orange-400 hover:underline"
                  >
                    {matchedHostname ?? result.matchedUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <div className="text-zinc-400">—</div>
                )}
                <div className="text-xs text-zinc-500 mt-2">
                  Results reflect the top 100 organic positions.
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-zinc-900/30 border-zinc-800">
            <CardContent className="py-10 text-center text-zinc-400">
              Enter an App Store URL and a keyword, then click “Run Scan”.
            </CardContent>
          </Card>
        )}

        {result?.serpTop && result.serpTop.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-foreground">Top 10 Results</CardTitle>
              <CardDescription className="text-zinc-400">Highlighted when your target app appears</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-800">
                {result.serpTop.map((item) => (
                  <div
                    key={item.pos}
                    className={`flex items-start gap-4 py-3 ${item.isTarget ? 'bg-emerald-900/10 border border-emerald-700/40 rounded-md px-3' : ''}`}
                  >
                    <div className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-sm font-semibold ${item.isTarget ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                      {item.pos}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={item.link} target="_blank" rel="noreferrer" className="text-foreground hover:underline font-medium truncate block">
                        {item.title}
                      </a>
                      <div className="text-xs text-zinc-500 truncate">{item.displayLink}</div>
                      {item.snippet && (
                        <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{item.snippet}</div>
                      )}
                    </div>
                    {item.isTarget && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-600/40">Target</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default WebRankAppsPage;
