/**
 * Keyword Impact Panel Component
 *
 * Shows which keywords were added/removed and their impact on combo generation.
 * Displays combo count, average tier, and sample combos for each keyword.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Minus } from 'lucide-react';
import type { KeywordImpact } from '@/utils/metadataComparisonAnalysis';

export const KeywordImpactPanel: React.FC<{ impact: KeywordImpact[] }> = ({ impact }) => {
  const addedKeywords = impact.filter(k => k.addedOrRemoved === 'added');
  const removedKeywords = impact.filter(k => k.addedOrRemoved === 'removed');

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-purple-400" />
          <CardTitle className="text-sm font-medium text-zinc-300">
            Keyword Impact Analysis
          </CardTitle>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Understanding which keywords drove the change
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Keywords Added */}
        {addedKeywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Plus className="h-3 w-3 text-emerald-400" />
              <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                Keywords Added
              </h4>
            </div>
            <div className="space-y-2">
              {addedKeywords.map((kw, idx) => (
                <KeywordImpactRow key={idx} keyword={kw} type="added" />
              ))}
            </div>
          </div>
        )}

        {/* Keywords Removed */}
        {removedKeywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Minus className="h-3 w-3 text-red-400" />
              <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider">
                Keywords Removed
              </h4>
            </div>
            <div className="space-y-2">
              {removedKeywords.map((kw, idx) => (
                <KeywordImpactRow key={idx} keyword={kw} type="removed" />
              ))}
            </div>
          </div>
        )}

        {addedKeywords.length === 0 && removedKeywords.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">
            No keyword changes detected
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== KEYWORD IMPACT ROW ====================

const KeywordImpactRow: React.FC<{
  keyword: KeywordImpact;
  type: 'added' | 'removed';
}> = ({ keyword, type }) => {
  const bgClass = type === 'added' ? 'bg-emerald-500/10' : 'bg-red-500/10';
  const textClass = type === 'added' ? 'text-emerald-300' : 'text-red-300';
  const badgeClass = type === 'added'
    ? 'border-emerald-400/40 text-emerald-400'
    : 'border-red-400/40 text-red-400';

  return (
    <div className={`p-2 ${bgClass} rounded space-y-1.5`}>
      {/* Keyword name + badges */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-medium ${textClass}`}>
          {keyword.keyword}
        </span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
            {keyword.comboCount} combo{keyword.comboCount > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
            Tier {keyword.avgTier.toFixed(1)} avg
          </Badge>
        </div>
      </div>

      {/* Sample combos */}
      {keyword.sampleCombos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keyword.sampleCombos.map((combo, idx) => (
            <span key={idx} className="text-[10px] text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded">
              {combo}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
