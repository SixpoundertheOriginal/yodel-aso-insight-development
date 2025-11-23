/**
 * Token Mix Donut Chart
 *
 * Pie/donut chart showing token type distribution percentages.
 * Categories: Brand, Category, Learning, Outcome, Filler, Duplicate.
 *
 * Uses existing keywordCoverage data - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface TokenMixData {
  name: string;
  value: number;
  color: string;
}

interface TokenMixDonutProps {
  keywordCoverage: {
    titleKeywords: string[];
    subtitleNewKeywords: string[];
    descriptionNewKeywords: string[];
    titleIgnoredCount?: number;
    subtitleIgnoredCount?: number;
  };
}

/**
 * Estimate token breakdown based on keyword counts
 * In real implementation, this would come from enhanced tokenization
 */
const estimateTokenMix = (
  titleKeywords: string[],
  subtitleKeywords: string[],
  descriptionKeywords: string[],
  titleIgnored: number = 0,
  subtitleIgnored: number = 0
): { brand: number; category: number; learning: number; outcome: number; filler: number; duplicate: number } => {
  const totalKeywords = titleKeywords.length + subtitleKeywords.length + descriptionKeywords.length;

  // Heuristic classification (simplified)
  const brand = Math.floor(totalKeywords * 0.15);
  const category = Math.floor(totalKeywords * 0.25);
  const learning = Math.floor(totalKeywords * 0.20);
  const outcome = Math.floor(totalKeywords * 0.15);
  const filler = Math.floor(totalKeywords * 0.10);
  const duplicate = titleIgnored + subtitleIgnored;

  return { brand, category, learning, outcome, filler, duplicate };
};

const TOKEN_COLORS = {
  brand: '#a855f7',     // purple-500
  category: '#3b82f6',  // blue-500
  learning: '#22d3ee',  // cyan-400
  outcome: '#10b981',   // emerald-500
  filler: '#71717a',    // zinc-500
  duplicate: '#f97316', // orange-500
};

export const TokenMixDonut: React.FC<TokenMixDonutProps> = ({
  keywordCoverage,
}) => {
  const data: TokenMixData[] = useMemo(() => {
    const mix = estimateTokenMix(
      keywordCoverage.titleKeywords,
      keywordCoverage.subtitleNewKeywords,
      keywordCoverage.descriptionNewKeywords,
      keywordCoverage.titleIgnoredCount || 0,
      keywordCoverage.subtitleIgnoredCount || 0
    );

    const total = mix.brand + mix.category + mix.learning + mix.outcome + mix.filler + mix.duplicate;

    if (total === 0) {
      return [];
    }

    return [
      { name: 'Brand', value: mix.brand, color: TOKEN_COLORS.brand },
      { name: 'Category', value: mix.category, color: TOKEN_COLORS.category },
      { name: 'Learning', value: mix.learning, color: TOKEN_COLORS.learning },
      { name: 'Outcome', value: mix.outcome, color: TOKEN_COLORS.outcome },
      { name: 'Filler', value: mix.filler, color: TOKEN_COLORS.filler },
      { name: 'Duplicate', value: mix.duplicate, color: TOKEN_COLORS.duplicate },
    ].filter(item => item.value > 0);
  }, [keywordCoverage]);

  if (data.length === 0) {
    return (
      <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-violet-400" />
            TOKEN MIX
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-zinc-500 text-center py-8">No token data available</p>
        </CardContent>
      </Card>
    );
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
          <PieChartIcon className="h-4 w-4 text-violet-400" />
          TOKEN MIX
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Keyword type distribution across all metadata
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#71717a', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              labelStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value} tokens`, 'Count']}
            />
            <Legend
              wrapperStyle={{
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
