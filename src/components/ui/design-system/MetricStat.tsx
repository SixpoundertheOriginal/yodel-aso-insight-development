import React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: React.ReactNode
  description?: React.ReactNode
  className?: string
  icon?: React.ReactNode
}

export const MetricStat: React.FC<Props> = ({ label, value, description, className, icon }) => {
  return (
    <div className={cn('rounded-lg border border-zinc-800 bg-zinc-900/40 p-3', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold leading-tight">{value}</div>
      {description && (
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  )
}

