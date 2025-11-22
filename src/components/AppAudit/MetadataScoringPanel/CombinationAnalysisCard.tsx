/**
 * CombinationAnalysisCard Component
 *
 * Displays detailed n-gram combination analysis with Phase 2 enhancements:
 * - Sorting modes (length, intent, category, impact, brand, filler)
 * - Grouped output sections
 * - Enhanced badge highlighting
 * - Performance metrics panel
 * - Strategic insights block
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Layers,
  Sparkles,
  Link2,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { categorizeNgramsByLength } from '@/modules/metadata-scoring/utils/ngram';
import { calculateAvgImpactFromScores } from '@/modules/metadata-scoring/utils/comboImpact';
import type {
  ComboAnalysisEnhanced,
  ClassifiedCombo,
  IntentType
} from '@/modules/metadata-scoring';
import { ComboInsightsBlock } from './ComboInsightsBlock';
import { getScoreColor } from '@/lib/numberFormat';

type SortMode = 'length' | 'intent' | 'category' | 'impact' | 'brand' | 'filler';

interface CombinationAnalysisCardProps {
  title: string;
  subtitle: string;

  // Phase 2: Enhanced mode (if provided, use enhanced analysis)
  enhancedAnalysis?: ComboAnalysisEnhanced;

  // Legacy props (for backward compatibility)
  titleCombos?: string[];
  subtitleNewCombos?: string[];
  allCombinedCombos?: string[];
}

export const CombinationAnalysisCard: React.FC<CombinationAnalysisCardProps> = ({
  title,
  subtitle,
  enhancedAnalysis,
  titleCombos = [],
  subtitleNewCombos = [],
  allCombinedCombos = []
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('length');

  // Use enhanced mode if available, otherwise fall back to legacy mode
  const isEnhancedMode = !!enhancedAnalysis;

  if (!isEnhancedMode) {
    // Legacy mode (original implementation)
    return renderLegacyMode(
      title,
      subtitle,
      titleCombos,
      subtitleNewCombos,
      allCombinedCombos
    );
  }

  // Enhanced mode with Phase 2 features
  const { combos, metrics, insights } = enhancedAnalysis;

  // Group combos by current sort mode
  const groupedCombos = groupCombosBySortMode(combos, sortMode);

  // Calculate stats
  const totalCombos = combos.length;
  const newCombos = combos.filter(c => c.isNew).length;
  const topCombos = combos.filter(c => c.impactScore > 75);

  return (
    <div className="space-y-4">
      {/* Main Combination Analysis Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-cyan-400" />
              <CardTitle className="text-lg">Keyword Combination Analysis</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm border-cyan-400/30 text-cyan-400">
                {totalCombos} Total
              </Badge>
              <Badge variant="outline" className="text-sm border-emerald-400/30 text-emerald-400">
                {newCombos} New
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sorting Bar */}
          <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="length">Length</TabsTrigger>
              <TabsTrigger value="intent">Intent</TabsTrigger>
              <TabsTrigger value="category">Category</TabsTrigger>
              <TabsTrigger value="impact">Impact</TabsTrigger>
              <TabsTrigger value="brand">Brand</TabsTrigger>
              <TabsTrigger value="filler">Filler</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Grouped Combo Display */}
          <div className="space-y-4">
            {Object.entries(groupedCombos).map(([groupName, groupCombos]) => {
              if (groupCombos.length === 0) return null;

              return (
                <div key={groupName}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-zinc-300">
                      {groupName} ({groupCombos.length})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groupCombos.map((combo, idx) => (
                      <ComboBadge key={idx} combo={combo} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* No Combos Message */}
          {totalCombos === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-4">
              <p className="text-sm text-yellow-300">
                <strong>No Meaningful Combinations</strong> — Your metadata doesn't
                create multi-word keyword combinations. Consider adding descriptive
                phrases.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics Panel */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricCard
              label="Long-Tail Strength"
              value={metrics.longTailStrength}
              description="Avg impact of 4-word combos"
            />
            <MetricCard
              label="Intent Diversity"
              value={metrics.intentDiversity}
              description="Coverage of intent types"
            />
            <MetricCard
              label="Category Coverage"
              value={metrics.categoryCoverage}
              description="% combos with category"
            />
            <MetricCard
              label="Redundancy Index"
              value={metrics.redundancyIndex}
              description="Lower is better"
              inverse
            />
            <MetricCard
              label="Avg Filler Ratio"
              value={Math.round(metrics.avgFillerRatio * 100)}
              description="Lower is better"
              inverse
            />
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights Block */}
      <ComboInsightsBlock
        topCombos={topCombos}
        opportunities={insights}
        newComboContribution={{
          count: newCombos,
          avgImpact: calculateAvgImpactFromScores(
            combos.filter(c => c.isNew).map(c => c.impactScore)
          )
        }}
      />
    </div>
  );
};

/**
 * Enhanced badge component with impact-based styling
 */
function ComboBadge({ combo }: { combo: ClassifiedCombo }) {
  const { combo: text, impactScore, isNew, isRedundant, fillerRatio } = combo;

  // Determine badge color based on properties
  let colorClass = 'border-purple-400/30 text-purple-400';
  let icon = null;

  if (impactScore > 75) {
    colorClass = 'border-emerald-500 text-emerald-500 bg-emerald-900/10';
  } else if (impactScore < 40) {
    colorClass = 'border-zinc-500 text-zinc-500';
  } else if (fillerRatio > 0.4) {
    colorClass = 'border-yellow-500 text-yellow-500';
    icon = <AlertTriangle className="h-3 w-3" />;
  } else if (isNew) {
    colorClass = 'border-blue-500 text-blue-500 bg-blue-900/10';
    icon = <Sparkles className="h-3 w-3" />;
  } else if (isRedundant) {
    colorClass = 'border-orange-500 text-orange-500';
    icon = <Link2 className="h-3 w-3" />;
  }

  return (
    <Badge variant="outline" className={`text-xs ${colorClass} flex items-center gap-1`}>
      {text}
      {icon}
    </Badge>
  );
}

/**
 * Metric card component
 */
function MetricCard({
  label,
  value,
  description,
  inverse = false
}: {
  label: string;
  value: number;
  description: string;
  inverse?: boolean;
}) {
  // For inverse metrics (redundancy, filler), lower is better
  const displayValue = isNaN(value) ? 0 : value;
  const colorClass = inverse
    ? displayValue < 30
      ? 'text-emerald-400'
      : displayValue < 60
      ? 'text-yellow-400'
      : 'text-red-400'
    : getScoreColor(displayValue);

  return (
    <div className="bg-zinc-800/50 rounded p-3">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{displayValue}</p>
      <p className="text-xs text-zinc-500 mt-1">{description}</p>
    </div>
  );
}

/**
 * Groups combos based on current sort mode
 */
function groupCombosBySortMode(
  combos: ClassifiedCombo[],
  mode: SortMode
): Record<string, ClassifiedCombo[]> {
  const groups: Record<string, ClassifiedCombo[]> = {};

  switch (mode) {
    case 'length':
      groups['Long-Tail (4+ words)'] = combos.filter(c => c.length === 'long-tail');
      groups['Mid-Tail (3 words)'] = combos.filter(c => c.length === 'mid-tail');
      groups['Short-Tail (2 words)'] = combos.filter(c => c.length === 'short-tail');
      break;

    case 'intent':
      groups['Navigational'] = combos.filter(c => c.intent === 'Navigational');
      groups['Transactional'] = combos.filter(c => c.intent === 'Transactional');
      groups['Informational'] = combos.filter(c => c.intent === 'Informational');
      groups['Noise'] = combos.filter(c => c.intent === 'Noise');
      break;

    case 'category':
      groups['With Category'] = combos.filter(c => c.hasCategory);
      groups['Without Category'] = combos.filter(c => !c.hasCategory);
      break;

    case 'impact':
      groups['High Impact (>75)'] = combos.filter(c => c.impactScore > 75);
      groups['Medium Impact (40-75)'] = combos.filter(
        c => c.impactScore >= 40 && c.impactScore <= 75
      );
      groups['Low Impact (<40)'] = combos.filter(c => c.impactScore < 40);
      break;

    case 'brand':
      groups['Branded'] = combos.filter(c => c.hasBrand);
      groups['Generic'] = combos.filter(c => !c.hasBrand);
      break;

    case 'filler':
      groups['Clean (<20% filler)'] = combos.filter(c => c.fillerRatio < 0.2);
      groups['Moderate (20-40% filler)'] = combos.filter(
        c => c.fillerRatio >= 0.2 && c.fillerRatio <= 0.4
      );
      groups['Filler-Heavy (>40% filler)'] = combos.filter(c => c.fillerRatio > 0.4);
      break;
  }

  return groups;
}

/**
 * Legacy mode renderer (backward compatibility)
 */
function renderLegacyMode(
  title: string,
  subtitle: string,
  titleCombos: string[],
  subtitleNewCombos: string[],
  allCombinedCombos: string[]
) {
  const combinedByLength = categorizeNgramsByLength(allCombinedCombos);
  const newCombosByLength = categorizeNgramsByLength(subtitleNewCombos);

  const totalCombos = allCombinedCombos.length;
  const meaningfulCombos = allCombinedCombos.length;
  const newCombos = subtitleNewCombos.length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-lg">Keyword Combination Analysis</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm border-cyan-400/30 text-cyan-400">
              {totalCombos} Total Combos
            </Badge>
            <Badge variant="outline" className="text-sm border-emerald-400/30 text-emerald-400">
              {newCombos} New from Subtitle
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-800/50 rounded p-3 text-center">
            <p className="text-xs text-zinc-400 mb-1">Total Combinations</p>
            <p className="text-2xl font-bold text-cyan-400">{totalCombos}</p>
          </div>
          <div className="bg-zinc-800/50 rounded p-3 text-center">
            <p className="text-xs text-zinc-400 mb-1">Meaningful Combos</p>
            <p className="text-2xl font-bold text-emerald-400">{meaningfulCombos}</p>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-400/30 rounded p-3 text-center">
            <p className="text-xs text-emerald-400 mb-1 font-medium">New from Subtitle</p>
            <p className="text-2xl font-bold text-emerald-400">{newCombos}</p>
          </div>
        </div>

        {/* 2-Word, 3-Word, 4-Word Combinations */}
        {[2, 3, 4].map(length => {
          const combos = combinedByLength[length] || [];
          const newInLength = newCombosByLength[length] || [];

          if (combos.length === 0) return null;

          return (
            <div key={length}>
              <div className="flex items-center space-x-2 mb-2">
                <p className="text-sm font-medium text-zinc-300">
                  {length}-Word Combinations ({combos.length})
                </p>
                {newInLength.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs border-emerald-400/30 text-emerald-400"
                  >
                    +{newInLength.length} new
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {combos.map((combo, idx) => {
                  const isNew = subtitleNewCombos.includes(combo);
                  return (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-xs ${
                        isNew
                          ? 'border-emerald-400/30 text-emerald-400 bg-emerald-900/10'
                          : 'border-blue-400/30 text-blue-400'
                      }`}
                    >
                      {combo}
                      {isNew && ' ✨'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* No Combos Message */}
        {totalCombos === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-4">
            <p className="text-sm text-yellow-300">
              <strong>No Meaningful Combinations</strong> — Your metadata doesn't create
              multi-word keyword combinations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
