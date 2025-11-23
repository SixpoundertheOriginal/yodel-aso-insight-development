/**
 * Severity Donut Chart
 *
 * Pie/donut chart showing recommendation severity distribution.
 * Categories: Critical, Strong, Moderate, Optional, Success.
 *
 * Uses existing recommendations array with severity parsing - NO backend changes.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { parseRecommendation, type RecommendationSeverity } from '../utils';

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

interface SeverityDonutProps {
  recommendations: string[];
}

const SEVERITY_COLORS: Record<RecommendationSeverity, string> = {
  critical: '#ef4444',   // red-500
  strong: '#f97316',     // orange-500
  moderate: '#eab308',   // yellow-500
  optional: '#3b82f6',   // blue-500
  success: '#10b981',    // emerald-500
};

const SEVERITY_ORDER: RecommendationSeverity[] = ['critical', 'strong', 'moderate', 'optional', 'success'];

export const SeverityDonut: React.FC<SeverityDonutProps> = ({
  recommendations,
}) => {
  const data: SeverityData[] = useMemo(() => {
    // Count recommendations by severity
    const counts: Record<RecommendationSeverity, number> = {
      critical: 0,
      strong: 0,
      moderate: 0,
      optional: 0,
      success: 0,
    };

    recommendations.forEach(rec => {
      const parsed = parseRecommendation(rec);
      counts[parsed.severity]++;
    });

    // Convert to chart data, maintaining severity order
    return SEVERITY_ORDER
      .map(severity => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: counts[severity],
        color: SEVERITY_COLORS[severity],
      }))
      .filter(item => item.value > 0);
  }, [recommendations]);

  if (data.length === 0) {
    return (
      <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            ISSUE SEVERITY MIX
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-zinc-500 text-center py-8">No recommendations to analyze</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          ISSUE SEVERITY MIX
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Recommendation priority distribution
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
              formatter={(value: number) => [`${value} issues`, 'Count']}
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
