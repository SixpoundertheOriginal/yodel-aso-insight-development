/**
 * Keyword Combo Row
 *
 * Single table row displaying a combo with actions:
 * - Inline editing
 * - Copy
 * - Mark as noise
 * - Expand for details
 */

import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Eye, EyeOff, Edit2, Star, CheckCircle, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { KeywordComboEditor } from './KeywordComboEditor';
import { RankingCell } from './RankingCell';
import { CompetitionCell } from './CompetitionCell';
import type { ComboRankingData } from '@/hooks/useBatchComboRankings';
import type { KeywordPopularityData } from '@/hooks/useKeywordPopularity';
import { getPopularityEmoji, getPopularityColor } from '@/hooks/useKeywordPopularity';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { copyComboToClipboard } from '@/utils/comboExporter';
import { classifyIntent, getIntentColor } from '@/utils/comboIntentClassifier';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import { supabase } from '@/integrations/supabase/client';
import { ComboStrength } from '@/engine/combos/comboGenerationEngine';

interface ColumnVisibility {
  status: boolean;
  type: boolean;
  priority: boolean;
  semantic: boolean;
  novelty: boolean;
  noise: boolean;
  source: boolean;
  length: boolean;
  competition: boolean;
}

interface KeywordComboRowProps {
  combo: ClassifiedCombo;
  index: number;
  isSelected: boolean;
  visibleColumns: ColumnVisibility;
  density?: 'compact' | 'comfortable' | 'spacious';
  metadata?: {
    appId?: string;
    country?: string;
  };
  rankingData?: ComboRankingData;
  rankingsLoading?: boolean;
  popularityData?: KeywordPopularityData;
  popularityLoading?: boolean;
}

export const KeywordComboRow: React.FC<KeywordComboRowProps> = ({ combo, index, isSelected, visibleColumns, density = 'comfortable', metadata, rankingData, rankingsLoading, popularityData, popularityLoading }) => {
  const editingComboIndex = useKeywordComboStore((state) => state.editingComboIndex);
  const setEditingCombo = useKeywordComboStore((state) => state.setEditingCombo);
  const updateCombo = useKeywordComboStore((state) => state.updateCombo);
  const markAsNoise = useKeywordComboStore((state) => state.markAsNoise);
  const unmarkAsNoise = useKeywordComboStore((state) => state.unmarkAsNoise);
  const toggleSelection = useKeywordComboStore((state) => state.toggleSelection);
  const removeCustomKeyword = useKeywordComboStore((state) => state.removeCustomKeyword);

  const isEditing = editingComboIndex === index;
  const isNoise = (combo as any).userMarkedAsNoise || false;
  const intent = classifyIntent(combo);

  // Density-based row height
  const getRowHeight = () => {
    switch (density) {
      case 'compact': return 'h-8';
      case 'comfortable': return 'h-12';
      case 'spacious': return 'h-16';
      default: return 'h-12';
    }
  };

  const getComboTypeBadgeColor = (type: 'branded' | 'generic' | 'low_value'): string => {
    switch (type) {
      case 'branded':
        return 'border-purple-400/30 text-purple-400 bg-purple-900/10';
      case 'generic':
        return 'border-emerald-400/30 text-emerald-400 bg-emerald-900/10';
      case 'low_value':
        return 'border-zinc-700 text-zinc-500 bg-zinc-900/10';
    }
  };

  const getSourceBadgeColor = (source?: string): string => {
    switch (source) {
      case 'title':
        return 'border-blue-400/30 text-blue-400 bg-blue-900/10';
      case 'subtitle':
        return 'border-cyan-400/30 text-cyan-400 bg-cyan-900/10';
      case 'title+subtitle':
        return 'border-violet-400/30 text-violet-400 bg-violet-900/10';
      case 'custom':
        return 'border-orange-400/30 text-orange-400 bg-orange-900/10';
      default:
        return 'border-zinc-700 text-zinc-500';
    }
  };

  // Phase 1: Strength badge helpers
  const getStrengthBadge = (strength?: ComboStrength): { emoji: string; text: string; color: string; tooltip: string } | null => {
    if (!strength) return null;

    switch (strength) {
      case ComboStrength.TITLE_CONSECUTIVE:
        return {
          emoji: '🔥🔥🔥',
          text: 'Strongest',
          color: 'border-red-500/40 text-red-400 bg-red-900/20',
          tooltip: 'Title Consecutive - Highest ranking power'
        };
      case ComboStrength.TITLE_NON_CONSECUTIVE:
        return {
          emoji: '🔥🔥',
          text: 'Very Strong',
          color: 'border-orange-500/40 text-orange-400 bg-orange-900/20',
          tooltip: 'Title Non-Consecutive - Very strong ranking power'
        };
      case ComboStrength.CROSS_ELEMENT:
        return {
          emoji: '⚡',
          text: 'Medium',
          color: 'border-yellow-500/40 text-yellow-400 bg-yellow-900/20',
          tooltip: 'Cross-Element - Medium ranking power (title + subtitle)'
        };
      case ComboStrength.SUBTITLE_CONSECUTIVE:
        return {
          emoji: '💤',
          text: 'Weak',
          color: 'border-blue-500/40 text-blue-400 bg-blue-900/20',
          tooltip: 'Subtitle Consecutive - Weak ranking power'
        };
      case ComboStrength.SUBTITLE_NON_CONSECUTIVE:
        return {
          emoji: '💤💤',
          text: 'Very Weak',
          color: 'border-indigo-500/40 text-indigo-400 bg-indigo-900/20',
          tooltip: 'Subtitle Non-Consecutive - Very weak ranking power'
        };
      case ComboStrength.MISSING:
        return {
          emoji: '❌',
          text: 'Missing',
          color: 'border-zinc-700 text-zinc-500 bg-zinc-900/20',
          tooltip: 'Not in metadata - cannot rank'
        };
      default:
        return null;
    }
  };

  const handleSave = (newValue: string) => {
    updateCombo(index, { userEditedText: newValue, text: newValue });
    setEditingCombo(null);
  };

  const handleToggleNoise = () => {
    if (isNoise) {
      unmarkAsNoise(index);
    } else {
      markAsNoise(index);
    }
  };

  const handleDeleteCustomKeyword = async () => {
    if (!metadata?.appId) return;

    if (!confirm(`Delete "${combo.text}"?`)) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('custom_keywords')
        .delete()
        .eq('app_id', metadata.appId)
        .eq('platform', 'ios')
        .eq('keyword', combo.text);

      if (error) {
        console.error('[KeywordComboRow] Failed to delete from database:', error);
        return;
      }

      // Remove from store
      removeCustomKeyword(combo.text);
      console.log(`[KeywordComboRow] ✅ Deleted custom keyword: ${combo.text}`);
    } catch (error) {
      console.error('[KeywordComboRow] Error deleting custom keyword:', error);
    }
  };

  return (
    <>
      <TableRow className={`
        relative border-l-[3px] transition-all duration-300 border-b border-zinc-900/30
        ${isNoise 
          ? 'opacity-50 border-l-red-500/60 bg-red-900/20 hover:bg-red-900/30' 
          : isSelected 
            ? 'border-l-orange-500 bg-gradient-to-r from-orange-500/20 to-transparent shadow-[inset_6px_0_20px_rgba(249,115,22,0.25),0_0_15px_rgba(249,115,22,0.1)]'
            : 'border-l-zinc-800/40 hover:border-l-orange-500/80 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent hover:shadow-[inset_4px_0_12px_rgba(249,115,22,0.15),0_2px_8px_rgba(249,115,22,0.08)]'
        }
        ${getRowHeight()}
        group
        cursor-pointer
        before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-transparent before:via-orange-500/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
      `}>
        {/* Row Number */}
        <TableCell className="w-8 text-xs text-zinc-500 font-mono">
          {index + 1}
        </TableCell>

        {/* Selection Checkbox */}
        <TableCell className="w-8">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(index)}
            className="rounded data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
          />
        </TableCell>

        {/* Combo Text (Editable) */}
        <TableCell className="font-mono text-sm">
          {isEditing ? (
            <KeywordComboEditor
              initialValue={combo.text}
              onSave={handleSave}
              onCancel={() => setEditingCombo(null)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className={isNoise ? 'line-through' : ''}>{combo.text}</span>

              {/* Phase 1: Strength Badge */}
              {(() => {
                const strengthBadge = getStrengthBadge((combo as any).strength);
                if (strengthBadge && (combo as any).strength !== ComboStrength.MISSING) {
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${strengthBadge.color}`}>
                            <span className="mr-0.5">{strengthBadge.emoji}</span>
                            {strengthBadge.text}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-xs">
                          <p>{strengthBadge.tooltip}</p>
                          {(combo as any).canStrengthen && (combo as any).strengtheningSuggestion && (
                            <p className="text-emerald-400 mt-1">💡 {(combo as any).strengtheningSuggestion}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                return null;
              })()}

              {AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED &&
                'brandClassification' in combo &&
                combo.brandClassification === 'brand' && (
                  <span title={`Brand: ${combo.matchedBrandAlias || 'detected'}`}>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  </span>
                )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingCombo(index)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-zinc-700/50"
              >
                <Edit2 className="h-3 w-3 text-zinc-400 hover:text-zinc-300" />
              </Button>
            </div>
          )}
        </TableCell>

        {/* Status - V2.1 */}
        {visibleColumns.status && (
          <TableCell>
            {(combo as any).exists !== undefined ? (
              (combo as any).exists ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-400/30">
                  <CheckCircle className="h-3 w-3 mr-1" /> Existing
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-400/30">
                  <AlertCircle className="h-3 w-3 mr-1" /> Missing
                </Badge>
              )
            ) : (
              <span className="text-xs text-zinc-500">-</span>
            )}
          </TableCell>
        )}

        {/* Type Badge */}
        {visibleColumns.type && (
          <TableCell>
            <Badge variant="outline" className={`text-[11px] transition-all duration-200 ${getComboTypeBadgeColor(combo.type)}`}>
              {combo.type}
            </Badge>
          </TableCell>
        )}

        {/* Priority Score - V2.1 */}
        {visibleColumns.priority && (
          <TableCell className="text-center">
            {(combo as any).priorityScore !== undefined ? (
              <div className="relative flex items-center justify-center gap-1">
                {/* Progress bar background */}
                <div className="absolute inset-0 flex items-center px-2">
                  <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        (combo as any).priorityScore >= 70 ? 'bg-emerald-500/30' :
                        (combo as any).priorityScore >= 50 ? 'bg-blue-500/30' :
                        'bg-zinc-600/30'
                      }`}
                      style={{ width: `${(combo as any).priorityScore}%` }}
                    />
                  </div>
                </div>
                {/* Score value */}
                <div className="relative flex items-center gap-1">
                  <span className={`font-mono text-sm font-semibold ${
                    (combo as any).priorityScore >= 70 ? 'text-emerald-400' :
                    (combo as any).priorityScore >= 50 ? 'text-blue-400' :
                    'text-zinc-500'
                  }`}>
                    {(combo as any).priorityScore}
                  </span>
                  {(combo as any).priorityScore >= 70 && <Sparkles className="h-3 w-3 text-emerald-400" />}
                </div>
              </div>
            ) : (
              <span className="text-xs text-zinc-500">-</span>
            )}
          </TableCell>
        )}

        {/* Semantic Relevance - V2.1 */}
        {visibleColumns.semantic && (
          <TableCell className="text-center">
            {(combo as any).priorityFactors?.semanticRelevance !== undefined ? (
              <span className={`font-mono text-sm ${
                (combo as any).priorityFactors.semanticRelevance >= 70 ? 'text-emerald-400' :
                (combo as any).priorityFactors.semanticRelevance >= 50 ? 'text-blue-400' :
                'text-zinc-500'
              }`}>
                {Math.round((combo as any).priorityFactors.semanticRelevance)}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">-</span>
            )}
          </TableCell>
        )}

        {/* Novelty Score - V2.1 */}
        {visibleColumns.novelty && (
          <TableCell className="text-center">
            {(combo as any).priorityFactors?.noveltyScore !== undefined ? (
              <span className={`font-mono text-sm ${
                (combo as any).priorityFactors.noveltyScore >= 70 ? 'text-emerald-400' :
                (combo as any).priorityFactors.noveltyScore >= 50 ? 'text-blue-400' :
                'text-zinc-500'
              }`}>
                {Math.round((combo as any).priorityFactors.noveltyScore)}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">-</span>
            )}
          </TableCell>
        )}

        {/* Noise Confidence - V2.1 */}
        {visibleColumns.noise && (
          <TableCell className="text-center">
            {(combo as any).noiseConfidence !== undefined ? (
              <div className="flex items-center justify-center gap-1">
                <span className={`font-mono text-sm ${
                  (combo as any).noiseConfidence > 50 ? 'text-orange-400' : 'text-zinc-500'
                }`}>
                  {Math.round((combo as any).noiseConfidence)}%
                </span>
                {(combo as any).noiseConfidence > 50 && <AlertCircle className="h-3 w-3 text-orange-400" />}
              </div>
            ) : (
              <span className="text-xs text-zinc-500">-</span>
            )}
          </TableCell>
        )}

        {/* Source Badge */}
        {visibleColumns.source && (
          <TableCell>
            <Badge variant="outline" className={`text-[11px] ${getSourceBadgeColor(combo.source)}`}>
              {combo.source || 'unknown'}
            </Badge>
          </TableCell>
        )}

        {/* Length */}
        {visibleColumns.length && (
          <TableCell className="text-center text-sm text-zinc-400">
            {combo.text.length}
          </TableCell>
        )}

        {/* Competition */}
        {visibleColumns.competition && (
          <TableCell>
            <CompetitionCell
              totalResults={rankingData?.totalResults ?? null}
              snapshotDate={rankingData?.snapshotDate}
            />
          </TableCell>
        )}

        {/* Popularity */}
        <TableCell className="text-center">
          {popularityLoading ? (
            <span className="text-xs text-zinc-500">...</span>
          ) : popularityData ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center justify-center gap-1.5 cursor-help ${getPopularityColor(popularityData.popularity_score)}`}>
                    <span className="font-mono font-semibold">{popularityData.popularity_score}</span>
                    <span className="text-base">{getPopularityEmoji(popularityData.popularity_score)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 p-3">
                  <div className="text-xs space-y-1.5">
                    <div className="font-semibold text-white mb-2">Popularity Breakdown</div>
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-400">Autocomplete:</span>
                      <span className="text-white font-mono">{Math.round(popularityData.autocomplete_score * 100)}/100</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-400">Intent:</span>
                      <span className="text-white font-mono">{Math.round(popularityData.intent_score * 100)}/100</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-400">Length:</span>
                      <span className="text-white font-mono">{Math.round(popularityData.length_prior * 100)}/100</span>
                    </div>
                    <div className="border-t border-zinc-700 mt-2 pt-2 text-zinc-500">
                      Updated: {formatDistanceToNow(new Date(popularityData.last_updated), { addSuffix: true })}
                    </div>
                    {popularityData.data_quality !== 'complete' && (
                      <div className="text-yellow-400 text-xs">
                        ⚠️ {popularityData.data_quality}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-zinc-600">-</span>
          )}
        </TableCell>

        {/* App Ranking */}
        <TableCell>
          {metadata?.appId && metadata?.country ? (
            <RankingCell
              combo={combo.text}
              appId={metadata.appId}
              country={metadata.country}
              cachedRanking={rankingData}
              isLoading={rankingsLoading}
            />
          ) : (
            <span className="text-xs text-zinc-600">N/A</span>
          )}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyComboToClipboard(combo)}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleNoise}
              className={`h-7 w-7 p-0 ${isNoise ? 'text-emerald-400' : 'text-zinc-400'} hover:text-zinc-300 hover:bg-zinc-700/50 transition-all`}
              title={isNoise ? 'Unmark as noise' : 'Mark as noise'}
            >
              {isNoise ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            {combo.source === 'custom' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteCustomKeyword}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete custom keyword"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    </>
  );
};
