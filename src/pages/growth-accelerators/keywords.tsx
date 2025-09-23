import React, { useMemo, useState } from 'react';
import { MainLayout } from '@/layouts';
import { YodelCard, YodelCardHeader, YodelCardContent, MetricStat, EmptyState } from '@/components/ui/design-system';
import { YodelToolbar, YodelToolbarSpacer } from '@/components/ui/design-system';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Rocket, Download, BarChart3, Eye, Filter, Trophy, ArrowUp, ArrowDown, Minus, Users, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';
import { useDemoSelectedApp } from '@/context/DemoSelectedAppContext';
import { getDemoPresetForSlug } from '@/config/demoPresets';
import { featureEnabledForRole, PLATFORM_FEATURES, type UserRole } from '@/constants/features';
import { Navigate } from 'react-router-dom';
import { searchApps as searchItunesApps } from '@/utils/itunesReviews';
import { keywordRankingService } from '@/services';
import { supabase } from '@/integrations/supabase/client';
import { getDemoKeywordsPreset } from '@/config/demoKeywords';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { useDataAccess } from '@/hooks/useDataAccess';
import type { ScrapedMetadata } from '@/types/aso';
import { AppSelectionModal } from '@/components/shared/AsoShared/AppSelectionModal';
import SuggestKeywordsDialog from '@/components/keywords/SuggestKeywordsDialog';
import { PremiumCard, PremiumCardHeader, PremiumCardContent, PremiumTypography } from '@/components/ui/premium';
import { BulkKeywordDiscovery } from '@/components/KeywordIntelligence/BulkKeywordDiscovery';
import { CompetitorIntelligencePanel } from '@/components/KeywordIntelligence/CompetitorIntelligencePanel';
import { useEnhancedKeywordIntelligence } from '@/hooks/useEnhancedKeywordIntelligence';

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
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<'keyword' | 'position' | 'volume' | 'confidence' | 'trend' | 'lastChecked'>('position');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [autoGenerateAfterPick, setAutoGenerateAfterPick] = useState(false);
  const [currentView, setCurrentView] = useState<'overview' | 'discovery' | 'competitors' | 'manual'>('overview');

  // Enhanced Keyword Intelligence
  const enhancedKI = useEnhancedKeywordIntelligence({
    organizationId: effectiveOrgId!,
    targetAppId: selectedApp?.appId,
    enabled: !!effectiveOrgId && !!selectedApp?.appId
  });

  const volumeRank = (v: KeywordRow['volume']) => (v === 'High' ? 3 : v === 'Medium' ? 2 : 1);
  const trendRank = (t: KeywordRow['trend']) => (t === 'up' ? 3 : t === 'stable' ? 2 : 1);

  const displayedRows = useMemo(() => {
    const base = topTenOnly ? rows.filter(r => (r.position ?? 999) <= 10) : rows.slice();
    base.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case 'keyword': av = a.keyword; bv = b.keyword; break;
        case 'position': av = a.position ?? 9999; bv = b.position ?? 9999; break;
        case 'volume': av = volumeRank(a.volume); bv = volumeRank(b.volume); break;
        case 'confidence': av = a.confidence; bv = b.confidence; break;
        case 'trend': av = trendRank(a.trend); bv = trendRank(b.trend); break;
        case 'lastChecked': av = a.lastChecked ? a.lastChecked.getTime() : 0; bv = b.lastChecked ? b.lastChecked.getTime() : 0; break;
      }
      if (av < (bv as any)) return sortDir === 'asc' ? -1 : 1;
      if (av > (bv as any)) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return base;
  }, [rows, topTenOnly, sortKey, sortDir]);

  const headerClick = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const PositionPill: React.FC<{ value: number | null }> = ({ value }) => {
    if (value == null) return <span className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300">—</span>;
    const cls = value <= 3 ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
      : value <= 10 ? 'bg-sky-600/20 text-sky-400 border-sky-500/30'
      : 'bg-zinc-800 text-zinc-300 border-zinc-700';
    return <span className={`px-2 py-0.5 text-xs rounded border ${cls}`}>{value}</span>;
  };

  const VolumePill: React.FC<{ v: KeywordRow['volume'] }> = ({ v }) => {
    const cls = v === 'High' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
      : v === 'Medium' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
      : 'bg-zinc-800 text-zinc-300 border-zinc-700';
    return <span className={`px-2 py-0.5 text-xs rounded border ${cls}`}>{v}</span>;
  };

  const TrendCell: React.FC<{ t: KeywordRow['trend'] }> = ({ t }) => {
    if (t === 'up') return <span className="inline-flex items-center text-emerald-400 text-xs"><ArrowUp className="w-3 h-3 mr-1"/>Up</span>;
    if (t === 'down') return <span className="inline-flex items-center text-rose-400 text-xs"><ArrowDown className="w-3 h-3 mr-1"/>Down</span>;
    return <span className="inline-flex items-center text-zinc-400 text-xs"><Minus className="w-3 h-3 mr-1"/>Stable</span>;
  };

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

  const handleAppPicked = (apps: any[] | ScrapedMetadata | undefined) => {
    const picked = Array.isArray(apps) ? apps[0] : (apps as any);
    if (!picked) return;
    // Robust normalization across different providers/shapes
    const extractAppId = () => {
      if (picked.appId) return String(picked.appId);
      if (picked.trackId) return String(picked.trackId);
      if (picked.url && typeof picked.url === 'string') {
        const m = picked.url.match(/id(\d{5,})/); if (m) return m[1];
      }
      return '';
    };
    const normalized: AppSearchResult = {
      name: picked.name || picked.title || picked.trackName || 'Unknown App',
      appId: extractAppId(),
      developer: picked.developer || picked.artistName || 'Unknown Developer',
      rating: typeof picked.rating === 'number'
        ? picked.rating
        : (typeof picked.averageUserRating === 'number' ? picked.averageUserRating : 0),
      reviews: typeof picked.reviews === 'number'
        ? picked.reviews
        : (typeof picked.userRatingCount === 'number' ? picked.userRatingCount : (picked.reviewCount || 0)),
      icon: picked.icon || picked.artworkUrl512 || picked.artworkUrl100 || picked.screenshot || (picked.screenshots?.[0] || ''),
      applicationCategory: picked.applicationCategory || picked.primaryGenreName || 'App'
    };
    selectApp(normalized);
    setAppPickerOpen(false);
    if (autoGenerateAfterPick) {
      // give the UI a tick to settle
      setTimeout(() => { void discoverTopTen(); }, 100);
      setAutoGenerateAfterPick(false);
    }
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
        body: { op: 'serp-topn', cc: selectedCountry, appId: selectedApp.appId, seeds, maxCandidates: 150, maxPages: 8, rankThreshold: 10 }
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

  // Populate demo keywords on demand
  const populateDemoKeywords = () => {
    if (!isDemoOrg) { toast.error('Demo data is only available in demo mode'); return; }
    const preset = getDemoKeywordsPreset(organization?.slug);
    if (!preset) { toast.error('No demo dataset configured for this organization'); return; }
    // Ensure the Next demo app is selected; if not, auto-select it for demo convenience
    const targetAppId = selectedApp?.appId || demoSel?.app?.appId;
    if (targetAppId !== preset.appId) {
      const nextApp = {
        name: 'Next: Shop Fashion & Homeware',
        appId: preset.appId,
        developer: 'NEXT Retail Ltd',
        rating: 0,
        reviews: 0,
        icon: '',
        applicationCategory: 'Shopping'
      } as AppSearchResult;
      setSelectedApp(nextApp);
    }
    const mapVolume = (pop: number): 'Low' | 'Medium' | 'High' => {
      if (pop >= 50) return 'High';
      if (pop >= 30) return 'Medium';
      return 'Low';
    };
    const now = new Date();
    const demoRows: KeywordRow[] = preset.rows.map(r => ({
      keyword: r.keyword,
      position: r.rank,
      volume: mapVolume(r.popularity),
      confidence: 'actual',
      trend: r.rank <= 3 ? 'up' : (r.rank > 10 ? 'down' : 'stable'),
      lastChecked: now,
    }));
    setRows(demoRows);
    setKeywords(preset.rows.map(r => r.keyword));
    setTopTenOnly(false);
    toast.success('Loaded demo Top Install Keywords');
  };

  const ccToFlag = (cc: string) => {
    try { const up = cc.toUpperCase(); const cps = [...up].map(c => 127397 + c.charCodeAt(0)); return String.fromCodePoint(...cps); } catch { return cc; }
  };

  // Show suggest/manual prompt after user selects an app (first time; respects "don't show again")
  React.useEffect(() => {
    if (!selectedApp) return;
    try {
      const never = localStorage.getItem('kw_intro_never') === 'true';
      const seen = sessionStorage.getItem('kw_intro_shown') === 'true';
      if (!never && !seen) setShowSuggestDialog(true);
    } catch {
      setShowSuggestDialog(true);
    }
  }, [selectedApp]);

  const handleSuggest = () => {
    try { sessionStorage.setItem('kw_intro_shown', 'true'); } catch {}
    setShowSuggestDialog(false);
    if (selectedApp) void discoverTopTen();
  };

  const handleManual = () => {
    try { sessionStorage.setItem('kw_intro_shown', 'true'); } catch {}
    setShowSuggestDialog(false);
  };

  // Demo preset auto-select removed: require manual app selection in demo mode

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* App Search (hidden in demo mode when preset applied) */}
        {!(isDemoOrg && selectedApp) && (
          <YodelCard variant="glass" padding="md">
            <YodelCardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Search className="w-5 h-5" /> Keyword Intelligence</h2>
                {(isSuperAdmin && !isDemoOrg) && (
                  <Badge variant="outline" className="text-xs">BETA</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Search and select an app to analyze its keyword performance</p>
            </YodelCardHeader>
            <YodelCardContent>
              <div className="flex gap-3">
                <Input placeholder="Enter app name..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onKeyDown={e=> e.key==='Enter' && handleSearch()} />
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">🇺🇸 United States</SelectItem>
                    <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                    <SelectItem value="au">🇦🇺 Australia</SelectItem>
                    <SelectItem value="de">🇩🇪 Germany</SelectItem>
                    <SelectItem value="fr">🇫🇷 France</SelectItem>
                    <SelectItem value="it">🇮🇹 Italy</SelectItem>
                    <SelectItem value="es">🇪🇸 Spain</SelectItem>
                    <SelectItem value="nl">🇳🇱 Netherlands</SelectItem>
                    <SelectItem value="se">🇸🇪 Sweden</SelectItem>
                    <SelectItem value="no">🇳🇴 Norway</SelectItem>
                    <SelectItem value="dk">🇩🇰 Denmark</SelectItem>
                    <SelectItem value="jp">🇯🇵 Japan</SelectItem>
                    <SelectItem value="kr">🇰🇷 South Korea</SelectItem>
                    <SelectItem value="br">🇧🇷 Brazil</SelectItem>
                    <SelectItem value="in">🇮🇳 India</SelectItem>
                    <SelectItem value="mx">🇲🇽 Mexico</SelectItem>
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
          <PremiumCard variant="glass" intensity="medium" className="overflow-hidden">
            <PremiumCardHeader className="bg-zinc-900/70 border-b border-zinc-800/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedApp.icon ? (
                    <img src={selectedApp.icon} className="w-12 h-12 rounded-md ring-1 ring-zinc-700 shadow" alt={selectedApp.name} />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-zinc-300 text-lg font-semibold">
                      {selectedApp.name?.[0] || 'A'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <PremiumTypography.SectionTitle className="flex items-center gap-2 truncate">
                      <Eye className="w-5 h-5" />
                      <span className="truncate">{selectedApp.name}</span>
                    </PremiumTypography.SectionTitle>
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedApp.developer} • {selectedApp.applicationCategory}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
                      <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/60">Rating: {(selectedApp.rating || 0).toFixed(2)}/5</span>
                      <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/60">Reviews: {selectedApp.reviews?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-xs text-muted-foreground hidden sm:block">Market</div>
                  <Select value={selectedCountry} onValueChange={(v)=>{ setSelectedCountry(v); setRows([]); }}>
                    <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder={`${ccToFlag(selectedCountry)} ${selectedCountry.toUpperCase()}`} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">🇺🇸 United States</SelectItem>
                      <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                      <SelectItem value="au">🇦🇺 Australia</SelectItem>
                      <SelectItem value="de">🇩🇪 Germany</SelectItem>
                      <SelectItem value="fr">🇫🇷 France</SelectItem>
                      <SelectItem value="it">🇮🇹 Italy</SelectItem>
                      <SelectItem value="es">🇪🇸 Spain</SelectItem>
                      <SelectItem value="nl">🇳🇱 Netherlands</SelectItem>
                      <SelectItem value="se">🇸🇪 Sweden</SelectItem>
                      <SelectItem value="no">🇳🇴 Norway</SelectItem>
                      <SelectItem value="dk">🇩🇰 Denmark</SelectItem>
                      <SelectItem value="jp">🇯🇵 Japan</SelectItem>
                      <SelectItem value="kr">🇰🇷 South Korea</SelectItem>
                      <SelectItem value="br">🇧🇷 Brazil</SelectItem>
                      <SelectItem value="in">🇮🇳 India</SelectItem>
                      <SelectItem value="mx">🇲🇽 Mexico</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={()=>setAppPickerOpen(true)} className="h-8 text-sm">Change App</Button>
                </div>
              </div>
            </PremiumCardHeader>
            <PremiumCardContent className="space-y-4 p-5">
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
                <Button variant="outline" onClick={discoverTopTen} title="Discover keywords where this app ranks Top 10"><Trophy className="w-4 h-4 mr-2" /> Discover Top‑10</Button>
                {isDemoOrg && (
                  <Button variant="outline" onClick={populateDemoKeywords} title="Load demo Top Install Keywords">
                    Top Install Keywords
                  </Button>
                )}
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
                <MetricStat label="Keywords" value={summary.total.toLocaleString()} />
                <MetricStat label="Avg Position" value={summary.avg} />
                <MetricStat label="Top‑10 %" value={`${summary.top10Pct}%`} />
              </div>

              {/* Chart */}
              <div className="border rounded-md p-3 bg-zinc-900/40">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Rank distribution</h4>
                <ChartContainer config={{ count: { label: 'Keywords', color: 'hsl(var(--primary))' } }}>
                  <BarChart data={rankDistribution} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count">
                      {rankDistribution.map((entry, index) => {
                        const COLORS = ['#22c55e', '#60a5fa', '#0ea5e9', '#f59e0b', '#ef4444', '#a3a3a3'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Table */}
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900/60 backdrop-blur text-zinc-300">
                    <tr>
                      <th className="text-left p-2 cursor-pointer select-none" onClick={()=>headerClick('keyword')}>
                        <span className="inline-flex items-center gap-1">Keyword {sortKey==='keyword' && (sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/> )}</span>
                      </th>
                      <th className="text-left p-2 cursor-pointer select-none" onClick={()=>headerClick('position')}>
                        <span className="inline-flex items-center gap-1">Position {sortKey==='position' && (sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/> )}</span>
                      </th>
                      <th className="text-left p-2 cursor-pointer select-none" onClick={()=>headerClick('volume')}>
                        <span className="inline-flex items-center gap-1">Volume {sortKey==='volume' && (sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/> )}</span>
                      </th>
                      <th className="text-left p-2 cursor-pointer select-none" onClick={()=>headerClick('confidence')}>
                        <span className="inline-flex items-center gap-1">Confidence {sortKey==='confidence' && (sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/> )}</span>
                      </th>
                      <th className="text-left p-2 cursor-pointer select-none" onClick={()=>headerClick('trend')}>
                        <span className="inline-flex items-center gap-1">Trend {sortKey==='trend' && (sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/> )}</span>
                      </th>
                      <th className="text-left p-2 cursor-pointer select-none" onClick={()=>headerClick('lastChecked')}>
                        <span className="inline-flex items-center gap-1">Last Checked {sortKey==='lastChecked' && (sortDir==='asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/> )}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map(r => (
                      <tr key={r.keyword} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                        <td className="p-2">{r.keyword}</td>
                        <td className="p-2"><PositionPill value={r.position} /></td>
                        <td className="p-2"><VolumePill v={r.volume} /></td>
                        <td className="p-2 capitalize">
                          <span className={`px-2 py-0.5 text-xs rounded border ${r.confidence === 'actual' ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>{r.confidence}</span>
                        </td>
                        <td className="p-2"><TrendCell t={r.trend} /></td>
                        <td className="p-2">{r.lastChecked ? new Date(r.lastChecked).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td className="p-6" colSpan={6}><EmptyState title="No results yet" description="Enter keywords and press Analyze, or try Discover Top‑10." /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        )}
      </div>
      {/* App picker modal */}
      {appPickerOpen && (
        <AppSelectionModal
          isOpen={appPickerOpen}
          onClose={()=>setAppPickerOpen(false)}
          candidates={[]}
          onSelect={(app)=> handleAppPicked(app as any)}
          searchTerm={''}
          selectMode="single"
          maxSelections={1}
          selectedApps={selectedApp ? [selectedApp as any] : []}
          searchCountry={selectedCountry}
        />
      )}
      {/* First-visit suggestion dialog */}
      <SuggestKeywordsDialog
        open={showSuggestDialog}
        onOpenChange={setShowSuggestDialog}
        onSuggest={handleSuggest}
        onManual={handleManual}
        onSetDontShow={(never) => { try { if (never) localStorage.setItem('kw_intro_never', 'true'); } catch {} }}
        selectedAppName={selectedApp?.name}
      />
    </MainLayout>
  );
};

export default KeywordsIntelligencePage;
