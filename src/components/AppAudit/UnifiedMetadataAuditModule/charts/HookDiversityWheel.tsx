/**
 * Hook Diversity Wheel
 *
 * Multi-segment donut chart showing messaging hook distribution.
 * Maps combos into 6 psychological hook categories to assess messaging diversity.
 *
 * Phase 20: Now Bible-powered using hookClassifier with vertical-specific patterns
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Target } from 'lucide-react';
import type { ClassifiedCombo } from '../types';
import { getTooltipConfig } from './InsightTooltip';
import { classifyHook, HOOK_CATEGORY_META, type HookCategory } from '@/engine/asoBible/utils/hookClassifier';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';

interface HookCategoryData {
  name: string;
  value: number;
  color: string;
  description: string;
}

interface HookDiversityWheelProps {
  comboCoverage: {
    titleCombosClassified?: ClassifiedCombo[];
    subtitleNewCombosClassified?: ClassifiedCombo[];
  };
  keywordCoverage: {
    titleKeywords: string[];
    subtitleNewKeywords: string[];
  };
  /** Optional active rule set for vertical-specific hook patterns */
  activeRuleSet?: MergedRuleSet;
}

/**
 * Classify combo into hook category using Bible Engine
 * Wrapper for the Bible-powered hookClassifier
 */
const classifyComboHook = (
  combo: ClassifiedCombo,
  activeRuleSet?: MergedRuleSet
): HookCategory | null => {
  return classifyHook(combo.text, activeRuleSet);
};

export const HookDiversityWheel: React.FC<HookDiversityWheelProps> = ({
  comboCoverage,
  keywordCoverage,
  activeRuleSet,
}) => {
  const data: HookCategoryData[] = useMemo(() => {
    const titleCombos = comboCoverage.titleCombosClassified || [];
    const subtitleCombos = comboCoverage.subtitleNewCombosClassified || [];
    const allCombos = [...titleCombos, ...subtitleCombos];

    // Count by hook category using Bible-powered classifier
    const counts: Record<HookCategory, number> = {
      learning_educational: 0,
      outcome_benefit: 0,
      status_authority: 0,
      ease_of_use: 0,
      time_to_result: 0,
      trust_safety: 0,
    };

    allCombos.forEach(combo => {
      const hook = classifyComboHook(combo, activeRuleSet);
      if (hook) {
        counts[hook]++;
      }
    });

    // Convert to chart data using Bible metadata
    return (Object.entries(counts) as [HookCategory, number][])
      .map(([category, value]) => ({
        name: HOOK_CATEGORY_META[category].label,
        value,
        color: HOOK_CATEGORY_META[category].color,
        description: HOOK_CATEGORY_META[category].description,
      }))
      .filter(item => item.value > 0); // Only show non-zero categories
  }, [comboCoverage, activeRuleSet]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-400" />
            HOOK DIVERSITY
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-zinc-500 text-center py-8">No hook data detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-400" />
          HOOK DIVERSITY WHEEL
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Messaging hook distribution — diverse hooks appeal to broader user psychology
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col items-center">
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
                {...getTooltipConfig()}
                formatter={(value: number, name: string, props: any) => [
                  `${value} hooks (${props.payload.description})`,
                  name,
                ]}
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

          {/* Diversity Score */}
          <div className="mt-4 p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-lg w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Diversity Score</span>
              <span className="text-lg font-mono font-bold text-purple-400">
                {data.length}/6
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              {data.length >= 5
                ? '🎯 Excellent diversity — metadata appeals to multiple user motivations'
                : data.length >= 3
                ? '⚠️ Moderate diversity — consider adding more hook categories'
                : '❌ Low diversity — messaging may be too narrow'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
