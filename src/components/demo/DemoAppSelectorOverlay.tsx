import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { useDemoSelectedApp } from '@/context/DemoSelectedAppContext'
import { searchApps as searchItunesApps } from '@/utils/itunesReviews'

type Result = {
  name: string; appId: string; developer: string; icon: string; rating: number; reviews: number; applicationCategory: string
}

export const DemoAppSelectorOverlay: React.FC<{ isOpen: boolean; onClose: () => void }>= ({ isOpen, onClose }) => {
  const { app, country, setApp, setCountry } = useDemoSelectedApp()
  const [cc, setCc] = useState<string>(country || 'us')
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => { if (country) setCc(country) }, [country])

  const handleSearch = async () => {
    if (!term.trim()) return
    setLoading(true)
    try {
      const res = await searchItunesApps({ term, country: cc, limit: 5 })
      setResults(res as Result[])
    } finally { setLoading(false) }
  }

  const choose = (r: Result) => {
    setCountry(cc)
    setApp({ name: r.name, appId: r.appId, developer: r.developer, icon: r.icon, rating: r.rating, reviews: r.reviews, applicationCategory: r.applicationCategory })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v)=> !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose App for Demo</DialogTitle>
          <DialogDescription>Pick a store country and an app once — all demo pages will use it.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Select value={cc} onValueChange={setCc}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="us">🇺🇸 US</SelectItem>
              <SelectItem value="gb">🇬🇧 UK</SelectItem>
              <SelectItem value="ca">🇨🇦 CA</SelectItem>
              <SelectItem value="au">🇦🇺 AU</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Search app..." value={term} onChange={e=>setTerm(e.target.value)} onKeyDown={e=> e.key==='Enter' && handleSearch()} />
          <Button onClick={handleSearch} disabled={loading}><Search className="w-4 h-4 mr-2"/>{loading? 'Searching...' : 'Search'}</Button>
        </div>
        {results.length>0 && (
          <div className="grid gap-2 mt-3">
            {results.map(r => (
              <div key={r.appId} className="p-3 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 cursor-pointer" onClick={()=>choose(r)}>
                <div className="flex items-center gap-3">
                  {r.icon && <img src={r.icon} className="w-10 h-10 rounded" alt={r.name}/>} 
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{r.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{cc.toUpperCase()}</Badge>
                    </div>
                    <div className="text-xs text-zinc-400 truncate">{r.developer} • {(r.rating||0).toFixed(2)} / 5 • {r.reviews.toLocaleString()} ratings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

