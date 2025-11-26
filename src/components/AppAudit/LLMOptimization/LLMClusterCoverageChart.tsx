/**
 * LLM Cluster Coverage Chart
 *
 * Visualizes semantic cluster coverage from the description.
 * Shows which topics and keywords are well-covered vs. missing.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, tacticalEffects, auditTypography, getScoreTierColors } from '@/design-registry';
import type { ClusterCoverage } from '@/engine/llmVisibility/llmVisibility.types';

interface LLMClusterCoverageChartProps {
  clusterCoverage: ClusterCoverage;
}

export const LLMClusterCoverageChart: React.FC<LLMClusterCoverageChartProps> = ({ clusterCoverage }) => {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  // Extract clusters array from the coverage object
  const clusters = clusterCoverage.clusters || [];

  // Sort by coverage score (higher first)
  const sortedClusters = [...clusters].sort((a, b) => b.coverage_score - a.coverage_score);

  // Calculate stats
  const avgCoverage = clusters.length > 0
    ? clusters.reduce((sum, c) => sum + c.coverage_score, 0) / clusters.length
    : 0;
  const wellCoveredCount = clusters.filter((c) => c.coverage_score >= 70).length;
  const weakCoverageCount = clusters.filter((c) => c.coverage_score < 50).length;

  const toggleCluster = (clusterName: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterName)) {
      newExpanded.delete(clusterName);
    } else {
      newExpanded.add(clusterName);
    }
    setExpandedClusters(newExpanded);
  };

  if (clusters.length === 0) {
    return (
      <Card className={cn(
        "border-zinc-800 bg-zinc-950/50",
        tacticalEffects.glassPanel.light
      )}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <BookOpen className="h-12 w-12 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                No Semantic Clusters Analyzed
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Enable vertical-specific analysis to see semantic cluster coverage.
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
        tacticalEffects.cornerBracket.colors.green,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomRight,
        tacticalEffects.cornerBracket.colors.green,
        tacticalEffects.cornerBracket.animated
      )} />

      <CardHeader>
        <CardTitle className={cn(
          "flex items-center gap-2 relative z-10",
          auditTypography.section.main
        )}>
          <BookOpen className="h-5 w-5 text-green-400" style={{ filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))' }} />
          <span>Semantic Cluster Coverage</span>
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
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Weak Coverage</div>
            <div className="text-2xl font-bold text-orange-300">{weakCoverageCount}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 relative z-10">
        {sortedClusters.map((cluster) => (
          <ClusterItem
            key={cluster.cluster_id}
            cluster={cluster}
            isExpanded={expandedClusters.has(cluster.cluster_id)}
            onToggle={() => toggleCluster(cluster.cluster_id)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Cluster Item Component
// ============================================================================

interface ClusterItemProps {
  cluster: ClusterCoverage['clusters'][number];
  isExpanded: boolean;
  onToggle: () => void;
}

const ClusterItem: React.FC<ClusterItemProps> = ({ cluster, isExpanded, onToggle }) => {
  const tierColors = getScoreTierColors(cluster.coverage_score);
  const hasKeywords = (cluster.matched_keywords?.length || 0) > 0 || (cluster.missing_keywords?.length || 0) > 0;

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
        disabled={!hasKeywords}
      >
        {/* Left: Label and weight */}
        <div className="flex-1 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">
              {cluster.cluster_label}
            </span>
            <Badge variant="outline" className="text-xs border-zinc-700/50 text-zinc-500">
              Weight: {Math.round(cluster.importance_weight * 100)}%
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                tierColors.bg
              )}
              style={{
                width: `${cluster.coverage_score}%`,
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
              {Math.round(cluster.coverage_score)}%
            </div>
          </div>
          {hasKeywords && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500 flex-shrink-0" />
            )
          )}
        </div>
      </button>

      {/* Expanded: Keywords */}
      {isExpanded && hasKeywords && (
        <div className="border-t border-zinc-800/50 p-4 space-y-3 bg-zinc-950/50">
          {/* Matched Keywords */}
          {cluster.matched_keywords && cluster.matched_keywords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-green-300 uppercase tracking-wider">
                  Matched Keywords ({cluster.matched_keywords.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cluster.matched_keywords.map((keyword, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs border-green-700/50 bg-green-950/30 text-green-300"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          {cluster.missing_keywords && cluster.missing_keywords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-medium text-orange-300 uppercase tracking-wider">
                  Missing Keywords ({cluster.missing_keywords.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cluster.missing_keywords.map((keyword, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs border-orange-700/50 bg-orange-950/30 text-orange-300"
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
  );
};
