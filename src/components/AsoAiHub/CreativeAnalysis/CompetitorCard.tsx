import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrapedMetadata } from '@/types/aso';

interface CompetitorCardProps {
  app: ScrapedMetadata;
  onRemove: (app: ScrapedMetadata) => void;
}

export const CompetitorCard = ({ app, onRemove }: CompetitorCardProps) => (
  <div className="competitor-card flex items-center gap-4 p-4 border border-zinc-800 rounded-lg">
    {app.icon && (
      <img src={app.icon} alt={app.name} className="w-12 h-12 rounded-lg" />
    )}
    <div className="flex-1 overflow-hidden">
      <h4 className="font-semibold truncate text-foreground">{app.name}</h4>
      {app.developer && (
        <p className="text-sm text-zinc-400 truncate">{app.developer}</p>
      )}
      <div className="text-xs text-zinc-500 flex gap-2">
        {app.rating && <span>★ {app.rating}</span>}
        {app.applicationCategory && <span>{app.applicationCategory}</span>}
      </div>
    </div>
    <Button variant="ghost" size="sm" onClick={() => onRemove(app)}>
      Remove
    </Button>
  </div>
);

