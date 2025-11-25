/**
 * Vertical Overview Panel
 *
 * Phase 21: Vertical Intelligence Layer
 *
 * Displays vertical-specific overview information:
 * - Vertical name and market
 * - Category keywords
 * - Discovery drivers
 * - Retention hooks
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Target, Magnet, Sparkles } from 'lucide-react';
import type { VerticalContext } from './types';

interface VerticalOverviewPanelProps {
  verticalContext: VerticalContext;
}

export const VerticalOverviewPanel: React.FC<VerticalOverviewPanelProps> = ({
  verticalContext,
}) => {
  const { verticalName, marketName, overview } = verticalContext;

  if (!overview) {
    return null;
  }

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-violet-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-violet-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-violet-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-violet-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          VERTICAL OVERVIEW
        </CardTitle>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-zinc-400">Vertical:</span>
          <span className="font-semibold text-violet-400">{verticalName}</span>
          {marketName && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Market:</span>
              <span className="font-medium text-zinc-300">{marketName}</span>
            </>
          )}
        </div>
        {overview.description && (
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            {overview.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Keywords */}
        {overview.category_keywords && overview.category_keywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Category Keywords
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overview.category_keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-mono bg-cyan-900/30 text-cyan-300 border border-cyan-700/40 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Discovery Drivers */}
        {overview.discovery_drivers && overview.discovery_drivers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Magnet className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Discovery Drivers
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overview.discovery_drivers.map((driver, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-mono bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 rounded"
                >
                  {driver}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Retention Hooks */}
        {overview.retention_hooks && overview.retention_hooks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                Retention Hooks
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overview.retention_hooks.map((hook, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-mono bg-purple-900/30 text-purple-300 border border-purple-700/40 rounded"
                >
                  {hook}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
