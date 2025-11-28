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
import { Copy, Eye, EyeOff, ChevronDown, ChevronRight, Edit2, Star, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { KeywordComboEditor } from './KeywordComboEditor';
import { KeywordComboExpandedDetail } from './KeywordComboExpandedDetail';
import { copyComboToClipboard } from '@/utils/comboExporter';
import { classifyIntent, getIntentColor } from '@/utils/comboIntentClassifier';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';

interface ColumnVisibility {
  status: boolean;
  type: boolean;
  priority: boolean;
  semantic: boolean;
  novelty: boolean;
  noise: boolean;
  source: boolean;
  length: boolean;
}

interface KeywordComboRowProps {
  combo: ClassifiedCombo;
  index: number;
  isSelected: boolean;
  visibleColumns: ColumnVisibility;
  density?: 'compact' | 'comfortable' | 'spacious';
}

export const KeywordComboRow: React.FC<KeywordComboRowProps> = ({ combo, index, isSelected, visibleColumns, density = 'comfortable' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const editingComboIndex = useKeywordComboStore((state) => state.editingComboIndex);
  const setEditingCombo = useKeywordComboStore((state) => state.setEditingCombo);
  const updateCombo = useKeywordComboStore((state) => state.updateCombo);
  const markAsNoise = useKeywordComboStore((state) => state.markAsNoise);
  const unmarkAsNoise = useKeywordComboStore((state) => state.unmarkAsNoise);
  const toggleSelection = useKeywordComboStore((state) => state.toggleSelection);

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
      default:
        return 'border-zinc-700 text-zinc-500';
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

  return (
    <>
      <TableRow className={`
        ${isNoise ? 'opacity-50' : ''}
        ${getRowHeight()}
        ${isSelected ? 'bg-violet-500/10 hover:bg-violet-500/15 border-l-2 border-violet-500' : 'hover:bg-zinc-800/50'}
        transition-all duration-200 ease-in-out
        group
      `}>
        {/* Expand Toggle */}
        <TableCell className="w-8">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-zinc-400" />
            )}
          </Button>
        </TableCell>

        {/* Selection Checkbox */}
        <TableCell className="w-8">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(index)}
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
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={12} className="p-0">
            <KeywordComboExpandedDetail combo={combo} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
