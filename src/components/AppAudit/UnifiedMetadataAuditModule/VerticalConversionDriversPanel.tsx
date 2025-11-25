/**
 * Vertical Conversion Drivers Panel
 *
 * Phase 21: Vertical Intelligence Layer
 *
 * Displays vertical-specific conversion driver hooks with:
 * - Hook category and weight multiplier
 * - Examples of effective usage
 * - Matched keywords from metadata
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, CheckCircle, XCircle } from 'lucide-react';
import type { VerticalContext } from './types';
import type { UnifiedMetadataAuditResult } from './types';

interface VerticalConversionDriversPanelProps {
  verticalContext: VerticalContext;
  auditResult: UnifiedMetadataAuditResult;
}

export const VerticalConversionDriversPanel: React.FC<VerticalConversionDriversPanelProps> = ({
  verticalContext,
  auditResult,
}) => {
  const { conversion_drivers } = verticalContext;

  if (!conversion_drivers || conversion_drivers.length === 0) {
    return null;
  }

  // Get all tokens from metadata for matching
  const allTokens = [
    ...auditResult.keywordCoverage.titleKeywords,
    ...auditResult.keywordCoverage.subtitleNewKeywords,
    ...auditResult.keywordCoverage.descriptionNewKeywords,
  ].map((t) => t.toLowerCase());

  // Match conversion driver keywords against metadata
  const driversWithMatches = conversion_drivers.map((driver) => {
    const keywords = driver.keywords || [];
    const matchedKeywords = keywords.filter((kw) => allTokens.includes(kw.toLowerCase()));
    const hasMatch = matchedKeywords.length > 0;

    return {
      ...driver,
      matchedKeywords,
      hasMatch,
    };
  });

  // Sort: matched first, then by weight
  const sortedDrivers = driversWithMatches.sort((a, b) => {
    if (a.hasMatch !== b.hasMatch) {
      return a.hasMatch ? -1 : 1;
    }
    return b.weight_multiplier - a.weight_multiplier;
  });

  return (
    <Card className="relative bg-black/40 border border-zinc-800/50 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-violet-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-violet-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-violet-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-violet-400/60" />

      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium tracking-wide uppercase text-zinc-300 flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-400" />
          CONVERSION DRIVERS
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          Vertical-specific hooks that drive user conversion and retention
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {sortedDrivers.map((driver, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              driver.hasMatch
                ? 'bg-emerald-900/10 border-emerald-700/30'
                : 'bg-zinc-800/20 border-zinc-700/30'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {driver.hasMatch ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-500" />
                )}
                <span className="text-sm font-semibold text-zinc-200">
                  {driver.hook_category}
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-violet-900/30 text-violet-300 border border-violet-700/40 rounded">
                {driver.weight_multiplier.toFixed(1)}x
              </span>
            </div>

            {/* Matched Keywords */}
            {driver.hasMatch && driver.matchedKeywords.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-zinc-400 mr-2">Matched:</span>
                <div className="inline-flex flex-wrap gap-1 mt-1">
                  {driver.matchedKeywords.map((kw, kwIndex) => (
                    <span
                      key={kwIndex}
                      className="px-1.5 py-0.5 text-xs font-mono bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            {driver.examples && driver.examples.length > 0 && (
              <div>
                <span className="text-xs text-zinc-400">Examples:</span>
                <ul className="mt-1 space-y-1">
                  {driver.examples.slice(0, 3).map((example, exIndex) => (
                    <li key={exIndex} className="text-xs text-zinc-300 pl-4 relative">
                      <span className="absolute left-0 top-1">•</span>
                      <span className="italic">&ldquo;{example}&rdquo;</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
