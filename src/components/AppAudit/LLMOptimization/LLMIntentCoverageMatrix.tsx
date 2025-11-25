/**
 * LLM Intent Coverage Matrix
 *
 * Visualizes user search intent coverage from the description.
 * Shows which user queries/intents are addressed vs. missing.
 * Cross-validates with intent engine when available.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle2, XCircle, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import { cn, tacticalEffects, auditTypography, getScoreTierColors } from '@/design-registry';
import type { IntentCoverage, IntentItem } from '@/engine/llmVisibility/llmVisibility.types';

interface LLMIntentCoverageMatrixProps {
  intentCoverage: IntentCoverage;
}

export const LLMIntentCoverageMatrix: React.FC<LLMIntentCoverageMatrixProps> = ({ intentCoverage }) => {
  const [expandedIntents, setExpandedIntents] = useState<Set<string>>(new Set());

  // Extract intents array from intentCoverage object
  const intents = intentCoverage.intents || [];

  // Sort by coverage score (descending)
  const sortedIntents = [...intents].sort((a, b) => b.coverage_score - a.coverage_score);

  // Calculate stats
  const avgCoverage = intents.length > 0
    ? intents.reduce((sum, i) => sum + i.coverage_score, 0) / intents.length
    : 0;
  const wellCoveredCount = intents.filter((i) => i.coverage_score >= 70).length;
  const comparisonData = intentCoverage.comparison_with_intent_engine;

  // Count how many intents are cross-validated by intent engine
  const crossValidatedCount = comparisonData?.detected_by_rules?.length || 0;

  const toggleIntent = (intentId: string) => {
    const newExpanded = new Set(expandedIntents);
    if (newExpanded.has(intentId)) {
      newExpanded.delete(intentId);
    } else {
      newExpanded.add(intentId);
    }
    setExpandedIntents(newExpanded);
  };

  // Check if intent is validated by intent engine
  const isIntentValidated = (intentType: string): boolean => {
    if (!comparisonData) return false;
    return comparisonData.detected_by_rules?.includes(intentType) || false;
  };

  if (intents.length === 0) {
    return (
      <Card className={cn(
        "border-zinc-800 bg-zinc-950/50",
        tacticalEffects.glassPanel.light
      )}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <MessageSquare className="h-12 w-12 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                No Intent Coverage Data
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                No user search intents analyzed. Enable intent analysis to see coverage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden",
      tacticalEffects.glassPanel.medium,
      tacticalEffects.gridOverlay.className
    )}>
      {/* Corner brackets */}
      <div className={cn(
        tacticalEffects.cornerBracket.topLeft,
        tacticalEffects.cornerBracket.colors.blue,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomRight,
        tacticalEffects.cornerBracket.colors.blue,
        tacticalEffects.cornerBracket.animated
      )} />

      <CardHeader>
        <CardTitle className={cn(
          "flex items-center gap-2 relative z-10",
          auditTypography.section.main
        )}>
          <MessageSquare className="h-5 w-5 text-blue-400" style={{ filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))' }} />
          <span>Search Intent Coverage</span>
        </CardTitle>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 relative z-10">
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Avg Coverage</div>
            <div className={cn(
              "text-2xl font-bold",
              getScoreTierColors(avgCoverage).text
            )}>
              {Math.round(avgCoverage)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Well Covered</div>
            <div className="text-2xl font-bold text-green-300">{wellCoveredCount}</div>
          </div>
          {crossValidatedCount > 0 && (
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <GitCompare className="h-3 w-3" />
                Validated
              </div>
              <div className="text-2xl font-bold text-cyan-300">{crossValidatedCount}</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 relative z-10">
        {sortedIntents.map((intent) => (
          <IntentItemComponent
            key={intent.intent_type}
            intent={intent}
            isExpanded={expandedIntents.has(intent.intent_type)}
            onToggle={() => toggleIntent(intent.intent_type)}
            isValidated={isIntentValidated(intent.intent_type)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Intent Item Component
// ============================================================================

interface IntentItemComponentProps {
  intent: IntentItem;
  isExpanded: boolean;
  onToggle: () => void;
  isValidated: boolean;
}

// Intent type labels for display
const INTENT_LABELS: Record<string, string> = {
  task: 'Task Intent',
  comparison: 'Comparison Intent',
  problem: 'Problem-Solving Intent',
  feature: 'Feature Intent',
  safety: 'Safety & Trust Intent',
};

const IntentItemComponent: React.FC<IntentItemComponentProps> = ({
  intent,
  isExpanded,
  onToggle,
  isValidated
}) => {
  const tierColors = getScoreTierColors(intent.coverage_score);
  const hasPatterns = intent.patterns_matched.length > 0;
  const confidence = intent.coverage_score; // Use coverage_score as confidence

  return (
    <div className={cn(
      "rounded-lg border border-zinc-800/50 overflow-hidden",
      "bg-zinc-950/30",
      "hover:border-zinc-700/70 transition-all duration-200"
    )}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full p-4 flex items-center gap-3",
          "hover:bg-zinc-900/40 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        )}
        disabled={!hasPatterns}
      >
        {/* Left: Label and badges */}
        <div className="flex-1 text-left space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">
              {INTENT_LABELS[intent.intent_type] || intent.intent_type}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                confidence >= 70 ? "border-green-700/50 bg-green-950/30 text-green-300" :
                confidence >= 40 ? "border-cyan-700/50 bg-cyan-950/30 text-cyan-300" :
                "border-orange-700/50 bg-orange-950/30 text-orange-300"
              )}
            >
              {Math.round(confidence)}% coverage
            </Badge>
            {isValidated && (
              <Badge
                variant="outline"
                className="text-xs border-cyan-700/50 bg-cyan-950/30 text-cyan-300"
              >
                <GitCompare className="h-3 w-3 mr-1" />
                Validated
              </Badge>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                tierColors.bg
              )}
              style={{
                width: `${intent.coverage_score}%`,
                boxShadow: `0 0 8px ${tierColors.ring}60`,
              }}
            />
          </div>
        </div>

        {/* Right: Score and expand icon */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">Coverage</div>
            <div className={cn("text-2xl font-bold", tierColors.text)}>
              {Math.round(intent.coverage_score)}%
            </div>
          </div>
          {hasPatterns && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            )
          )}
        </div>
      </button>

      {/* Expanded: Patterns & Examples */}
      {isExpanded && hasPatterns && (
        <div className="border-t border-zinc-800/50 p-4 space-y-3 bg-zinc-950/50">
          {/* Matched Patterns */}
          {intent.patterns_matched.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-green-300 uppercase tracking-wider">
                  Matched Patterns ({intent.patterns_matched.length})
                </span>
              </div>
              <div className="space-y-1">
                {intent.patterns_matched.map((pattern, i) => (
                  <div
                    key={i}
                    className="text-xs text-zinc-300 font-mono bg-zinc-900/50 px-2 py-1 rounded"
                  >
                    {pattern}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {intent.examples.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-300 uppercase tracking-wider">
                  Examples from Description ({intent.examples.length})
                </span>
              </div>
              <div className="space-y-2">
                {intent.examples.map((example, i) => (
                  <div
                    key={i}
                    className="text-xs text-zinc-300 bg-zinc-900/50 px-3 py-2 rounded border-l-2 border-cyan-700/50"
                  >
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-validation info */}
          {isValidated && (
            <div className="mt-3 p-3 rounded bg-cyan-950/20 border border-cyan-800/30">
              <div className="flex items-center gap-2 text-xs text-cyan-300">
                <GitCompare className="h-3.5 w-3.5" />
                <span>
                  <strong>Cross-validated:</strong> This intent was also detected by the Intent Engine,
                  confirming its presence in your description.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
