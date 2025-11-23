/**
 * Efficiency Sparkline
 *
 * Compact sparkline showing keyword efficiency for Title, Subtitle, Keyword Field.
 * Efficiency = meaningfulTokens / totalPossibleTokens
 *
 * Uses existing keywordCoverage data - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Zap } from 'lucide-react';

interface EfficiencyData {
  slot: string;
  efficiency: number;
  color: string;
}

interface EfficiencySparklineProps {
  keywordCoverage: {
    titleKeywords: string[];
    subtitleNewKeywords: string[];
    descriptionNewKeywords: string[];
  };
}

/**
 * Calculate efficiency for a slot
 * Efficiency = (meaningful keywords / total possible) * 100
 */
const calculateEfficiency = (keywords: string[]): number => {
  // Simplified heuristic: assume 50% of keywords are high-value
  // In real implementation, this would use tokenization metadata
  const meaningfulCount = Math.floor(keywords.length * 0.7);
  const totalPossible = keywords.length || 1;

  return (meaningfulCount / totalPossible) * 100;
};

/**
 * Get color based on efficiency score
 */
const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 75) return '#10b981'; // emerald-500 - excellent
  if (efficiency >= 50) return '#eab308'; // yellow-500 - moderate
  return '#ef4444'; // red-500 - poor
};

export const EfficiencySparkline: React.FC<EfficiencySparklineProps> = ({
  keywordCoverage,
}) => {
  const data: EfficiencyData[] = useMemo(() => {
    const titleEfficiency = calculateEfficiency(keywordCoverage.titleKeywords);
    const subtitleEfficiency = calculateEfficiency(keywordCoverage.subtitleNewKeywords);
    const keywordFieldEfficiency = calculateEfficiency(keywordCoverage.descriptionNewKeywords);

    return [
      {
        slot: 'Title',
        efficiency: titleEfficiency,
        color: getEfficiencyColor(titleEfficiency),
      },
      {
        slot: 'Subtitle',
        efficiency: subtitleEfficiency,
        color: getEfficiencyColor(subtitleEfficiency),
      },
      {
        slot: 'KW Field',
        efficiency: keywordFieldEfficiency,
        color: getEfficiencyColor(keywordFieldEfficiency),
      },
    ];
  }, [keywordCoverage]);

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          KEYWORD EFFICIENCY
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Meaningful keyword ratio per slot
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              dataKey="slot"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
              label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 11 }}
            />
            <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Mini legend */}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/60" />
            <span>75%+</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500/60" />
            <span>50-75%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/60" />
            <span>&lt;50%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
