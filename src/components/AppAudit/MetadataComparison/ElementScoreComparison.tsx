/**
 * Element Score Comparison Component
 *
 * Shows individual element score changes (Title, Subtitle, Keywords).
 * Displays baseline → draft with delta badges and progress bars.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { CompactDeltaBadge } from './DeltaBadge';

export const ElementScoreComparison: React.FC<{
  baselineAudit: UnifiedMetadataAuditResult;
  draftAudit: UnifiedMetadataAuditResult;
}> = ({ baselineAudit, draftAudit }) => {
  const elements = [
    {
      name: 'Title',
      baselineScore: baselineAudit.elements.title.score,
      draftScore: draftAudit.elements.title.score,
    },
    {
      name: 'Subtitle',
      baselineScore: baselineAudit.elements.subtitle.score,
      draftScore: draftAudit.elements.subtitle.score,
    },
    {
      name: 'Keywords',
      baselineScore: baselineAudit.keywordCoverage.totalUniqueKeywords * 5, // Rough score approximation
      draftScore: draftAudit.keywordCoverage.totalUniqueKeywords * 5,
    },
  ];

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <CardTitle className="text-sm font-medium text-zinc-300">
            Element Performance
          </CardTitle>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Score comparison for each metadata element
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {elements.map((element, idx) => {
          const delta = element.draftScore - element.baselineScore;
          const trend = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{element.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">
                    {element.baselineScore} → {element.draftScore}
                  </span>
                  <CompactDeltaBadge value={delta} />
                  <span className="text-sm">{trend}</span>
                </div>
              </div>

              {/* Progress bars */}
              <div className="flex items-center gap-2">
                {/* Baseline */}
                <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-zinc-600 transition-all duration-500"
                    style={{ width: `${Math.min(element.baselineScore, 100)}%` }}
                  />
                </div>

                {/* Draft */}
                <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      delta > 0 ? 'bg-emerald-500' : delta < 0 ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(element.draftScore, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
