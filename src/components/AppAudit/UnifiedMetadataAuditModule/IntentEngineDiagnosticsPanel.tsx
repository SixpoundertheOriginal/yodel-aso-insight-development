/**
 * Intent Engine Diagnostics Panel (DEV ONLY)
 *
 * Phase 16.8: Development-only debug panel for Intent Engine integration.
 * Shows pattern loading status, classification results, and fallback mode indicators.
 *
 * IMPORTANT: Only visible in development mode (NODE_ENV === 'development')
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Database, Brain, BarChart3 } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from './types';

interface IntentEngineDiagnosticsProps {
  auditResult: UnifiedMetadataAuditResult;
  /** Number of patterns loaded (from metadataAuditEngine logs) */
  patternsLoaded?: number;
  /** Whether fallback patterns are being used */
  fallbackMode?: boolean;
  /** Cache TTL remaining in seconds */
  cacheTtlRemaining?: number;
}

export const IntentEngineDiagnosticsPanel: React.FC<IntentEngineDiagnosticsProps> = ({
  auditResult,
  patternsLoaded,
  fallbackMode,
  cacheTtlRemaining,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Compute intent classification statistics from comboCoverage
  const intentStats = useMemo(() => {
    const titleCombos = auditResult.comboCoverage.titleCombosClassified || [];
    const subtitleCombos = auditResult.comboCoverage.subtitleNewCombosClassified || [];
    const allCombos = [...titleCombos, ...subtitleCombos];

    const learningCount = allCombos.filter(c => c.intentClass === 'learning').length;
    const outcomeCount = allCombos.filter(c => c.intentClass === 'outcome').length;
    const brandCount = allCombos.filter(c => c.intentClass === 'brand').length;
    const noiseCount = allCombos.filter(c => c.intentClass === 'noise').length;

    // Combos with intentClass populated
    const classifiedCount = allCombos.filter(c => c.intentClass !== undefined).length;

    // Combos without intentClass (should be 0 in Phase 16.7+)
    const unclassifiedCount = allCombos.length - classifiedCount;

    return {
      totalCombos: allCombos.length,
      classifiedCount,
      unclassifiedCount,
      learningCount,
      outcomeCount,
      brandCount,
      noiseCount,
    };
  }, [auditResult]);

  // Determine Intent Engine health status
  const engineStatus = useMemo(() => {
    if (fallbackMode === true) {
      return {
        status: 'fallback',
        icon: AlertTriangle,
        color: 'text-yellow-400 border-yellow-400/30',
        bgColor: 'bg-yellow-900/10',
        message: 'Using fallback patterns (DB empty or failed)',
      };
    }

    if (patternsLoaded !== undefined && patternsLoaded > 13) {
      return {
        status: 'db-driven',
        icon: CheckCircle2,
        color: 'text-emerald-400 border-emerald-400/30',
        bgColor: 'bg-emerald-900/10',
        message: `Loaded ${patternsLoaded} patterns from Intent Registry`,
      };
    }

    if (patternsLoaded === 13) {
      return {
        status: 'fallback',
        icon: AlertTriangle,
        color: 'text-yellow-400 border-yellow-400/30',
        bgColor: 'bg-yellow-900/10',
        message: 'Using 13 fallback patterns (default)',
      };
    }

    return {
      status: 'unknown',
      icon: AlertTriangle,
      color: 'text-zinc-400 border-zinc-400/30',
      bgColor: 'bg-zinc-900/10',
      message: 'Intent Engine status unknown',
    };
  }, [fallbackMode, patternsLoaded]);

  const StatusIcon = engineStatus.icon;

  return (
    <Card className="relative bg-zinc-900/80 border-2 border-dashed border-purple-500/40 rounded-xl shadow-lg">
      {/* Dev badge in top-right corner */}
      <div className="absolute -top-3 -right-3 z-10">
        <Badge variant="outline" className="bg-purple-900 border-purple-400 text-purple-200 font-mono text-xs px-2 py-1">
          DEV ONLY
        </Badge>
      </div>

      <CardHeader
        className="cursor-pointer hover:bg-zinc-800/30 transition-colors pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono tracking-wide uppercase text-purple-300 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Intent Engine Diagnostics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${engineStatus.color} ${engineStatus.bgColor}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {engineStatus.status}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-2">
          {/* Pattern Loading Status */}
          <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Pattern Loading
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-zinc-500">Patterns Loaded:</span>
                <span className="ml-2 font-mono text-zinc-200">
                  {patternsLoaded !== undefined ? patternsLoaded : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Fallback Mode:</span>
                <span className="ml-2 font-mono text-zinc-200">
                  {fallbackMode === true ? 'YES' : fallbackMode === false ? 'NO' : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Cache TTL:</span>
                <span className="ml-2 font-mono text-zinc-200">
                  {cacheTtlRemaining !== undefined ? `${cacheTtlRemaining}s` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Status:</span>
                <span className={`ml-2 font-mono text-xs ${engineStatus.color}`}>
                  {engineStatus.status}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-400">
              {engineStatus.message}
            </div>
          </div>

          {/* Classification Statistics */}
          <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Classification Statistics
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-zinc-500">Total Combos:</span>
                <span className="ml-2 font-mono text-zinc-200">
                  {intentStats.totalCombos}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Classified:</span>
                <span className="ml-2 font-mono text-emerald-400">
                  {intentStats.classifiedCount}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Unclassified:</span>
                <span className={`ml-2 font-mono ${intentStats.unclassifiedCount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {intentStats.unclassifiedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Intent Breakdown */}
          <div className="p-3 bg-zinc-800/40 rounded-lg border border-zinc-700/50">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Intent Distribution
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Learning:</span>
                <span className="font-mono text-cyan-400">{intentStats.learningCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Outcome:</span>
                <span className="font-mono text-emerald-400">{intentStats.outcomeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Brand:</span>
                <span className="font-mono text-purple-400">{intentStats.brandCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Noise:</span>
                <span className="font-mono text-zinc-500">{intentStats.noiseCount}</span>
              </div>
            </div>
          </div>

          {/* Warnings/Issues */}
          {intentStats.unclassifiedCount > 0 && (
            <div className="p-3 bg-red-900/10 border border-red-400/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-red-400 mb-1">
                    Unclassified Combos Detected
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {intentStats.unclassifiedCount} combo(s) do not have intentClass populated.
                    This may indicate an issue with Intent Engine integration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {fallbackMode === true && (
            <div className="p-3 bg-yellow-900/10 border border-yellow-400/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">
                    Fallback Mode Active
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Intent Engine is using 13 minimal fallback patterns.
                    To use DB-driven patterns, seed the <code className="text-yellow-300 font-mono text-[10px]">aso_intent_patterns</code> table.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check Console Reminder */}
          <div className="text-[10px] text-zinc-500 text-center italic mt-2 pt-2 border-t border-zinc-800">
            💡 Check browser console for detailed Intent Engine logs
          </div>
        </CardContent>
      )}
    </Card>
  );
};
