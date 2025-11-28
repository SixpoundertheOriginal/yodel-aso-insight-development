/**
 * Long-Tail Distribution Chart (V2.1 - Chapter 4 - Nice-to-Have)
 *
 * Visualizes the distribution of keyword combinations by length.
 *
 * **Insights:**
 * - 2-word combos: Broad reach, higher competition
 * - 3-word combos: Sweet spot for long-tail (specific + searchable)
 * - 4+ word combos: Very specific, lower search volume
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ClassifiedCombo } from './types';

interface LongTailDistributionChartProps {
  combos: ClassifiedCombo[];
}

export function LongTailDistributionChart({ combos }: LongTailDistributionChartProps) {
  // Calculate distribution by combo length
  const distribution = useMemo(() => {
    const lengthCounts: Record<string, number> = {
      '1-word': 0,
      '2-word': 0,
      '3-word': 0,
      '4-word': 0,
      '5+ words': 0,
    };

    combos.forEach((combo) => {
      const wordCount = combo.text.split(/\s+/).length;

      if (wordCount === 1) {
        lengthCounts['1-word']++;
      } else if (wordCount === 2) {
        lengthCounts['2-word']++;
      } else if (wordCount === 3) {
        lengthCounts['3-word']++;
      } else if (wordCount === 4) {
        lengthCounts['4-word']++;
      } else {
        lengthCounts['5+ words']++;
      }
    });

    // Convert to array format for Recharts
    const data = [
      { name: '1-word', count: lengthCounts['1-word'], fill: '#6b7280' }, // gray (generic)
      { name: '2-word', count: lengthCounts['2-word'], fill: '#3b82f6' }, // blue
      { name: '3-word', count: lengthCounts['3-word'], fill: '#8b5cf6' }, // purple (long-tail sweet spot)
      { name: '4-word', count: lengthCounts['4-word'], fill: '#a855f7' }, // purple lighter
      { name: '5+ words', count: lengthCounts['5+ words'], fill: '#c084fc' }, // purple lightest
    ];

    const longTailCount = lengthCounts['3-word'] + lengthCounts['4-word'] + lengthCounts['5+ words'];
    const longTailRatio = combos.length > 0 ? (longTailCount / combos.length) * 100 : 0;

    return { data, longTailCount, longTailRatio };
  }, [combos]);

  const { data, longTailCount, longTailRatio } = distribution;

  const getLongTailQuality = (ratio: number) => {
    if (ratio >= 40) return { label: 'Excellent', color: 'emerald' };
    if (ratio >= 25) return { label: 'Good', color: 'blue' };
    if (ratio >= 15) return { label: 'Fair', color: 'yellow' };
    return { label: 'Poor', color: 'red' };
  };

  const quality = getLongTailQuality(longTailRatio);

  return (
    <Card className="group relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-200">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          📊 Chapter 4: Long-Tail Distribution
        </CardTitle>
        <p className="text-sm text-zinc-400">
          Distribution of keyword combinations by length. 3+ word combos capture specific user intent.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <div>
            <div className="text-sm text-zinc-400">Total Combos</div>
            <div className="text-2xl font-bold text-zinc-200">{combos.length}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Long-Tail (3+)</div>
            <div className="text-2xl font-bold text-purple-400">{longTailCount}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Long-Tail Ratio</div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold text-${quality.color}-400`}>
                {longTailRatio.toFixed(0)}%
              </div>
              <Badge
                variant="outline"
                className={`bg-${quality.color}-500/10 text-${quality.color}-400 border-${quality.color}-400/30`}
              >
                {quality.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={{ stroke: '#4b5563' }}
                label={{ value: 'Number of Combos', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  color: '#e4e4e7',
                }}
                cursor={{ fill: '#3f3f46', opacity: 0.3 }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
          <div className="space-y-2">
            <div className="font-medium text-purple-400 text-sm">💡 Long-Tail Insights</div>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
              {longTailRatio >= 40 && (
                <li>Excellent long-tail coverage! You're capturing specific user intent effectively.</li>
              )}
              {longTailRatio >= 25 && longTailRatio < 40 && (
                <li>Good long-tail presence. Consider adding more 3-4 word specific combos.</li>
              )}
              {longTailRatio < 25 && (
                <li>
                  Low long-tail ratio ({longTailRatio.toFixed(0)}%). Focus on 3+ word combinations to capture specific searches.
                </li>
              )}
              <li>
                <strong>3-word combos:</strong> Sweet spot for ranking (specific but still searchable)
              </li>
              <li>
                <strong>4+ word combos:</strong> Very specific, lower competition, high conversion
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
