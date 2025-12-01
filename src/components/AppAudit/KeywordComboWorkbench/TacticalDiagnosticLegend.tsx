/**
 * Tactical Diagnostic Legend
 *
 * Collapsible legend showing visual diagnostic codes for combo states.
 * Batman Arkham Knight intelligence UI style.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TacticalDiagnosticLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 bg-black/40 backdrop-blur-md border border-zinc-800/60 rounded-lg overflow-hidden">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/30"
      >
        <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
          Diagnostic Legend
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-zinc-500" />
        ) : (
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        )}
      </Button>

      {/* Legend Content */}
      {isExpanded && (
        <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-zinc-800/60">
          {/* Optimal */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-emerald-500 rounded" />
            <div>
              <div className="text-xs font-medium text-emerald-300">OPTIMAL</div>
              <div className="text-[10px] text-zinc-500">High Pop + Low Comp + Strong</div>
            </div>
          </div>

          {/* High Potential */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-yellow-500 rounded" />
            <div>
              <div className="text-xs font-medium text-yellow-300">HIGH POTENTIAL</div>
              <div className="text-[10px] text-zinc-500">High Pop + Med Comp</div>
            </div>
          </div>

          {/* Opportunity */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-blue-500 rounded" />
            <div>
              <div className="text-xs font-medium text-blue-300">OPPORTUNITY</div>
              <div className="text-[10px] text-zinc-500">Low Comp + Weak Position</div>
            </div>
          </div>

          {/* Low Value */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-red-500/60 rounded" />
            <div>
              <div className="text-xs font-medium text-red-300/80">LOW VALUE</div>
              <div className="text-[10px] text-zinc-500">Low Pop or High Noise</div>
            </div>
          </div>

          {/* Missing */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 border-2 border-dashed border-orange-500/60 rounded" />
            <div>
              <div className="text-xs font-medium text-orange-300">MISSING</div>
              <div className="text-[10px] text-zinc-500">Not in Metadata</div>
            </div>
          </div>

          {/* Normal */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 bg-zinc-700 rounded" />
            <div>
              <div className="text-xs font-medium text-zinc-300">STANDARD</div>
              <div className="text-[10px] text-zinc-500">Balanced Metrics</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
