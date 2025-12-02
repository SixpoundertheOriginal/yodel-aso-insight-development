/**
 * Keywords Input Card
 *
 * Card for entering App Store Connect Keywords Field (100 chars max).
 * Styled similar to ElementDetailCard for consistency.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Key, Play, Loader2 } from 'lucide-react';

interface KeywordsInputCardProps {
  /** Current keywords value */
  value: string;
  /** Callback when keywords change */
  onChange: (value: string) => void;
  /** Optional: Is this card initially expanded? */
  initiallyExpanded?: boolean;
  /** Optional: Is the audit recomputing with new keywords? */
  isRecomputing?: boolean;
  /** Optional: Callback to run audit with current keywords */
  onRunAudit?: () => void;
  /** Optional: Has the user made changes but not run audit? */
  hasUnconfirmedChanges?: boolean;
  /** Optional: Duplicate keywords to highlight in red */
  duplicateKeywords?: string[];
}

export const KeywordsInputCard: React.FC<KeywordsInputCardProps> = ({
  value,
  onChange,
  initiallyExpanded = true,
  isRecomputing = false,
  onRunAudit,
  hasUnconfirmedChanges = false,
  duplicateKeywords = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Create set for fast duplicate lookup
  const duplicatesSet = new Set(duplicateKeywords.map(d => d.toLowerCase()));

  // Calculate keyword count
  const keywordCount = value
    ? value.split(',').map(k => k.trim()).filter(Boolean).length
    : 0;

  return (
    <Card className="relative bg-black/40 backdrop-blur-lg border border-zinc-800/50 hover:border-violet-500/30 transition-all duration-300">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-violet-400/40" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-violet-400/40" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-violet-400/40" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-violet-400/40" />

      <CardHeader
        className="pb-3 cursor-pointer hover:bg-zinc-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-400" />
            <CardTitle className="text-base font-medium text-zinc-300">
              Keywords Field
            </CardTitle>
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
              ASC Connect
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Character count badge */}
            <Badge
              variant="outline"
              className={`text-xs ${
                value.length > 90
                  ? 'border-orange-400/40 text-orange-400'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {value.length}/100
            </Badge>

            {/* Keyword count badge */}
            {keywordCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs border-violet-400/40 text-violet-400"
              >
                {keywordCount} keyword{keywordCount !== 1 ? 's' : ''}
              </Badge>
            )}

            {/* Recomputing indicator */}
            {isRecomputing && (
              <Badge
                variant="outline"
                className="text-xs border-orange-400/40 text-orange-400 animate-pulse"
              >
                Computing...
              </Badge>
            )}

            {/* Expand/collapse indicator */}
            <div className="text-zinc-500 text-sm">
              {isExpanded ? '▼' : '▶'}
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Help text */}
          <div className="flex items-start gap-2 p-3 bg-violet-500/10 border border-violet-400/20 rounded-lg">
            <span className="text-violet-400 text-sm">ℹ️</span>
            <div className="flex-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                <span className="font-medium text-violet-400">App Store Connect Keywords Field:</span> Enter comma-separated keywords (max 100 characters).
                These have equal ranking weight to subtitle and enable 4-element combo generation.
              </p>
            </div>
          </div>

          {/* Keywords textarea */}
          <div className="relative">
            <textarea
              id="keywords-field"
              value={value}
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue.length <= 100) {
                  onChange(newValue);
                }
              }}
              placeholder="meditation,sleep,mindfulness,relaxation,anxiety,stress"
              className="w-full h-24 px-4 py-3 text-sm bg-black/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none font-mono transition-all"
              maxLength={100}
            />
            <div className="absolute bottom-3 right-3 text-[10px] text-zinc-500 font-mono">
              {value.length}/100
            </div>
          </div>

          {/* Pro tip */}
          <div className="flex items-start gap-2 text-[10px] text-zinc-500 italic">
            <span>💡</span>
            <p className="leading-relaxed">
              <span className="font-medium text-zinc-400">Pro Tip:</span> Use high-volume, relevant keywords that don't fit in title or subtitle.
              Avoid duplicating words already in title/subtitle to maximize unique keyword coverage.
            </p>
          </div>

          {/* Keyword preview badges with duplicate highlighting */}
          {keywordCount > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                Current Keywords ({keywordCount})
                {duplicateKeywords.length > 0 && (
                  <span className="ml-2 text-red-400">• {duplicateKeywords.length} duplicate{duplicateKeywords.length > 1 ? 's' : ''}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {value.split(',').map((kw, idx) => {
                  const trimmed = kw.trim();
                  if (!trimmed) return null;

                  // Check if this keyword is a duplicate
                  const isDuplicate = duplicatesSet.has(trimmed.toLowerCase());

                  return (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-xs ${
                        isDuplicate
                          ? 'border-red-400/40 text-red-400 bg-red-500/10'
                          : 'border-violet-400/30 text-violet-400 bg-violet-500/5'
                      }`}
                    >
                      {trimmed}
                      {isDuplicate && ' ⚠️'}
                    </Badge>
                  );
                })}
              </div>

              {/* Duplicate warning message */}
              {duplicateKeywords.length > 0 && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                  <p className="text-[10px] text-red-400">
                    ⚠️ {duplicateKeywords.length} keyword{duplicateKeywords.length > 1 ? 's' : ''} already appear{duplicateKeywords.length === 1 ? 's' : ''} in title or subtitle
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Run Audit Button */}
          {onRunAudit && (
            <div className="pt-3 border-t border-zinc-800">
              <Button
                onClick={onRunAudit}
                disabled={isRecomputing || !value.trim()}
                className={`w-full ${
                  hasUnconfirmedChanges
                    ? 'bg-violet-600 hover:bg-violet-500'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                } text-white transition-all`}
              >
                {isRecomputing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {hasUnconfirmedChanges ? 'Run New Audit with Keywords' : 'Re-run Audit'}
                  </>
                )}
              </Button>
              {hasUnconfirmedChanges && !isRecomputing && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  ⚠️ Keywords changed - click to update audit
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
