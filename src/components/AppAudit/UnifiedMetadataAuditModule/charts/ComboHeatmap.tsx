/**
 * Combo Heatmap
 *
 * Grid visualization showing top N combos and their presence across metadata slots.
 * Rows = Top combos sorted by relevance score
 * Columns = Title, Subtitle, Both
 * Cell intensity = presence + score strength
 *
 * Uses existing comboCoverage data - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3x3 } from 'lucide-react';
import { cn } from '@/design-registry';
import type { ClassifiedCombo } from '../types';

interface HeatmapRow {
  combo: string;
  title: number;       // 0 = absent, 1 = present, 2 = high-score
  subtitle: number;
  both: number;
  maxIntensity: number;
}

interface ComboHeatmapProps {
  comboCoverage: {
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
  };
  topN?: number;
}

/**
 * Get intensity (0-2) based on presence and score
 */
const getIntensity = (combo: ClassifiedCombo | undefined): number => {
  if (!combo) return 0;
  // 1 = present, 2 = high relevance score (>=2)
  return combo.relevanceScore >= 2 ? 2 : 1;
};

/**
 * Get cell background color based on intensity
 */
const getIntensityColor = (intensity: number): string => {
  switch (intensity) {
    case 2:
      return 'bg-emerald-500/80';
    case 1:
      return 'bg-emerald-500/40';
    default:
      return 'bg-zinc-800/20';
  }
};

/**
 * Get cell border color based on intensity
 */
const getIntensityBorder = (intensity: number): string => {
  switch (intensity) {
    case 2:
      return 'border-emerald-400/60';
    case 1:
      return 'border-emerald-400/30';
    default:
      return 'border-zinc-700/30';
  }
};

export const ComboHeatmap: React.FC<ComboHeatmapProps> = ({
  comboCoverage,
  topN = 10,
}) => {
  const heatmapData: HeatmapRow[] = useMemo(() => {
    const titleCombos = comboCoverage.titleCombosClassified || [];
    const subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];

    // Create a map of all unique combos
    const comboMap = new Map<string, { title?: ClassifiedCombo; subtitle?: ClassifiedCombo }>();

    titleCombos.forEach(c => {
      if (!comboMap.has(c.text)) {
        comboMap.set(c.text, {});
      }
      comboMap.get(c.text)!.title = c;
    });

    subtitleCombos.forEach(c => {
      if (!comboMap.has(c.text)) {
        comboMap.set(c.text, {});
      }
      comboMap.get(c.text)!.subtitle = c;
    });

    // Convert to heatmap rows
    const rows: HeatmapRow[] = [];
    comboMap.forEach((combos, text) => {
      const titleIntensity = getIntensity(combos.title);
      const subtitleIntensity = getIntensity(combos.subtitle);
      const bothIntensity = titleIntensity > 0 && subtitleIntensity > 0 ? Math.max(titleIntensity, subtitleIntensity) : 0;

      rows.push({
        combo: text,
        title: titleIntensity,
        subtitle: subtitleIntensity,
        both: bothIntensity,
        maxIntensity: Math.max(titleIntensity, subtitleIntensity),
      });
    });

    // Sort by max intensity (highest first), then alphabetically
    rows.sort((a, b) => {
      if (b.maxIntensity !== a.maxIntensity) {
        return b.maxIntensity - a.maxIntensity;
      }
      return a.combo.localeCompare(b.combo);
    });

    // Take top N
    return rows.slice(0, topN);
  }, [comboCoverage, topN]);

  if (heatmapData.length === 0) {
    return (
      <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-blue-400" />
            COMBO HEATMAP
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
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-blue-400" />
          COMBO DISTRIBUTION HEATMAP
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Top {heatmapData.length} combos × slot locations — intensity shows presence + score
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-800">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                  Combo
                </th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium w-24">
                  Title
                </th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium w-24">
                  Subtitle
                </th>
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium w-24">
                  Both
                </th>
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row, index) => (
                <tr key={index} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-3 py-2 text-xs text-zinc-300 font-mono">
                    {row.combo}
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className={cn(
                        'h-8 rounded border flex items-center justify-center text-xs font-mono transition-all',
                        getIntensityColor(row.title),
                        getIntensityBorder(row.title)
                      )}
                    >
                      {row.title > 0 && (
                        <span className="text-zinc-900 font-bold">
                          {row.title === 2 ? '●●' : '●'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className={cn(
                        'h-8 rounded border flex items-center justify-center text-xs font-mono transition-all',
                        getIntensityColor(row.subtitle),
                        getIntensityBorder(row.subtitle)
                      )}
                    >
                      {row.subtitle > 0 && (
                        <span className="text-zinc-900 font-bold">
                          {row.subtitle === 2 ? '●●' : '●'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className={cn(
                        'h-8 rounded border flex items-center justify-center text-xs font-mono transition-all',
                        getIntensityColor(row.both),
                        getIntensityBorder(row.both)
                      )}
                    >
                      {row.both > 0 && (
                        <span className="text-zinc-900 font-bold">
                          {row.both === 2 ? '●●' : '●'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded border border-emerald-400/60 bg-emerald-500/80 flex items-center justify-center">
              <span className="text-zinc-900 font-bold text-xs">●●</span>
            </div>
            <span>High relevance (score ≥2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded border border-emerald-400/30 bg-emerald-500/40 flex items-center justify-center">
              <span className="text-zinc-900 font-bold text-xs">●</span>
            </div>
            <span>Present (score &lt;2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded border border-zinc-700/30 bg-zinc-800/20" />
            <span>Absent</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
