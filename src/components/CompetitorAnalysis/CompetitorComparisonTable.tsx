/**
 * Competitor Comparison Table
 *
 * AppTweak-style side-by-side comparison of metadata audit KPIs.
 * Displays Your App (fixed left) vs Competitors (horizontal scroll).
 *
 * Features:
 * - Horizontal scroll with frozen first column
 * - Color-coded score cells (green/yellow/orange/red)
 * - Winner badges for best performer in each KPI
 * - Expandable rows for detailed breakdowns
 * - Supports 1-10 competitors
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Crown, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedMetadataAuditResult } from '../AppAudit/UnifiedMetadataAuditModule/types';

interface CompetitorApp {
  id: string;
  name: string;
  audit: UnifiedMetadataAuditResult | null;
  isBaseline?: boolean; // Your app
}

interface CompetitorComparisonTableProps {
  /** Your app (baseline) */
  baselineApp: CompetitorApp;
  /** Competitor apps (1-10) */
  competitorApps: CompetitorApp[];
  /** Platform for display rules */
  platform?: 'ios' | 'android';
}

interface KpiRow {
  id: string;
  label: string;
  description?: string;
  getValue: (audit: UnifiedMetadataAuditResult | null) => number | string;
  format?: 'score' | 'percentage' | 'count' | 'text';
  expandable?: boolean;
  children?: KpiRow[];
}

/**
 * Get color class based on score (0-100)
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
  if (score >= 40) return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
  return 'bg-red-500/20 text-red-400 border-red-500/40';
};

/**
 * KPI Row Definitions
 * Maps to existing audit engine outputs
 */
const getKpiRows = (platform: 'ios' | 'android' = 'ios'): KpiRow[] => {
  const rows: KpiRow[] = [
    {
      id: 'overall',
      label: 'Overall Metadata Score',
      description: 'Weighted score across all ranking elements',
      getValue: (audit) => audit?.overallScore || 0,
      format: 'score',
    },
    {
      id: 'title',
      label: 'Title Score',
      description: '65% of overall ranking weight',
      getValue: (audit) => audit.elements?.title?.score || 0,
      format: 'score',
      expandable: true,
      children: [
        {
          id: 'title_chars',
          label: 'Character Usage',
          getValue: (audit) =>
            `${audit?.elements?.title?.metadata?.characterUsage || 0}/${audit?.elements?.title?.metadata?.maxCharacters || 0}`,
          format: 'text',
        },
        {
          id: 'title_keywords',
          label: 'Keyword Count',
          getValue: (audit) => audit?.elements?.title?.metadata?.keywords?.length || 0,
          format: 'count',
        },
        {
          id: 'title_combos',
          label: 'Combo Count',
          getValue: (audit) => audit?.elements?.title?.metadata?.combos?.length || 0,
          format: 'count',
        },
      ],
    },
    {
      id: 'subtitle',
      label: 'Subtitle Score',
      description: '35% of overall ranking weight',
      getValue: (audit) => audit?.elements?.subtitle?.score || 0,
      format: 'score',
      expandable: true,
      children: [
        {
          id: 'subtitle_chars',
          label: 'Character Usage',
          getValue: (audit) =>
            `${audit?.elements?.subtitle?.metadata?.characterUsage || 0}/${audit?.elements?.subtitle?.metadata?.maxCharacters || 0}`,
          format: 'text',
        },
        {
          id: 'subtitle_keywords',
          label: 'Keyword Count',
          getValue: (audit) => audit?.elements?.subtitle?.metadata?.keywords?.length || 0,
          format: 'count',
        },
        {
          id: 'subtitle_combos',
          label: 'Combo Count',
          getValue: (audit) => audit?.elements?.subtitle?.metadata?.combos?.length || 0,
          format: 'count',
        },
      ],
    },
    {
      id: 'keyword_coverage',
      label: 'Keyword Coverage',
      description: 'Unique keywords across ranking elements',
      getValue: (audit) =>
        (audit?.keywordCoverage?.titleKeywords?.length || 0) + (audit?.keywordCoverage?.subtitleNewKeywords?.length || 0),
      format: 'count',
    },
    {
      id: 'combo_coverage',
      label: 'Combo Coverage (2-4 words)',
      description: 'Multi-word keyword combinations',
      getValue: (audit) => audit?.comboCoverage?.allCombos?.length || 0,
      format: 'count',
      expandable: true,
      children: [
        {
          id: 'combo_2word',
          label: '2-Word Combos',
          getValue: (audit) => audit?.comboCoverage?.byLength?.['2']?.length || 0,
          format: 'count',
        },
        {
          id: 'combo_3word',
          label: '3-Word Combos',
          getValue: (audit) => audit?.comboCoverage?.byLength?.['3']?.length || 0,
          format: 'count',
        },
        {
          id: 'combo_4word',
          label: '4-Word Combos',
          getValue: (audit) => audit?.comboCoverage?.byLength?.['4']?.length || 0,
          format: 'count',
        },
      ],
    },
    {
      id: 'intent_coverage',
      label: 'Search Intent Coverage',
      description: 'Title + Subtitle intent breadth',
      getValue: (audit) => {
        const titleScore = audit?.intentCoverage?.title?.score || 0;
        const subtitleScore = audit?.intentCoverage?.subtitle?.score || 0;
        return Math.round((titleScore + subtitleScore) / 2);
      },
      format: 'score',
      expandable: true,
      children: [
        {
          id: 'intent_title',
          label: 'Title Intent',
          getValue: (audit) => audit?.intentCoverage?.title?.score || 0,
          format: 'score',
        },
        {
          id: 'intent_subtitle',
          label: 'Subtitle Intent',
          getValue: (audit) => audit?.intentCoverage?.subtitle?.score || 0,
          format: 'score',
        },
      ],
    },
  ];

  // Only include Description for Android
  if (platform === 'android') {
    rows.splice(3, 0, {
      id: 'description',
      label: 'Description Score',
      description: 'Impacts Google Play ranking',
      getValue: (audit) => audit?.elements?.description?.score || 0,
      format: 'score',
    });
  } else {
    // For iOS, include but mark as conversion-only
    rows.push({
      id: 'description',
      label: 'Description (Conversion Only)',
      description: 'Does NOT impact iOS ranking',
      getValue: (audit) => audit?.elements?.description?.score || 0,
      format: 'score',
    });
  }

  return rows;
};

export const CompetitorComparisonTable: React.FC<CompetitorComparisonTableProps> = ({
  baselineApp,
  competitorApps,
  platform = 'ios',
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const kpiRows = getKpiRows(platform);
  const allApps = [baselineApp, ...competitorApps].filter((app) => {
    if (!app.audit) {
      console.warn('[CompetitorComparisonTable] Skipping app with missing audit data:', app.id);
      return false;
    }
    return true;
  });

  const fallbackAppNames = allApps
    .filter((app) => app.audit?.intentCoverage?.diagnostics?.fallbackMode)
    .map((app) => app.name);

  if (allApps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Competitor audit data is not available.
      </div>
    );
  }

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  /**
   * Find the best performer for a given KPI row
   */
  const getBestPerformer = (row: KpiRow): string | null => {
    if (row.format === 'text') return null;

    let bestAppId: string | null = null;
    let bestValue = -Infinity;

    allApps.forEach((app) => {
      const value = row.getValue(app.audit);
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);
      if (!isNaN(numValue) && numValue > bestValue) {
        bestValue = numValue;
        bestAppId = app.id;
      }
    });

    return bestAppId;
  };

  /**
   * Render a cell value
   */
const renderCell = (app: CompetitorApp, row: KpiRow, isBest: boolean) => {
  const value = row.getValue(app.audit);
  const numValue = typeof value === 'number' ? value : parseFloat(value as string);
  const displayValue = row.format === 'score' ? `${value}/100` : value;

    const colorClass = row.format === 'score' && !isNaN(numValue) ? getScoreColor(numValue) : '';

    return (
      <div
        className={cn(
          'relative px-4 py-3 text-center border-l border-zinc-800',
          colorClass,
          'transition-colors duration-200'
        )}
      >
        <div className="flex items-center justify-center gap-2">
          {isBest && row.format === 'score' && (
            <Crown className="h-3 w-3 text-yellow-400 flex-shrink-0" />
          )}
          <span className="text-sm font-mono font-medium">{displayValue}</span>
        </div>
      </div>
    );
  };

  /**
   * Render a KPI row
   */
  const renderRow = (row: KpiRow, level: number = 0) => {
    const isExpanded = expandedRows.has(row.id);
    const bestPerformer = getBestPerformer(row);
    const hasChildren = row.expandable && row.children && row.children.length > 0;

    return (
      <React.Fragment key={row.id}>
        {/* Main Row */}
        <div className="grid grid-cols-1 border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
          <div className="grid" style={{ gridTemplateColumns: '280px repeat(auto-fit, minmax(180px, 1fr))' }}>
            {/* Fixed Left Column: KPI Label */}
            <div
              className={cn(
                'sticky left-0 z-10 bg-zinc-950/95 backdrop-blur-sm px-4 py-3 border-r border-zinc-800',
                level > 0 && 'pl-8'
              )}
            >
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button
                    onClick={() => toggleRow(row.id)}
                    className="p-0.5 hover:bg-zinc-800 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    )}
                  </button>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-300">{row.label}</div>
                  {row.description && (
                    <div className="text-[10px] text-zinc-500 mt-0.5">{row.description}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Columns: App Values */}
            {allApps.map((app) => (
              <div key={app.id}>
                {renderCell(app, row, bestPerformer === app.id)}
              </div>
            ))}
          </div>
        </div>

        {/* Child Rows (Expanded) */}
        {hasChildren && isExpanded && row.children!.map((childRow) => renderRow(childRow, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <Card className="relative overflow-hidden bg-zinc-950/80 border-zinc-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-violet-400" />
          Competitive Comparison Matrix
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-2">
          Side-by-side comparison of all audit KPIs • Scroll horizontally to view all competitors
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {fallbackAppNames.length > 0 && (
          <div className="px-6 py-3 bg-amber-900/10 border-b border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              Intent coverage is limited for{' '}
              <span className="font-semibold text-amber-100">{fallbackAppNames.join(', ')}</span>.
              KPI penalties have been softened while Bible patterns sync.
            </div>
          </div>
        )}
        {/* Table Container with Horizontal Scroll */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header Row */}
            <div className="grid border-b-2 border-zinc-800 bg-zinc-900/50">
              <div className="grid" style={{ gridTemplateColumns: '280px repeat(auto-fit, minmax(180px, 1fr))' }}>
                {/* Fixed Left Column: KPI Header */}
                <div className="sticky left-0 z-10 bg-zinc-900/95 backdrop-blur-sm px-4 py-3 border-r border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    KPI Metric
                  </div>
                </div>

                {/* App Headers */}
                {allApps.map((app) => (
                  <div
                    key={app.id}
                    className="px-4 py-3 text-center border-l border-zinc-800"
                  >
                    <div className="text-sm font-semibold text-zinc-200 truncate">
                      {app.name}
                    </div>
                    {app.isBaseline && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-emerald-500/40 text-emerald-400">
                        Your App
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Rows */}
            {kpiRows.map((row) => renderRow(row))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <Crown className="h-3 w-3 text-yellow-400" />
              <span>Best Performer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500/30" />
              <span>80-100 (Excellent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500/30" />
              <span>60-79 (Good)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500/30" />
              <span>40-59 (Fair)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/30" />
              <span>0-39 (Poor)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
