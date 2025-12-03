/**
 * MetadataOptimizationPanel Component
 *
 * Unified editing panel for Title/Subtitle/Keywords with real-time validation.
 * Allows users to test proposed metadata changes before applying.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useMetadataValidation } from '@/hooks/useMetadataValidation';
import type { DraftMetadata } from '@/types/metadataOptimization';

interface MetadataOptimizationPanelProps {
  /** Current draft metadata being edited */
  draft: DraftMetadata;
  /** Update draft metadata */
  onDraftChange: (draft: DraftMetadata) => void;
  /** Baseline metadata (for comparison) */
  baseline: DraftMetadata;
  /** Trigger draft audit */
  onRunDraftAudit: () => void;
  /** Reset draft to baseline */
  onReset: () => void;
  /** Is draft audit running? */
  isLoading?: boolean;
  /** Platform (affects character limits) */
  platform?: 'ios' | 'android';
  /** Has user made changes? */
  hasChanges?: boolean;
}

export const MetadataOptimizationPanel: React.FC<MetadataOptimizationPanelProps> = ({
  draft,
  onDraftChange,
  baseline,
  onRunDraftAudit,
  onReset,
  isLoading = false,
  platform = 'ios',
  hasChanges = false,
}) => {
  // Real-time validation
  const validation = useMetadataValidation(
    {
      title: draft.title,
      subtitle: draft.subtitle,
      keywords: draft.keywords,
    },
    platform
  );

  // Count errors and warnings
  const errorCount = validation.warnings.filter(w => w.severity === 'error').length;
  const warningCount = validation.warnings.filter(w => w.severity === 'warning').length;

  return (
    <Card className="relative bg-black/40 backdrop-blur-lg border border-violet-500/30 hover:border-violet-500/50 transition-all duration-300">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-violet-400/40" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-violet-400/40" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-violet-400/40" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-violet-400/40" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <CardTitle className="text-base font-medium text-zinc-300">
              Metadata Optimization Lab
            </CardTitle>
            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
              Draft Mode
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Validation status */}
            {errorCount > 0 && (
              <Badge variant="outline" className="text-xs border-red-400/40 text-red-400">
                {errorCount} error{errorCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && errorCount === 0 && (
              <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-400">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
            {validation.isValid && hasChanges && (
              <Badge variant="outline" className="text-xs border-emerald-400/40 text-emerald-400">
                Ready to test
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Help text */}
        <div className="flex items-start gap-2 p-3 bg-violet-500/10 border border-violet-400/20 rounded-lg">
          <span className="text-violet-400 text-sm">💡</span>
          <div className="flex-1">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Test proposed metadata changes before applying. Edit fields below and click <span className="font-medium text-violet-400">"Run Draft Audit"</span> to see the impact.
            </p>
          </div>
        </div>

        {/* Title Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="draft-title" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Title
            </label>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                draft.title.length > validation.characterUsage.title.max
                  ? 'border-red-400/40 text-red-400'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {validation.characterUsage.title.used}/{validation.characterUsage.title.max}
            </Badge>
          </div>
          <input
            id="draft-title"
            type="text"
            value={draft.title}
            onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
            placeholder="Enter title (30 chars max)..."
            maxLength={validation.characterUsage.title.max}
            className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
          />
          {/* Show duplicate warnings for title */}
          {validation.duplicates.title.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
              <AlertCircle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-400">
                Duplicates: {validation.duplicates.title.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Subtitle Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="draft-subtitle" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Subtitle
            </label>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                draft.subtitle.length > validation.characterUsage.subtitle.max
                  ? 'border-red-400/40 text-red-400'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {validation.characterUsage.subtitle.used}/{validation.characterUsage.subtitle.max}
            </Badge>
          </div>
          <input
            id="draft-subtitle"
            type="text"
            value={draft.subtitle}
            onChange={(e) => onDraftChange({ ...draft, subtitle: e.target.value })}
            placeholder="Enter subtitle (30 chars max)..."
            maxLength={validation.characterUsage.subtitle.max}
            className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
          />
          {/* Show duplicate warnings for subtitle */}
          {validation.duplicates.subtitle.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
              <AlertCircle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-400">
                Duplicates: {validation.duplicates.subtitle.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Keywords Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="draft-keywords" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Keywords
            </label>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                draft.keywords.length > validation.characterUsage.keywords.max
                  ? 'border-red-400/40 text-red-400'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {validation.characterUsage.keywords.used}/{validation.characterUsage.keywords.max}
            </Badge>
          </div>
          <textarea
            id="draft-keywords"
            value={draft.keywords}
            onChange={(e) => onDraftChange({ ...draft, keywords: e.target.value })}
            placeholder="meditation,sleep,relaxation,mindfulness..."
            maxLength={validation.characterUsage.keywords.max}
            rows={2}
            className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 resize-none font-mono"
          />
          {/* Show duplicate warnings for keywords */}
          {validation.duplicates.keywords.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
              <AlertCircle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-400">
                Duplicates: {validation.duplicates.keywords.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Validation warnings */}
        {validation.warnings.length > 0 && (
          <div className="space-y-1.5">
            {validation.warnings.slice(0, 3).map((warning, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2 rounded border text-[10px] ${
                  warning.severity === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : warning.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}
              >
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{warning.message}</p>
                  {warning.suggestion && (
                    <p className="text-zinc-500">{warning.suggestion}</p>
                  )}
                </div>
              </div>
            ))}
            {validation.warnings.length > 3 && (
              <p className="text-[10px] text-zinc-500 text-center">
                +{validation.warnings.length - 3} more warning{validation.warnings.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          <Button
            onClick={onRunDraftAudit}
            disabled={isLoading || !validation.isValid || !hasChanges}
            className={`flex-1 ${
              hasChanges && validation.isValid
                ? 'bg-violet-600 hover:bg-violet-500'
                : 'bg-zinc-800 hover:bg-zinc-700'
            } text-white transition-all`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Draft Audit...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Draft Audit & Compare
              </>
            )}
          </Button>

          <Button
            onClick={onReset}
            disabled={isLoading || !hasChanges}
            variant="outline"
            className="border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {hasChanges && validation.isValid && !isLoading && (
          <p className="text-xs text-violet-400 text-center">
            ✨ Changes detected - click to see the impact
          </p>
        )}
      </CardContent>
    </Card>
  );
};
