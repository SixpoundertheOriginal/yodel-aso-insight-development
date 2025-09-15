import React from 'react'
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection'
import { DemoSelectedAppProvider, useDemoSelectedApp } from '@/context/DemoSelectedAppContext'
import { DemoAppSelectorOverlay } from '@/components/Demo/DemoAppSelectorOverlay'

const Inner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { app } = useDemoSelectedApp()
  const [open, setOpen] = React.useState(!app)
  React.useEffect(()=>{ setOpen(!app) }, [app])
  return <>
    <DemoAppSelectorOverlay isOpen={open} onClose={()=>setOpen(false)} />
    {children}
  </>
}

const DemoGrowthAcceleratorsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDemoOrg, organization } = useDemoOrgDetection()
  if (!isDemoOrg) return <>{children}</>
  return (
    <DemoSelectedAppProvider orgSlug={organization?.slug}>
      <Inner>{children}</Inner>
    </DemoSelectedAppProvider>
  )
}

export default DemoGrowthAcceleratorsLayout

