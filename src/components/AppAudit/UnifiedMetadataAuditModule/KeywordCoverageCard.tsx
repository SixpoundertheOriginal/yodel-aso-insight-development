/**
 * Keyword Coverage Card
 *
 * Shows keyword distribution across title, subtitle, and description.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import type { UnifiedMetadataAuditResult } from './types';

interface KeywordCoverageCardProps {
  keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'];
  compact?: boolean; // Compact mode for Workbench integration
}

export const KeywordCoverageCard: React.FC<KeywordCoverageCardProps> = ({ keywordCoverage, compact = false }) => {
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  // Top tokens to show by default (fewer in compact mode)
  const titleTopTokens = keywordCoverage.titleKeywords.slice(0, compact ? 5 : 7);
  const subtitleTopTokens = keywordCoverage.subtitleNewKeywords.slice(0, compact ? 5 : 7);
  const descriptionTopTokens = keywordCoverage.descriptionNewKeywords.slice(0, compact ? 3 : 5);

  return (
    <Card className={`relative bg-black/60 backdrop-blur-lg border-zinc-700/70 border-2 border-dashed hover:border-orange-500/40 transition-all duration-300 ${compact ? '' : ''}`}>
      {/* L-bracket corners */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-400/60" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-400/60" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-400/60" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-400/60" />

      <CardHeader className={compact ? 'p-3' : ''}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 font-normal tracking-wide uppercase text-zinc-300 ${compact ? 'text-sm' : 'text-base'}`}>
            <Search className={compact ? 'h-4 w-4 text-blue-400' : 'h-5 w-5 text-blue-400'} />
            KEYWORD COVERAGE
          </CardTitle>
          <Badge
            variant="outline"
            className={`font-mono font-normal border-blue-400/30 text-blue-400 ${compact ? 'text-base px-2 py-0.5' : 'text-xl px-4 py-1'}`}
            style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
          >
            {keywordCoverage.totalUniqueKeywords}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'space-y-3 p-3 pt-0' : 'space-y-4'}>
        {/* Title Keywords */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-purple-400" />
            <span className="text-sm font-medium text-zinc-300">
              Title ({keywordCoverage.titleKeywords.length} keywords)
            </span>
            {keywordCoverage.titleIgnoredCount !== undefined && keywordCoverage.titleIgnoredCount > 0 && (
              <span className="text-xs text-zinc-500">
                • {keywordCoverage.titleIgnoredCount} ignored
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pl-4">
            {titleTopTokens.map((keyword, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-[11px] font-mono tracking-wide uppercase bg-purple-400/10 border border-purple-400/40 backdrop-blur-sm px-3 py-1.5"
                style={{
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                }}
              >
                {keyword}
              </Badge>
            ))}
            {keywordCoverage.titleKeywords.length > 7 && (
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                +{keywordCoverage.titleKeywords.length - 7} more
              </Badge>
            )}
          </div>
        </div>

        {/* Subtitle New Keywords */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">
              Subtitle adds {keywordCoverage.subtitleNewKeywords.length} new keywords
            </span>
            {keywordCoverage.subtitleIgnoredCount !== undefined && keywordCoverage.subtitleIgnoredCount > 0 && (
              <span className="text-xs text-zinc-500">
                • {keywordCoverage.subtitleIgnoredCount} ignored
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {subtitleTopTokens.map((keyword, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-[11px] font-mono tracking-wide uppercase bg-emerald-400/10 border border-emerald-400/40 backdrop-blur-sm px-3 py-1.5"
                style={{
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                }}
              >
                {keyword}
              </Badge>
            ))}
            {keywordCoverage.subtitleNewKeywords.length > 7 && (
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                +{keywordCoverage.subtitleNewKeywords.length - 7} more
              </Badge>
            )}
            {keywordCoverage.subtitleNewKeywords.length === 0 && (
              <span className="text-xs text-zinc-500 italic">
                No new keywords - subtitle duplicates title
              </span>
            )}
          </div>
        </div>

        {/* Description New Keywords (hidden in compact mode) */}
        {!compact && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-zinc-300">
              Description adds {keywordCoverage.descriptionNewKeywords.length} new keywords (conversion only)
            </span>
            {keywordCoverage.descriptionIgnoredCount !== undefined && keywordCoverage.descriptionIgnoredCount > 0 && (
              <span className="text-xs text-zinc-500">
                • {keywordCoverage.descriptionIgnoredCount} ignored
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {descriptionTopTokens.map((keyword, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs border-cyan-400/30 text-cyan-400"
              >
                {keyword}
              </Badge>
            ))}
            {keywordCoverage.descriptionNewKeywords.length > 5 && (
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                +{keywordCoverage.descriptionNewKeywords.length - 5} more
              </Badge>
            )}
          </div>
        </div>
        )}

        {/* Advanced View: All Keywords (hidden in compact mode) */}
        {!compact && (
        <div className="pt-3 border-t border-zinc-800">
          <button
            onClick={() => setShowAllKeywords(!showAllKeywords)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-3"
          >
            {showAllKeywords ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Show all extracted tokens (advanced)</span>
          </button>

          {showAllKeywords && (
            <div className="space-y-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              {/* All Title Keywords */}
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-2">All Title Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {keywordCoverage.titleKeywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-purple-400/30 text-purple-400"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* All Subtitle Keywords */}
              {keywordCoverage.subtitleNewKeywords.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-2">All Subtitle Keywords (incremental)</div>
                  <div className="flex flex-wrap gap-2">
                    {keywordCoverage.subtitleNewKeywords.map((keyword, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs border-emerald-400/30 text-emerald-400"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* All Description Keywords */}
              {keywordCoverage.descriptionNewKeywords.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase mb-2">All Description Keywords (incremental)</div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {keywordCoverage.descriptionNewKeywords.map((keyword, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs border-cyan-400/30 text-cyan-400"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Summary (shortened in compact mode) */}
        <div className={compact ? 'pt-2' : 'pt-3 space-y-2'}>
          <p className={compact ? 'text-xs text-zinc-400' : 'text-sm text-zinc-400'}>
            <span className="font-medium text-zinc-300">
              {keywordCoverage.totalUniqueKeywords}
            </span>{' '}
            {compact ? 'unique keywords' : 'unique keywords across all metadata elements'}.
            {!compact && keywordCoverage.subtitleNewKeywords.length > 0 && (
              <span className="text-emerald-400 ml-1">
                Good incremental value from subtitle!
              </span>
            )}
          </p>
          {!compact && (
          <p className="text-xs text-zinc-500 italic">
            Keywords are sorted by ASO relevance (high-value terms shown first)
          </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
