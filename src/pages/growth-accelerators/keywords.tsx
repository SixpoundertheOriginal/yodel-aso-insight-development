import React, { useMemo, useState } from 'react';
import { MainLayout } from '@/layouts';
import { YodelCard, YodelCardHeader, YodelCardContent } from '@/components/ui/design-system';
import { YodelToolbar, YodelToolbarSpacer } from '@/components/ui/design-system';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Rocket, Download, BarChart3, Eye, Filter, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';
import { useDemoSelectedApp } from '@/context/DemoSelectedAppContext';
import { getDemoPresetForSlug } from '@/config/demoPresets';
import { featureEnabledForRole, PLATFORM_FEATURES, type UserRole } from '@/constants/features';
import { Navigate } from 'react-router-dom';
import { searchApps as searchItunesApps } from '@/utils/itunesReviews';
import { keywordRankingService, keywordVisibilityCalculatorService } from '@/services';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { useDataAccess } from '@/hooks/useDataAccess';
import type { ScrapedMetadata } from '@/types/aso';

type AppSearchResult = {
  name: string;
  appId: string;
  developer: string;
  rating: number;
  reviews: number;
  icon: string;
  applicationCategory: string;
};

type KeywordRow = {
  keyword: string;
  position: number | null;
  volume: 'Low' | 'Medium' | 'High';
  confidence: 'estimated' | 'actual';
  trend: 'up' | 'down' | 'stable';
  lastChecked: Date | null;
};

const KeywordsIntelligencePage: React.FC = () => {
  // Access control
  const { isSuperAdmin, isOrganizationAdmin, roles = [] } = usePermissions();
  const role = roles[0] || 'viewer';
  const currentUserRole: UserRole = isSuperAdmin ? 'super_admin' : 
    (isOrganizationAdmin ? 'org_admin' : 
    (role?.toLowerCase().includes('aso') ? 'aso_manager' :
    (role?.toLowerCase().includes('analyst') ? 'analyst' : 'viewer')));
  const { isDemoOrg, organization } = useDemoOrgDetection();
  const demoSel = (() => {
    try { return isDemoOrg ? useDemoSelectedApp() : null } catch { return null }
  })();
  const canAccess = featureEnabledForRole('KEYWORD_INTELLIGENCE', currentUserRole) || isDemoOrg;
  if (!canAccess) return <Navigate to="/dashboard" replace />;

  // Org scope
  const dataContext = useDataAccess();
  const { selectedOrganizationId, isSuperAdmin: isSA } = useSuperAdmin();
  const effectiveOrgId = (selectedOrganizationId || dataContext.organizationId || (isSA ? '__platform__' : null)) as string | null;

  // App search state
  const [selectedCountry, setSelectedCountry] = useState('us');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppSearchResult | null>(null);

  // Keywords state
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [topTenOnly, setTopTenOnly] = useState(false);

  // Search apps
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Enter an app name');
      return;
    }
    setSearchLoading(true);
    try {
      const out = await searchItunesApps({ term: searchTerm, country: selectedCountry, limit: 5 });
      setResults(out);
      if (out.length === 0) toast.error('No apps found'); else toast.success(`Found ${out.length} apps`);
    } catch (e: any) {
      toast.error(e?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectApp = (app: AppSearchResult) => {
    setSelectedApp(app);
    setKeywords([]);
    setRows([]);
  };

  // Keywords helpers
  const parseKeywords = (text: string): string[] => {
    return text
      .split(/[\n,]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 50);
  };

  const removeKeyword = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
    setRows(prev => prev.filter(r => r.keyword !== kw));
  };

  // Analyze helper (batch) for a provided keyword list
  const runAnalysis = async (kwList: string[]) => {
    if (!selectedApp) {
      toast.error('Select an app first');
      return;
    }
    if (!effectiveOrgId) {
      toast.error('Organization context missing');
      return;
    }
    if (kwList.length === 0) {
      toast.error('Enter keywords to analyze');
      return;
    }
    setAnalyzing(true);
    try {
      const newRows: KeywordRow[] = [];
      const batch = 5;
      for (let i = 0; i < kwList.length; i += batch) {
        const slice = kwList.slice(i, i + batch);
        const promises = slice.map(async (kw) => {
          try {
            const res = await keywordRankingService.checkKeywordRanking(kw, selectedApp.appId, {
              organizationId: effectiveOrgId,
              cacheEnabled: true,
              batchProcessing: true,
              country: selectedCountry,
            });
            if (res) {
              newRows.push({
                keyword: kw,
                position: res.position ?? null,
                volume: res.volume ?? 'Low',
                confidence: res.confidence,
                trend: res.trend ?? 'stable',
                lastChecked: res.lastChecked ?? new Date()
              });
            } else {
              newRows.push({ keyword: kw, position: null, volume: 'Low', confidence: 'estimated', trend: 'stable', lastChecked: new Date() });
            }
          } catch {
            newRows.push({ keyword: kw, position: null, volume: 'Low', confidence: 'estimated', trend: 'stable', lastChecked: new Date() });
          }
        });
        await Promise.all(promises);
        await new Promise(r => setTimeout(r, 800));
      }

      // Merge into state by keyword
      setRows(prev => {
        const map = new Map<string, KeywordRow>();
        [...prev, ...newRows].forEach(r => { map.set(r.keyword, r); });
        return Array.from(map.values()).sort((a,b) => (a.position ?? 999) - (b.position ?? 999));
      });
      // Merge analyzed keywords into tracked list
      setKeywords(prev => Array.from(new Set([...(prev || []), ...kwList])).slice(0, 50));
      setKeywordInput('');
      toast.success('Analysis completed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Analyze in small batches to respect limits (uses input if present, otherwise current list)
  const analyze = async () => {
    const fromInput = parseKeywords(keywordInput);
    const target = fromInput.length ? fromInput : keywords;
    await runAnalysis(target);
  };

  // Summary and chart data
  const summary = useMemo(() => {
    const total = rows.length;
    const withRank = rows.filter(r => typeof r.position === 'number') as Required<KeywordRow>[];
    const avg = withRank.length ? +(withRank.reduce((s,r)=> s + (r.position||0), 0) / withRank.length).toFixed(1) : 0;
    const top10 = withRank.filter(r => (r.position || 999) <= 10).length;
    const top10Pct = total ? +((top10 / total) * 100).toFixed(1) : 0;
    return { total, avg, top10Pct };
  }, [rows]);

  const rankDistribution = useMemo(() => {
    const source = topTenOnly ? rows.filter(r => (r.position ?? 999) <= 10) : rows;
    const buckets = [
      { label: '1', from: 1, to: 1 },
      { label: '2-5', from: 2, to: 5 },
      { label: '6-10', from: 6, to: 10 },
      { label: '11-20', from: 11, to: 20 },
      { label: '21-50', from: 21, to: 50 },
      { label: '51+', from: 51, to: 999 }
    ];
    return buckets.map(b => ({ bucket: b.label, count: source.filter(r => {
      const p = r.position ?? 9999; return p >= b.from && p <= b.to;
    }).length }));
  }, [rows, topTenOnly]);

  const exportCsv = () => {
    const src = topTenOnly ? rows.filter(r => (r.position ?? 999) <= 10) : rows;
    if (src.length === 0) { toast.error('Nothing to export'); return; }
    const header = 'keyword,position,volume,confidence,trend,last_checked\n';
    const body = src.map(r => [
      JSON.stringify(r.keyword),
      r.position ?? '',
      r.volume,
      r.confidence,
      r.trend,
      r.lastChecked ? new Date(r.lastChecked).toISOString() : ''
    ].join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${selectedApp?.name || 'app'}-${selectedCountry}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const discoverTopTen = async () => {
    if (!selectedApp) { toast.error('Select an app first'); return; }
    const nameSeeds = (selectedApp.name || '').split(/\s+/).filter(Boolean).slice(0, 3);
    const devSeeds = (selectedApp.developer || '').split(/\s+/).filter(Boolean).slice(0, 2);
    const seeds = Array.from(new Set([...nameSeeds, ...devSeeds])).filter(s => s.length >= 2).slice(0, 5);
    if (seeds.length === 0) { toast.error('No seeds available for discovery'); return; }
    try {
      const { data, error } = await supabase.functions.invoke('app-store-scraper', {
        body: { op: 'serp-topN', cc: selectedCountry, appId: selectedApp.appId, seeds, maxCandidates: 150, maxPages: 8, rankThreshold: 10 }
      });
      if (error) throw error;
      const res: Array<{ keyword: string; rank: number }> = Array.isArray(data?.results) ? data.results : [];
      if (res.length === 0) { toast.info('No Top-10 keywords discovered'); return; }
      const newRows: KeywordRow[] = res.map(h => ({ keyword: h.keyword, position: h.rank, volume: 'Low', confidence: 'actual', trend: 'stable', lastChecked: new Date() }));
      setRows(prev => {
        const map = new Map<string, KeywordRow>();
        prev.forEach(r => map.set(r.keyword, r));
        newRows.forEach(r => map.set(r.keyword, r));
        return Array.from(map.values()).sort((a,b) => (a.position ?? 999) - (b.position ?? 999));
      });
      setKeywords(prev => Array.from(new Set([...(prev || []), ...res.map(x=>x.keyword)])).slice(0, 300));
      setTopTenOnly(true);
      toast.success(`Discovered ${res.length} Top-10 keywords`);
    } catch (e: any) {
      toast.error(e?.message || 'Discovery failed');
    }
  };

  const ccToFlag = (cc: string) => {
    try { const up = cc.toUpperCase(); const cps = [...up].map(c => 127397 + c.charCodeAt(0)); return String.fromCodePoint(...cps); } catch { return cc; }
  };

  // Demo preset auto-select (no app search needed)
  React.useEffect(() => {
    if (!isDemoOrg || selectedApp) return;
    if (demoSel && demoSel.app && demoSel.country) {
      setSelectedCountry(demoSel.country);
      setSelectedApp({
        name: demoSel.app.name,
        appId: demoSel.app.appId,
        developer: demoSel.app.developer || 'Demo',
        rating: demoSel.app.rating ?? 0,
        reviews: demoSel.app.reviews ?? 0,
        icon: demoSel.app.icon || '',
        applicationCategory: demoSel.app.applicationCategory || 'App'
      });
      return;
    }
    const preset = getDemoPresetForSlug(organization?.slug);
    if (preset) {
      setSelectedCountry(preset.country || 'us');
      setSelectedApp({
        name: preset.app.name,
        appId: preset.app.appId,
        developer: preset.app.developer || 'Demo',
        rating: preset.app.rating ?? 0,
        reviews: preset.app.reviews ?? 0,
        icon: preset.app.icon || '',
        applicationCategory: preset.app.applicationCategory || 'App'
      });
    }
  }, [isDemoOrg, organization?.slug, selectedApp, demoSel]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* App Search (hidden in demo mode when preset applied) */}
        {!(isDemoOrg && selectedApp) && (
          <YodelCard variant="glass" padding="md">
            <YodelCardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Search className="w-5 h-5" /> Keyword Intelligence</h2>
                <Badge variant="outline" className="text-xs">BETA</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Search and select an app to analyze its keyword performance</p>
            </YodelCardHeader>
            <YodelCardContent>
              <div className="flex gap-3">
                <Input placeholder="Enter app name..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onKeyDown={e=> e.key==='Enter' && handleSearch()} />
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">🇺🇸 US</SelectItem>
                    <SelectItem value="gb">🇬🇧 UK</SelectItem>
                    <SelectItem value="ca">🇨🇦 CA</SelectItem>
                    <SelectItem value="au">🇦🇺 AU</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={searchLoading}>{searchLoading ? 'Searching...' : 'Search'}</Button>
              </div>

              {results.length > 0 && (
                <div className="grid gap-2 mt-4">
                  {results.map(app => (
                    <div key={app.appId} className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${selectedApp?.appId===app.appId? 'ring-2 ring-primary': ''}`} onClick={()=>selectApp(app)}>
                      <div className="flex items-center gap-3">
                        {app.icon && <img src={app.icon} className="w-10 h-10 rounded-md" alt={app.name} />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{app.name}</span>
                            <Badge variant="secondary" className="text-[10px]">{ccToFlag(selectedCountry)} {selectedCountry.toUpperCase()}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {app.developer} • {(app.rating||0).toFixed(2)} / 5 • {app.reviews.toLocaleString()} ratings
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </YodelCardContent>
          </YodelCard>
        )}

        {/* Keywords + Results */}
        {selectedApp && (
          <YodelCard variant="elevated" padding="md">
            <YodelCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedApp.icon && <img src={selectedApp.icon} className="w-10 h-10 rounded-md" alt={selectedApp.name} />}
                  <div>
                    <div className="text-lg font-semibold flex items-center gap-2"><Eye className="w-5 h-5" /> {selectedApp.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedApp.developer}</div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{ccToFlag(selectedCountry)} {selectedCountry.toUpperCase()}</span>
              </div>
            </YodelCardHeader>
            <YodelCardContent className="space-y-4">
              <YodelToolbar>
                <Input
                  placeholder="Enter keywords (comma or newline separated) and press Enter or Analyze"
                  value={keywordInput}
                  onChange={e=>setKeywordInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const list = parseKeywords(keywordInput);
                      if (list.length) {
                        await runAnalysis(list);
                      }
                    }
                  }}
                />
                <YodelToolbarSpacer />
                <Button variant={topTenOnly ? 'default' : 'outline'} onClick={() => setTopTenOnly(v => !v)} title="Show only Top-10 keywords"><Filter className="w-4 h-4 mr-2" /> {topTenOnly ? 'Top-10: ON' : 'Top-10: OFF'}</Button>
                <Button variant="outline" onClick={discoverTopTen} title="Discover keywords where this app ranks Top 10"><Trophy className="w-4 h-4 mr-2" /> Discover Top-10</Button>
                <Button onClick={analyze} disabled={analyzing}><Rocket className="w-4 h-4 mr-2" /> {analyzing? 'Analyzing...' : 'Analyze'}</Button>
                <Button variant="outline" onClick={exportCsv} disabled={rows.length===0}><Download className="w-4 h-4 mr-2" /> Export</Button>
              </YodelToolbar>

              {/* Current keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map(k => (
                    <Badge key={k} variant="secondary" className="text-xs cursor-pointer" onClick={()=>removeKeyword(k)} title="Remove">{k} ✕</Badge>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-xs text-muted-foreground">Keywords</div><div className="text-xl font-semibold">{summary.total}</div></div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-xs text-muted-foreground">Avg Position</div><div className="text-xl font-semibold">{summary.avg}</div></div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><div className="text-xs text-muted-foreground">Top 10 %</div><div className="text-xl font-semibold">{summary.top10Pct}%</div></div>
              </div>

              {/* Chart */}
              <div className="border rounded-md p-3 bg-zinc-900/40">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Rank distribution</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" />
                      <YAxis allowDecimals={false} />
                      <RTooltip />
                      <Bar dataKey="count" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-900/50 text-zinc-300">
                    <tr>
                      <th className="text-left p-2">Keyword</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Volume</th>
                      <th className="text-left p-2">Confidence</th>
                      <th className="text-left p-2">Trend</th>
                      <th className="text-left p-2">Last Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                {(topTenOnly ? rows.filter(r => (r.position ?? 999) <= 10) : rows).map(r => (
                  <tr key={r.keyword} className="border-t border-zinc-800">
                    <td className="p-2">{r.keyword}</td>
                    <td className="p-2">{r.position ?? '—'}</td>
                    <td className="p-2">{r.volume}</td>
                    <td className="p-2 capitalize">{r.confidence}</td>
                        <td className="p-2 capitalize">{r.trend}</td>
                        <td className="p-2">{r.lastChecked ? new Date(r.lastChecked).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>No results yet. Add keywords and run Analyze.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </YodelCardContent>
          </YodelCard>
        )}
      </div>
    </MainLayout>
  );
};

export default KeywordsIntelligencePage;
