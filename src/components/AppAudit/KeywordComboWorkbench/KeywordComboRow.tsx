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
import { Copy, Eye, EyeOff, ChevronDown, ChevronRight, Edit2, Star } from 'lucide-react';
import type { ClassifiedCombo } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import { KeywordComboEditor } from './KeywordComboEditor';
import { KeywordComboExpandedDetail } from './KeywordComboExpandedDetail';
import { copyComboToClipboard } from '@/utils/comboExporter';
import { classifyIntent, getIntentColor } from '@/utils/comboIntentClassifier';
import { useKeywordComboStore } from '@/stores/useKeywordComboStore';
import { AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';

interface KeywordComboRowProps {
  combo: ClassifiedCombo;
  index: number;
  isSelected: boolean;
}

export const KeywordComboRow: React.FC<KeywordComboRowProps> = ({ combo, index, isSelected }) => {
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
      <TableRow className={`${isNoise ? 'opacity-50' : ''} hover:bg-zinc-800/50 transition-colors`}>
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
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <Edit2 className="h-3 w-3 text-zinc-400" />
              </Button>
            </div>
          )}
        </TableCell>

        {/* Type Badge */}
        <TableCell>
          <Badge variant="outline" className={`text-[11px] ${getComboTypeBadgeColor(combo.type)}`}>
            {combo.type}
          </Badge>
        </TableCell>

        {/* Source Badge */}
        <TableCell>
          <Badge variant="outline" className={`text-[11px] ${getSourceBadgeColor(combo.source)}`}>
            {combo.source || 'unknown'}
          </Badge>
        </TableCell>

        {/* Intent Badge */}
        <TableCell>
          <Badge variant="outline" className={`text-[11px] ${getIntentColor(intent)}`}>
            {intent}
          </Badge>
        </TableCell>

        {/* Relevance Score */}
        <TableCell className="text-center text-sm text-zinc-400">
          {combo.relevanceScore}
        </TableCell>

        {/* Length */}
        <TableCell className="text-center text-sm text-zinc-400">
          {combo.text.length}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyComboToClipboard(combo)}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-300"
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleNoise}
              className={`h-7 w-7 p-0 ${isNoise ? 'text-emerald-400' : 'text-zinc-400'} hover:text-zinc-300`}
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
          <TableCell colSpan={9} className="p-0">
            <KeywordComboExpandedDetail combo={combo} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
