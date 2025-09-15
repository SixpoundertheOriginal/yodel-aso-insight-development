import React from 'react'
import { MainLayout } from '@/layouts'
import DemoGrowthAcceleratorsLayout from '@/layouts/DemoGrowthAcceleratorsLayout'
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection'
import { useDemoSelectedApp } from '@/context/DemoSelectedAppContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { Search, Users } from 'lucide-react'
import { AppSelectionModal } from '@/components/shared/AsoShared/AppSelectionModal'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

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
  const { app: anchor, country } = useDemoSelectedApp()

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
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Anchor:</span>
                  {anchor ? (
                    <div className="flex items-center gap-2">
                      {anchor.icon && <img src={anchor.icon} className="w-6 h-6 rounded"/>}
                      <span className="font-medium">{anchor.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{(country||'US').toUpperCase()}</Badge>
                    </div>
                  ) : (
                    <span className="text-sm">No app selected</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Competitors:</span>
                  {competitors.length ? competitors.map(c => (
                    <div key={c.appId} className="flex items-center gap-2 px-2 py-1 border border-zinc-700 rounded">
                      {c.icon && <img src={c.icon} className="w-5 h-5 rounded"/>}
                      <span className="text-sm">{c.name}</span>
                    </div>
                  )) : <span className="text-sm">None</span>}
                </div>
                <Button variant="outline" size="sm" onClick={openPicker}><Users className="w-4 h-4 mr-2"/>Choose Competitors</Button>
                <Button onClick={discoverTop10} disabled={!anchor || !country || loadingDiscovery}><Search className="w-4 h-4 mr-2"/>{loadingDiscovery ? 'Discovering...' : 'Discover Top‑10'}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader><CardTitle className="text-base">Top‑10 Coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false}/>
                    <RTooltip />
                    <Bar dataKey="top10" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {summary.map(s => (
                  <div key={s.app.appId} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="text-xs text-muted-foreground truncate">{s.app.name}</div>
                    <div className="text-lg font-semibold">{s.top10} Top‑10 keywords</div>
                    <div className="text-xs text-muted-foreground">Avg rank: {s.avgRank ?? '—'}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
