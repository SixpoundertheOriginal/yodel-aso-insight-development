/**
 * Metadata Opportunity Delta Chart
 *
 * Horizontal bar chart showing delta (gap to 100) for each metadata dimension.
 * Sorted descending by opportunity size (largest gaps first).
 *
 * Uses existing audit DTO data - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface OpportunityDelta {
  label: string;
  value: number;
  color: string;
}

interface MetadataOpportunityDeltaChartProps {
  keywordCoverageScore: number;
  comboCoverageScore: number;
  intentCoverageScore: number;
  metadataDimensionScores: {
    relevance: number;
    discovery: number;
    structure: number;
    brandBalance: number;
  };
}

/**
 * Get color based on delta severity
 */
const getDeltaColor = (delta: number): string => {
  if (delta >= 40) return '#ef4444'; // red-500 - critical
  if (delta >= 25) return '#f97316'; // orange-500 - strong
  if (delta >= 15) return '#eab308'; // yellow-500 - moderate
  return '#10b981'; // emerald-500 - minor
};

export const MetadataOpportunityDeltaChart: React.FC<MetadataOpportunityDeltaChartProps> = ({
  keywordCoverageScore,
  comboCoverageScore,
  intentCoverageScore,
  metadataDimensionScores,
}) => {
  const data: OpportunityDelta[] = useMemo(() => {
    const deltas: OpportunityDelta[] = [
      { label: 'Intent Coverage', value: 100 - intentCoverageScore, color: '' },
      { label: 'Keyword Coverage', value: 100 - keywordCoverageScore, color: '' },
      { label: 'Combo Quality', value: 100 - comboCoverageScore, color: '' },
      { label: 'Discovery Coverage', value: 100 - metadataDimensionScores.discovery, color: '' },
      { label: 'Relevance', value: 100 - metadataDimensionScores.relevance, color: '' },
      { label: 'Structure', value: 100 - metadataDimensionScores.structure, color: '' },
      { label: 'Brand Balance', value: 100 - metadataDimensionScores.brandBalance, color: '' },
    ];

    // Sort descending by value (largest opportunities first)
    deltas.sort((a, b) => b.value - a.value);

    // Assign colors
    deltas.forEach(d => {
      d.color = getDeltaColor(d.value);
    });

    return deltas;
  }, [keywordCoverageScore, comboCoverageScore, intentCoverageScore, metadataDimensionScores]);

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-400" />
          OPTIMIZATION OPPORTUNITIES
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Gap to 100 — largest deltas indicate highest-impact improvements
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
              width={110}
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
              itemStyle={{ color: '#a1a1aa' }}
              formatter={(value: number) => [`${value.toFixed(1)} gap`, 'Delta']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
