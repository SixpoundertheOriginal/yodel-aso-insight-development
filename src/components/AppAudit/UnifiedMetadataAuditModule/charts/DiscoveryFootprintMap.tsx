/**
 * Discovery Footprint Map
 *
 * Horizontal stacked bar showing combo distribution by intent class.
 * Visualizes metadata's discovery potential across different search intents.
 *
 * Uses existing comboCoverage data - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Map } from 'lucide-react';
import type { ClassifiedCombo } from '../types';
import { getTooltipConfig } from './InsightTooltip';

interface FootprintData {
  name: string;
  learning: number;
  outcome: number;
  generic: number;
  brand: number;
  lowValue: number;
}

interface DiscoveryFootprintMapProps {
  comboCoverage: {
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
    lowValueCombos?: ClassifiedCombo[];
  };
}

/**
 * Intent class colors (unified palette)
 */
const INTENT_COLORS = {
  learning: '#22d3ee',   // cyan-400
  outcome: '#10b981',    // emerald-500
  generic: '#3b82f6',    // blue-500
  brand: '#a855f7',      // purple-500
  lowValue: '#f97316',   // orange-500
};

export const DiscoveryFootprintMap: React.FC<DiscoveryFootprintMapProps> = ({
  comboCoverage,
}) => {
  const data: FootprintData[] = useMemo(() => {
    const titleCombos = comboCoverage.titleCombosClassified || [];
    const subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];
    const lowValueCombos = comboCoverage.lowValueCombos || [];
    const allCombos = [...titleCombos, ...subtitleCombos];

    // Debug logging (DEV ONLY)
    if (process.env.NODE_ENV === 'development') {
      console.log('[DiscoveryFootprintMap] Title combos:', titleCombos.length);
      console.log('[DiscoveryFootprintMap] Subtitle combos:', subtitleCombos.length);
      console.log('[DiscoveryFootprintMap] Low-value combos:', lowValueCombos.length);
      console.log('[DiscoveryFootprintMap] Total valuable combos:', allCombos.length);
      if (allCombos.length > 0) {
        console.log('[DiscoveryFootprintMap] Sample combo:', allCombos[0]);
        console.log('[DiscoveryFootprintMap] Intent class distribution:', {
          learning: allCombos.filter(c => c.intentClass === 'learning').length,
          outcome: allCombos.filter(c => c.intentClass === 'outcome').length,
          brand: allCombos.filter(c => c.intentClass === 'brand').length,
          noise: allCombos.filter(c => c.intentClass === 'noise').length,
          undefined: allCombos.filter(c => !c.intentClass).length,
        });
      }
    }

    // Count by intent class
    let learningCount = 0;
    let outcomeCount = 0;
    let brandCount = 0;
    let genericCount = 0;

    allCombos.forEach(combo => {
      // Phase 16.8: Use intentClass from Intent Engine (Phase 16.7)
      // Phase 20.1: Fixed to properly handle all intent classes
      if (combo.intentClass) {
        // Intent Engine classification available
        if (combo.intentClass === 'learning') {
          learningCount++;
        } else if (combo.intentClass === 'outcome') {
          outcomeCount++;
        } else if (combo.intentClass === 'brand') {
          brandCount++;
        } else if (combo.intentClass === 'noise') {
          // Phase 20.1: Don't skip noise combos - count them as generic
          // Noise combos with type='generic' should still appear in footprint
          if (combo.type === 'generic') {
            genericCount++;
          }
          // Noise combos with type='low_value' are handled in lowValueCombos array
        }
      } else {
        // Fallback: Use legacy type field if intentClass not populated
        // This maintains backward compatibility
        if (combo.type === 'branded') {
          brandCount++;
        } else if (combo.type === 'generic') {
          genericCount++;
        }
        // low_value combos are handled separately below
      }
    });

    const lowValueCount = lowValueCombos.length;

    return [
      {
        name: 'Discovery Footprint',
        learning: learningCount,
        outcome: outcomeCount,
        generic: genericCount,
        brand: brandCount,
        lowValue: lowValueCount,
      },
    ];
  }, [comboCoverage]);

  const total = data[0].learning + data[0].outcome + data[0].generic + data[0].brand + data[0].lowValue;

  if (total === 0) {
    return (
      <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Map className="h-4 w-4 text-cyan-400" />
            DISCOVERY FOOTPRINT
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-zinc-500 text-center py-8">No combo data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Map className="h-4 w-4 text-cyan-400" />
          DISCOVERY FOOTPRINT
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Combo distribution by search intent — informational keywords drive discovery, branded terms support retention
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
            <XAxis
              type="number"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
              width={140}
            />
            <Tooltip {...getTooltipConfig()} formatter={(value: number, name: string) => [`${value} combos`, name]} />
            <Legend
              wrapperStyle={{
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              iconType="circle"
            />
            <Bar dataKey="learning" stackId="a" fill={INTENT_COLORS.learning} name="Informational" />
            <Bar dataKey="outcome" stackId="a" fill={INTENT_COLORS.outcome} name="Outcome" />
            <Bar dataKey="generic" stackId="a" fill={INTENT_COLORS.generic} name="Generic" />
            <Bar dataKey="brand" stackId="a" fill={INTENT_COLORS.brand} name="Brand" />
            <Bar dataKey="lowValue" stackId="a" fill={INTENT_COLORS.lowValue} name="Low-Value" />
          </BarChart>
        </ResponsiveContainer>

        {/* Stats Summary */}
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          <div>
            <div className="text-lg font-mono font-bold text-cyan-400">{data[0].learning}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Informational</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-emerald-500">{data[0].outcome}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Outcome</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-blue-500">{data[0].generic}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Generic</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-purple-500">{data[0].brand}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Brand</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-orange-500">{data[0].lowValue}</div>
            <div className="text-[10px] text-zinc-500 uppercase">Low-Value</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
