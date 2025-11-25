/**
 * Semantic Density Gauge
 *
 * Radial gauge showing semantic repetition density.
 * High density = metadata repeats same meaning (over-optimization).
 * Low density = scattered messaging (lack of focus).
 *
 * Enhanced with KPI tooltips for user guidance.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Gauge } from 'lucide-react';
import type { ClassifiedCombo } from '../types';
import { KpiTooltip } from '../KpiTooltip';

interface SemanticDensityGaugeProps {
  comboCoverage: {
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
  };
}

/**
 * Get gauge color based on density score
 */
const getDensityColor = (density: number): string => {
  if (density <= 40) return '#10b981'; // green - balanced
  if (density <= 70) return '#eab308'; // yellow - medium
  return '#ef4444'; // red - over-repeated
};

/**
 * Get density assessment
 */
const getDensityAssessment = (density: number): { label: string; message: string } => {
  if (density <= 40) {
    return {
      label: 'BALANCED',
      message: 'Good semantic diversity. Each combo conveys unique value.',
    };
  }
  if (density <= 70) {
    return {
      label: 'MODERATE',
      message: 'Some intent overlap. Consider diversifying messaging angles.',
    };
  }
  return {
    label: 'HIGH DENSITY',
    message: 'Significant semantic repetition. Metadata repeats same intent multiple times.',
  };
};

export const SemanticDensityGauge: React.FC<SemanticDensityGaugeProps> = ({
  comboCoverage,
}) => {
  const densityData = useMemo(() => {
    const titleCombos = comboCoverage.titleCombosClassified || [];
    const subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];
    const allCombos = [...titleCombos, ...subtitleCombos];

    if (allCombos.length === 0) {
      return { density: 0, uniqueIntents: 0, totalCombos: 0 };
    }

    // Count unique intent classes
    const intentClasses = new Set<string>();
    allCombos.forEach(combo => {
      if (combo.intentClass) {
        intentClasses.add(combo.intentClass);
      } else if (combo.type) {
        // Fallback to type
        intentClasses.add(combo.type);
      }
    });

    const uniqueIntents = intentClasses.size;
    const totalCombos = allCombos.length;
    const repeatedIntents = totalCombos - uniqueIntents;

    // Density = (repeated intents / total combos) * 100
    const density = totalCombos > 0 ? (repeatedIntents / totalCombos) * 100 : 0;

    return { density, uniqueIntents, totalCombos };
  }, [comboCoverage]);

  const { density, uniqueIntents, totalCombos } = densityData;
  const color = getDensityColor(density);
  const assessment = getDensityAssessment(density);

  // Gauge chart data (0-100 scale)
  const gaugeData = [
    { name: 'Density', value: density, fill: color },
    { name: 'Remaining', value: 100 - density, fill: '#27272a' }, // zinc-800
  ];

  if (totalCombos === 0) {
    return (
      <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-yellow-400" />
            SEMANTIC DENSITY
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
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-yellow-400" />
          SEMANTIC DENSITY
          <KpiTooltip metricId="semantic_density" iconSize="sm" />
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Intent repetition score — balanced messaging vs. over-optimization
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col items-center">
          {/* Gauge Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="70%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={0}
                dataKey="value"
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Density Score */}
          <div className="mt-[-40px] mb-4 text-center">
            <div
              className="text-4xl font-mono font-bold"
              style={{ color }}
            >
              {density.toFixed(0)}%
            </div>
            <div
              className="text-xs uppercase tracking-widest font-medium mt-1"
              style={{ color }}
            >
              {assessment.label}
            </div>
          </div>

          {/* Assessment Message */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-lg w-full">
            <p className="text-xs text-zinc-400 leading-relaxed text-center">
              {assessment.message}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4 w-full">
            <div className="text-center p-2 bg-zinc-900/20 rounded border border-zinc-800/30">
              <div className="text-lg font-mono font-bold text-cyan-400">{uniqueIntents}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Unique Intents</div>
            </div>
            <div className="text-center p-2 bg-zinc-900/20 rounded border border-zinc-800/30">
              <div className="text-lg font-mono font-bold text-zinc-300">{totalCombos}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Total Combos</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
