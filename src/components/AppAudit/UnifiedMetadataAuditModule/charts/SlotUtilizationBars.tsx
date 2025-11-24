/**
 * Slot Utilization Stacked Bars
 *
 * Stacked bar chart showing token type distribution across Title, Subtitle, Description.
 * Categories: Core, Learning, Generic, Filler, Duplicates, Unused space.
 *
 * Uses existing keywordCoverage data - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Layers } from 'lucide-react';

interface SlotData {
  slot: string;
  core: number;
  learning: number;
  generic: number;
  filler: number;
  duplicates: number;
  unused: number;
}

interface SlotUtilizationBarsProps {
  keywordCoverage: {
    titleKeywords: string[];
    subtitleNewKeywords: string[];
    descriptionNewKeywords: string[];
    titleIgnoredCount?: number;
    subtitleIgnoredCount?: number;
    descriptionIgnoredCount?: number;
  };
  /** Platform - iOS excludes Description from ranking analysis */
  platform?: 'ios' | 'android';
}

/**
 * Estimate token distribution based on keyword counts
 * In real implementation, these would come from enhanced metadata extraction
 */
const estimateTokenDistribution = (
  keywords: string[],
  ignoredCount: number = 0
): { core: number; learning: number; generic: number; filler: number; duplicates: number; unused: number } => {
  const totalKeywords = keywords.length;

  // Heuristic classification (simplified - real data would come from tokenizer)
  const coreCount = Math.floor(totalKeywords * 0.4);
  const learningCount = Math.floor(totalKeywords * 0.2);
  const genericCount = Math.floor(totalKeywords * 0.3);
  const fillerCount = totalKeywords - coreCount - learningCount - genericCount;

  return {
    core: coreCount,
    learning: learningCount,
    generic: genericCount,
    filler: fillerCount,
    duplicates: ignoredCount,
    unused: 0, // Could be calculated from character limits
  };
};

export const SlotUtilizationBars: React.FC<SlotUtilizationBarsProps> = ({
  keywordCoverage,
  platform = 'ios',
}) => {
  // iOS: Description does NOT impact App Store search ranking
  // Only Title and Subtitle are indexed for keyword ranking
  const includeDescription = platform === 'android';

  const data: SlotData[] = useMemo(() => {
    const titleDist = estimateTokenDistribution(
      keywordCoverage.titleKeywords,
      keywordCoverage.titleIgnoredCount || 0
    );

    const subtitleDist = estimateTokenDistribution(
      keywordCoverage.subtitleNewKeywords,
      keywordCoverage.subtitleIgnoredCount || 0
    );

    const slots: SlotData[] = [
      {
        slot: 'Title',
        core: titleDist.core,
        learning: titleDist.learning,
        generic: titleDist.generic,
        filler: titleDist.filler,
        duplicates: titleDist.duplicates,
        unused: titleDist.unused,
      },
      {
        slot: 'Subtitle',
        core: subtitleDist.core,
        learning: subtitleDist.learning,
        generic: subtitleDist.generic,
        filler: subtitleDist.filler,
        duplicates: subtitleDist.duplicates,
        unused: subtitleDist.unused,
      },
    ];

    // Only include Description for Android (where it impacts ranking)
    if (includeDescription) {
      const descriptionDist = estimateTokenDistribution(
        keywordCoverage.descriptionNewKeywords,
        keywordCoverage.descriptionIgnoredCount || 0
      );

      slots.push({
        slot: 'Description',
        core: descriptionDist.core,
        learning: descriptionDist.learning,
        generic: descriptionDist.generic,
        filler: descriptionDist.filler,
        duplicates: descriptionDist.duplicates,
        unused: descriptionDist.unused,
      });
    }

    return slots;
  }, [keywordCoverage, includeDescription]);

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          SLOT UTILIZATION
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Token type distribution across {platform === 'ios' ? 'ranking metadata slots' : 'metadata slots'}
        </p>
        {!includeDescription && (
          <p className="text-[10px] text-yellow-400/80 mt-1 leading-relaxed">
            ⓘ Description excluded — iOS App Store does not index description for keyword ranking
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
            <XAxis
              dataKey="slot"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              labelStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              iconType="circle"
            />
            <Bar dataKey="core" stackId="a" fill="#8b5cf6" name="Core" />
            <Bar dataKey="learning" stackId="a" fill="#22d3ee" name="Learning" />
            <Bar dataKey="generic" stackId="a" fill="#10b981" name="Generic" />
            <Bar dataKey="filler" stackId="a" fill="#71717a" name="Filler" />
            <Bar dataKey="duplicates" stackId="a" fill="#f97316" name="Duplicates" />
            <Bar dataKey="unused" stackId="a" fill="#3f3f46" name="Unused" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
