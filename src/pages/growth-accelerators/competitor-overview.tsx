import React from 'react'
import { MainLayout } from '@/layouts'
import DemoGrowthAcceleratorsLayout from '@/layouts/DemoGrowthAcceleratorsLayout'
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection'
import { useDemoSelectedApp } from '@/context/DemoSelectedAppContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { demoDownloadsNextVsHM } from '@/config/demoCompetitorDownloads'
import { demoCompetitorKeywords } from '@/config/demoCompetitorKeywords'
import { Search, Users, BarChart3 } from 'lucide-react'
import { AppSelectionModal } from '@/components/shared/AsoShared/AppSelectionModal'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { 
  PremiumCard, 
  PremiumCardHeader, 
  PremiumCardContent, 
  PremiumTypography,
  ResponsiveGrid,
  AnimatedCounter
} from '@/components/ui/premium'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

type AppLite = {
  name: string
  appId: string
  developer?: string
  icon?: string
  rating?: number
  reviews?: number
  applicationCategory?: string
}

type TopNHit = { keyword: string; rank: number }

const CompetitorOverviewPage: React.FC = () => {
  const { isDemoOrg, organization } = useDemoOrgDetection()
  const demoKey = organization?.slug ? organization.slug.toLowerCase() : 'demo'
  
  // Only use demo selected app context when in demo mode
  let anchor = null
  let country = null
  
  if (isDemoOrg) {
    try {
      const demoContext = useDemoSelectedApp()
      anchor = demoContext.app
      country = demoContext.country
    } catch {
      // Fallback if context is not available
      anchor = null
      country = null
    }
  }

  // competitors state (persist to localStorage for demo)
  const storageKey = `demo:competitors:${demoKey}`
  const [competitors, setCompetitors] = React.useState<AppLite[]>(() => {
    try { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  React.useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(competitors)) } catch {} }, [competitors])

  const [showPicker, setShowPicker] = React.useState(false)
  const openPicker = () => setShowPicker(true)
  const closePicker = () => setShowPicker(false)

  // discovery results per app
  const [topHits, setTopHits] = React.useState<Record<string, TopNHit[]>>({})
  const [loadingDiscovery, setLoadingDiscovery] = React.useState(false)

  const appsToCompare: AppLite[] = anchor ? [anchor as AppLite, ...competitors] : competitors

  const discoverTop10 = async () => {
    if (!country || !anchor) { toast.error('Select a country and app first'); return }
    if (appsToCompare.length === 0) { toast.error('Add at least one competitor'); return }
    setLoadingDiscovery(true)
    try {
      const nextTop: Record<string, TopNHit[]> = { ...topHits }
      for (const app of appsToCompare) {
        const nameSeeds = (app.name || '').split(/\s+/).filter(Boolean).slice(0, 3)
        const devSeeds = (app.developer || '').split(/\s+/).filter(Boolean).slice(0, 2)
        const seeds = Array.from(new Set([...nameSeeds, ...devSeeds])).filter(s => s.length >= 2).slice(0, 5)
        const { data, error } = await supabase.functions.invoke('app-store-scraper', {
          body: { op: 'serp-topn', cc: country, appId: app.appId, seeds, maxCandidates: 150, maxPages: 8, rankThreshold: 10 }
        })
        if (error) {
          console.warn('Top-10 discovery error for', app.name, error)
          continue
        }
        const res: Array<{ keyword: string; rank: number }> = Array.isArray(data?.results) ? data.results : []
        nextTop[app.appId] = res
        // polite delay between apps
        await new Promise(r => setTimeout(r, 120))
      }
      setTopHits(nextTop)
      toast.success('Top-10 discovery completed')
    } finally { setLoadingDiscovery(false) }
  }

  const summary = React.useMemo(() => {
    return appsToCompare.map(app => {
      const hits = topHits[app.appId] || []
      const top10 = hits.length
      const avgRank = hits.length ? Math.round((hits.reduce((s,h)=> s + h.rank, 0) / hits.length) * 10)/10 : null
      return { app, top10, avgRank }
    })
  }, [appsToCompare, topHits])

  const chartData = React.useMemo(() => summary.map(s => ({ name: s.app.name, top10: s.top10 })), [summary])

  const downloadsData = React.useMemo(() => {
    // Always available in demo mode; safe to render regardless of selection
    return demoDownloadsNextVsHM.map(r => ({ date: r.date, Next: r.next, HM: r.hm }))
  }, [])

  const compKwData = React.useMemo(() => {
    // Filter to "competitor ranked well" (hmRank <= 10) and Next not ranked or rank > 10
    return demoCompetitorKeywords
      .filter(r => r.hmRank <= 10 && (!r.nextRank || r.nextRank > 10))
      .map(r => ({
        keyword: r.keyword,
        popularity: r.popularity,
        impressions: r.impressions,
        results: r.results,
        nextRank: r.nextRank,
        hmRank: r.hmRank,
      }));
  }, [])

  const handleCompetitorsSelected = (apps: any[]) => {
    // normalize fields compatible with AppSelectionModal
    const norm: AppLite[] = apps.map(a => ({
      name: a.name, appId: a.appId, developer: a.developer, icon: a.icon, rating: a.rating, reviews: a.reviews, applicationCategory: a.applicationCategory
    }))
    setCompetitors(norm)
    setShowPicker(false)
  }

  return (
    <MainLayout>
      <DemoGrowthAcceleratorsLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Competitor Overview</h1>
              <p className="text-sm text-muted-foreground">Compare Top‑10 keyword coverage and ratings across competitors</p>
            </div>
            {isDemoOrg && <Badge variant="outline" className="text-xs">DEMO</Badge>}
          </div>

          {/* Selection */}
          <PremiumCard variant="glow" intensity="medium" glowColor="blue" className="overflow-hidden">
            <PremiumCardHeader className="bg-zinc-900/70 backdrop-blur border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <PremiumTypography.SectionTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Competitor Selection
                </PremiumTypography.SectionTitle>
              </div>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Anchor App:</span>
                  {anchor ? (
                    <div className="flex items-center gap-2 px-2 py-1 border border-zinc-700 rounded-lg bg-zinc-900/50">
                      {anchor.icon && <img src={anchor.icon} className="w-6 h-6 rounded"/>}
                      <span className="font-medium text-foreground">{anchor.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{(country||'US').toUpperCase()}</Badge>
                    </div>
                  ) : (
                    <span className="text-sm">No app selected</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Competitors:</span>
                  {competitors.length ? competitors.map(c => (
                    <div key={c.appId} className="flex items-center gap-2 px-2 py-1 border border-zinc-700 rounded-lg bg-zinc-900/50">
                      {c.icon && <img src={c.icon} className="w-5 h-5 rounded"/>}
                      <span className="text-sm text-foreground">{c.name}</span>
                    </div>
                  )) : <span className="text-sm">None</span>}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={openPicker}><Users className="w-4 h-4 mr-2"/>Choose Competitors</Button>
                  <Button onClick={discoverTop10} disabled={!anchor || !country || loadingDiscovery}><Search className="w-4 h-4 mr-2"/>{loadingDiscovery ? 'Discovering...' : 'Discover Top‑10'}</Button>
                </div>
              </div>
            </PremiumCardContent>
          </PremiumCard>

          {/* Summary metrics removed to revert to previous polish */}

          {/* Demo Downloads Trend: Next vs H&M */}
          {isDemoOrg && (
            <PremiumCard variant="glow" intensity="strong" glowColor="orange" className="overflow-hidden">
              <PremiumCardHeader className="bg-zinc-900/70 backdrop-blur border-b border-zinc-800/50">
                <PremiumTypography.SectionTitle gradient="orange">Downloads (Demo): Next vs H&M</PremiumTypography.SectionTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="p-6">
                <ChartContainer config={{ Next: { label: 'Next', color: '#60a5fa' }, HM: { label: 'H&M', color: '#ef4444' } }}>
                  <ComposedChart data={downloadsData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" interval={8} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="Next" stroke="var(--color-Next)" dot={false} />
                    <Line type="monotone" dataKey="HM" stroke="var(--color-HM)" dot={false} />
                  </ComposedChart>
                </ChartContainer>
              </PremiumCardContent>
            </PremiumCard>
          )}

          {/* Demo Competitor Keywords: H&M advantage */}
          {isDemoOrg && (
            <PremiumCard variant="elevated" intensity="medium" className="overflow-hidden">
              <PremiumCardHeader className="bg-zinc-900/70 backdrop-blur border-b border-zinc-800/50">
                <PremiumTypography.SectionTitle>Competitor Keywords (Demo): H&M strong vs Next</PremiumTypography.SectionTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Popularity</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Next Rank</TableHead>
                      <TableHead>H&M Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compKwData.map(row => (
                      <TableRow key={row.keyword}>
                        <TableCell className="font-medium">{row.keyword}</TableCell>
                        <TableCell>{row.popularity}</TableCell>
                        <TableCell>{row.impressions.toLocaleString()}</TableCell>
                        <TableCell>{row.results.toLocaleString()}</TableCell>
                        <TableCell>{row.nextRank ?? '—'}</TableCell>
                        <TableCell className="text-emerald-400 font-medium">{row.hmRank}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PremiumCardContent>
            </PremiumCard>
          )}

          {/* Competitor picker modal */}
          {showPicker && (
            <AppSelectionModal
              isOpen={showPicker}
              onClose={closePicker}
              candidates={[]}
              onSelect={()=>{}}
              searchTerm={''}
              selectMode="multi"
              onMultiSelect={handleCompetitorsSelected}
              maxSelections={5}
              selectedApps={competitors as any}
              searchCountry={country || 'us'}
              requireConfirm
            />
          )}
        </div>
      </DemoGrowthAcceleratorsLayout>
    </MainLayout>
  )
}

export default CompetitorOverviewPage
