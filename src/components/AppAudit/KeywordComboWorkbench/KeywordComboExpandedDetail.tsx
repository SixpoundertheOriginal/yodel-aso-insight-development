/**
 * Keyword Combo Expanded Detail
 *
 * Shows detailed metadata when a combo row is expanded:
 * - Token breakdown
 * - Source explanation
 * - Relevance score
 * - Brand classification (if Phase 5)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { tokenizeCombo, getSourceExplanation, getTypeExplanation } from '@/utils/comboTokenizer';
import { classifyIntent, getIntentDescription, getIntentColor } from '@/utils/comboIntentClassifier';
import { getStopwords } from '@/modules/metadata-scoring/services/configLoader';

interface KeywordComboExpandedDetailProps {
  combo: ClassifiedCombo;
}

export const KeywordComboExpandedDetail: React.FC<KeywordComboExpandedDetailProps> = ({ combo }) => {
  const stopwords = getStopwords(); // Returns Set<string> directly
  const tokenized = tokenizeCombo(combo.text, stopwords);
  const intent = classifyIntent(combo);

  return (
    <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 space-y-3">
      {/* Token Breakdown */}
      <div>
        <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
          Token Breakdown
        </div>
        <div className="flex flex-wrap gap-2">
          {tokenized.tokens.map((token, idx) => {
            const isMeaningful = tokenized.meaningfulTokens.includes(token);
            const isStopword = tokenized.stopwords.includes(token);

            return (
              <Badge
                key={idx}
                variant="outline"
                className={
                  isMeaningful
                    ? 'text-xs border-emerald-400/40 text-emerald-400 bg-emerald-900/20'
                    : isStopword
                    ? 'text-xs border-zinc-700 text-zinc-500 bg-zinc-900/20'
                    : 'text-xs border-zinc-600 text-zinc-400'
                }
              >
                {token}
                {isMeaningful && ' ✓'}
                {isStopword && ' ⊘'}
              </Badge>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          ✓ = Meaningful keyword • ⊘ = Stopword (filtered in analysis)
        </p>
      </div>

      {/* Source Explanation */}
      <div>
        <div className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">
          Source: {combo.source || 'unknown'}
        </div>
        <p className="text-xs text-zinc-500">{getSourceExplanation(combo)}</p>
      </div>

      {/* Type Explanation */}
      <div>
        <div className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">
          Type: {combo.type}
        </div>
        <p className="text-xs text-zinc-500">{getTypeExplanation(combo)}</p>
      </div>

      {/* Relevance Score */}
      <div>
        <div className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">
          Relevance Score: {combo.relevanceScore}/3
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={`h-2 w-12 rounded ${
                combo.relevanceScore >= level ? 'bg-emerald-400' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          0 = Low-value • 1 = Neutral • 2 = Domain keywords • 3 = High-intent
        </p>
      </div>

      {/* Intent Classification */}
      <div>
        <div className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">
          Search Intent: {intent}
        </div>
        <Badge variant="outline" className={`text-xs ${getIntentColor(intent)}`}>
          {intent}
        </Badge>
        <p className="text-xs text-zinc-500 mt-1">{getIntentDescription(intent)}</p>
      </div>

      {/* Phase 5: Brand Classification */}
      {'brandClassification' in combo && combo.brandClassification && (
        <div className="pt-2 border-t border-zinc-800">
          <div className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">
            Brand Intelligence (Phase 5)
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-300">
              Classification: <span className="text-purple-400 font-medium">{combo.brandClassification}</span>
            </p>
            {combo.matchedBrandAlias && (
              <p className="text-xs text-zinc-300">
                Matched Alias: <span className="text-yellow-400 font-medium">{combo.matchedBrandAlias}</span>
              </p>
            )}
            {combo.matchedCompetitor && (
              <p className="text-xs text-zinc-300">
                Matched Competitor: <span className="text-orange-400 font-medium">{combo.matchedCompetitor}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
