/**
 * LLM Findings Panel
 *
 * Displays diagnostic findings from LLM visibility analysis.
 * Groups findings by severity with actionable recommendations.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Target,
  BookOpen,
  FileText,
  MessageSquare,
  Brain,
  Shield,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { cn, tacticalEffects, auditTypography } from '@/design-registry';
import type { LLMFinding } from '@/engine/llmVisibility/llmVisibility.types';

interface LLMFindingsPanelProps {
  findings: LLMFinding[];
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-950/20',
    borderColor: 'border-red-800/30',
    badge: 'bg-red-900/30 text-red-300 border-red-700/50',
    label: 'Critical Issues',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/20',
    borderColor: 'border-orange-800/30',
    badge: 'bg-orange-900/30 text-orange-300 border-orange-700/50',
    label: 'Warnings',
  },
  info: {
    icon: Info,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/20',
    borderColor: 'border-cyan-800/30',
    badge: 'bg-cyan-900/30 text-cyan-300 border-cyan-700/50',
    label: 'Suggestions',
  },
};

const CATEGORY_CONFIG: Record<string, { icon: any; label: string }> = {
  structure_readability: { icon: FileText, label: 'Structure & Readability' },
  factual_grounding: { icon: Target, label: 'Factual Grounding' },
  semantic_clusters: { icon: BookOpen, label: 'Semantic Coverage' },
  intent_coverage: { icon: MessageSquare, label: 'Intent Coverage' },
  snippet_quality: { icon: Brain, label: 'Snippet Quality' },
  safety_credibility: { icon: Shield, label: 'Safety & Credibility' },

  // Legacy/fallback mappings
  structure: { icon: FileText, label: 'Structure' },
  factual: { icon: Target, label: 'Factual' },
  semantic: { icon: BookOpen, label: 'Semantic' },
  intent: { icon: MessageSquare, label: 'Intent' },
  snippet: { icon: Brain, label: 'Snippet' },
  safety: { icon: Shield, label: 'Safety' },
};

export const LLMFindingsPanel: React.FC<LLMFindingsPanelProps> = ({ findings }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['critical', 'warning']));

  // Group findings by severity
  const findingsBySeverity = {
    critical: findings.filter((f) => f.severity === 'critical'),
    warning: findings.filter((f) => f.severity === 'warning'),
    info: findings.filter((f) => f.severity === 'info'),
  };

  const toggleSection = (severity: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(severity)) {
      newExpanded.delete(severity);
    } else {
      newExpanded.add(severity);
    }
    setExpandedSections(newExpanded);
  };

  const totalIssues = findings.length;
  const criticalCount = findingsBySeverity.critical.length;
  const warningCount = findingsBySeverity.warning.length;

  if (totalIssues === 0) {
    return (
      <Card className={cn(
        "border-zinc-800 bg-zinc-950/50",
        tacticalEffects.glassPanel.light
      )}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20">
              <Lightbulb className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-300 mb-2">
                Excellent LLM Visibility!
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                No critical issues detected. Your description is well-optimized for LLM discoverability.
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
        tacticalEffects.cornerBracket.colors.orange,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomRight,
        tacticalEffects.cornerBracket.colors.orange,
        tacticalEffects.cornerBracket.animated
      )} />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2 relative z-10",
            auditTypography.section.main
          )}>
            <Lightbulb className="h-5 w-5 text-orange-400" style={{ filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.4))' }} />
            <span>Findings & Recommendations</span>
          </CardTitle>
          <div className="flex items-center gap-2 relative z-10">
            {criticalCount > 0 && (
              <Badge variant="outline" className={SEVERITY_CONFIG.critical.badge}>
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className={SEVERITY_CONFIG.warning.badge}>
                {warningCount} Warnings
              </Badge>
            )}
            <Badge variant="outline" className="border-zinc-700/50 text-zinc-400">
              {totalIssues} Total
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {/* Critical Issues */}
        {findingsBySeverity.critical.length > 0 && (
          <SeveritySection
            severity="critical"
            findings={findingsBySeverity.critical}
            isExpanded={expandedSections.has('critical')}
            onToggle={() => toggleSection('critical')}
          />
        )}

        {/* Warnings */}
        {findingsBySeverity.warning.length > 0 && (
          <SeveritySection
            severity="warning"
            findings={findingsBySeverity.warning}
            isExpanded={expandedSections.has('warning')}
            onToggle={() => toggleSection('warning')}
          />
        )}

        {/* Info/Suggestions */}
        {findingsBySeverity.info.length > 0 && (
          <SeveritySection
            severity="info"
            findings={findingsBySeverity.info}
            isExpanded={expandedSections.has('info')}
            onToggle={() => toggleSection('info')}
          />
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Severity Section Component
// ============================================================================

interface SeveritySectionProps {
  severity: 'critical' | 'warning' | 'info';
  findings: LLMFinding[];
  isExpanded: boolean;
  onToggle: () => void;
}

const SeveritySection: React.FC<SeveritySectionProps> = ({
  severity,
  findings,
  isExpanded,
  onToggle,
}) => {
  const config = SEVERITY_CONFIG[severity];
  const SeverityIcon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border",
      config.borderColor,
      config.bgColor
    )}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between",
          "hover:bg-zinc-900/40 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        )}
      >
        <div className="flex items-center gap-3">
          <SeverityIcon className={cn("h-5 w-5", config.color)} />
          <span className="text-sm font-semibold text-zinc-200">
            {config.label}
          </span>
          <Badge variant="outline" className={cn("text-xs", config.badge)}>
            {findings.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {/* Findings List */}
      {isExpanded && (
        <div className="border-t border-zinc-800/50 divide-y divide-zinc-800/30">
          {findings.map((finding, index) => (
            <FindingItem key={finding.id || index} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Finding Item Component
// ============================================================================

interface FindingItemProps {
  finding: LLMFinding;
}

const FindingItem: React.FC<FindingItemProps> = ({ finding }) => {
  const categoryConfig = CATEGORY_CONFIG[finding.category] || { icon: Info, label: finding.category };
  const CategoryIcon = categoryConfig.icon;

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CategoryIcon className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {categoryConfig.label}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
            {finding.message}
          </h4>
          {finding.suggestion && (
            <p className="text-xs text-zinc-400 leading-relaxed">
              {finding.suggestion}
            </p>
          )}
        </div>
        {finding.impact_score !== undefined && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">Impact</span>
            <span className={cn(
              "text-lg font-bold",
              finding.impact_score >= 8 ? "text-red-400" :
              finding.impact_score >= 5 ? "text-orange-400" :
              "text-cyan-400"
            )}>
              {finding.impact_score}/10
            </span>
          </div>
        )}
      </div>

      {/* Suggestion */}
      {finding.suggestion && (
        <Alert className="border-cyan-800/30 bg-cyan-950/20 py-2">
          <Lightbulb className="h-3.5 w-3.5 text-cyan-400" />
          <AlertDescription className="text-xs text-cyan-200/80 leading-relaxed">
            <strong className="text-cyan-300">Recommendation:</strong> {finding.suggestion}
          </AlertDescription>
        </Alert>
      )}

      {/* Location context */}
      {finding.section && (
        <div className="mt-2 p-3 rounded bg-zinc-900/50 border border-zinc-800/50">
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
            Section
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {finding.section}
          </p>
        </div>
      )}
    </div>
  );
};
