/**
 * Metadata Dimension Radar Chart
 *
 * Radar/spider chart showing metadata dimension scores (0-100).
 * Visualizes balance across relevance, learning, structure, brand balance.
 *
 * Enhanced with KPI tooltips for user guidance.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Radar as RadarIcon } from 'lucide-react';
import { KpiTooltip } from '../KpiTooltip';

interface RadarDataPoint {
  dimension: string;
  score: number;
  fullMark: number;
  metricId: string; // For tooltip lookup
}

interface MetadataDimensionRadarProps {
  metadataDimensionScores: {
    relevance: number;
    discovery: number;
    structure: number;
    brandBalance: number;
    intentQuality: number;
    compliance?: number;
    discoveryCoverage?: number;
  };
}

export const MetadataDimensionRadar: React.FC<MetadataDimensionRadarProps> = ({
  metadataDimensionScores,
}) => {
  const data: RadarDataPoint[] = useMemo(() => {
    const points: RadarDataPoint[] = [
      { dimension: 'Relevance', score: metadataDimensionScores.relevance, fullMark: 100, metricId: 'relevance' },
      { dimension: 'Discovery', score: metadataDimensionScores.discovery, fullMark: 100, metricId: 'discovery_coverage' },
      { dimension: 'Structure', score: metadataDimensionScores.structure, fullMark: 100, metricId: 'structure' },
      { dimension: 'Brand Balance', score: metadataDimensionScores.brandBalance, fullMark: 100, metricId: 'brand_balance' },
      { dimension: 'Intent Quality', score: metadataDimensionScores.intentQuality, fullMark: 100, metricId: 'intent_coverage' },
    ];

    // Add optional dimensions if available
    if (metadataDimensionScores.compliance !== undefined) {
      points.push({ dimension: 'Compliance', score: metadataDimensionScores.compliance, fullMark: 100, metricId: 'compliance' });
    }
    if (metadataDimensionScores.discoveryCoverage !== undefined) {
      points.push({ dimension: 'Discovery', score: metadataDimensionScores.discoveryCoverage, fullMark: 100, metricId: 'discovery' });
    }

    return points;
  }, [metadataDimensionScores]);

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <RadarIcon className="h-4 w-4 text-cyan-400" />
          METADATA DIMENSION BALANCE
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Multi-axis quality assessment — target: balanced hexagon at 80+
        </p>
      </CardHeader>

      <CardContent className="pt-0 flex justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#3f3f46" strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
              stroke="#71717a"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
              stroke="#3f3f46"
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ fill: '#22d3ee', r: 4 }}
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
              itemStyle={{ color: '#22d3ee' }}
              formatter={(value: number) => value.toFixed(1)}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <span>&lt; 50</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span>50-80</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400/60" />
              <span>80+</span>
            </div>
          </div>
        </div>

        {/* Dimension Explanations */}
        <div className="mt-4 pt-4 border-t border-zinc-800/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {data.map((item) => (
              <div key={item.metricId} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">{item.dimension}:</span>
                <span className="text-cyan-300 font-mono">{item.score.toFixed(0)}</span>
                <KpiTooltip
                  metricId={item.metricId}
                  currentScore={item.score}
                  iconSize="sm"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
