import React from 'react'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<Props> = ({ title, description, icon, className }) => {
  return (
    <div className={cn('text-center py-8 text-muted-foreground', className)}>
      {icon && <div className="w-12 h-12 mx-auto mb-2 opacity-60">{icon}</div>}
      <div className="font-medium text-foreground/90">{title}</div>
      {description && <div className="text-sm mt-1">{description}</div>}
    </div>
  )
}

