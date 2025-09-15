import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type DemoSelectedApp = {
  name: string
  appId: string
  developer?: string
  icon?: string
  rating?: number
  reviews?: number
  applicationCategory?: string
}

type Ctx = {
  country: string | null
  app: DemoSelectedApp | null
  setCountry: (cc: string) => void
  setApp: (app: DemoSelectedApp) => void
  clear: () => void
}

const DemoSelectedAppContext = createContext<Ctx | undefined>(undefined)

export const DemoSelectedAppProvider: React.FC<{ orgSlug: string | null | undefined; children: React.ReactNode }> = ({ orgSlug, children }) => {
  const storageKeyApp = useMemo(() => (orgSlug ? `demo:selectedApp:${orgSlug.toLowerCase()}` : null), [orgSlug])
  const storageKeyCountry = useMemo(() => (orgSlug ? `demo:selectedCountry:${orgSlug.toLowerCase()}` : null), [orgSlug])

  const [app, setAppState] = useState<DemoSelectedApp | null>(null)
  const [country, setCountryState] = useState<string | null>(null)

  useEffect(() => {
    if (!storageKeyApp || !storageKeyCountry) return
    try {
      const rawApp = localStorage.getItem(storageKeyApp)
      const rawCc = localStorage.getItem(storageKeyCountry)
      if (rawApp) setAppState(JSON.parse(rawApp))
      if (rawCc) setCountryState(rawCc)
    } catch {}
  }, [storageKeyApp, storageKeyCountry])

  const setApp = (a: DemoSelectedApp) => {
    setAppState(a)
    if (storageKeyApp) try { localStorage.setItem(storageKeyApp, JSON.stringify(a)) } catch {}
  }

  const setCountry = (cc: string) => {
    setCountryState(cc)
    if (storageKeyCountry) try { localStorage.setItem(storageKeyCountry, cc) } catch {}
  }

  const clear = () => {
    setAppState(null)
    setCountryState(null)
    if (storageKeyApp) try { localStorage.removeItem(storageKeyApp) } catch {}
    if (storageKeyCountry) try { localStorage.removeItem(storageKeyCountry) } catch {}
  }

  const value: Ctx = { country, app, setCountry, setApp, clear }
  return <DemoSelectedAppContext.Provider value={value}>{children}</DemoSelectedAppContext.Provider>
}

export const useDemoSelectedApp = () => {
  const ctx = useContext(DemoSelectedAppContext)
  if (!ctx) throw new Error('useDemoSelectedApp must be used within DemoSelectedAppProvider')
  return ctx
}

