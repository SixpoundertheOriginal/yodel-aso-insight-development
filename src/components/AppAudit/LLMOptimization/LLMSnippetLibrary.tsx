/**
 * LLM Snippet Library
 *
 * Displays quotable text snippets extracted from the description.
 * Shows what LLMs are likely to quote when recommending the app.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Quote, Target, Zap, Award, Users, AlertCircle, Filter } from 'lucide-react';
import { cn, tacticalEffects, auditTypography, getScoreTierColors } from '@/design-registry';
import type { LLMSnippet } from '@/engine/llmVisibility/llmVisibility.types';

interface LLMSnippetLibraryProps {
  snippets: LLMSnippet[];
}

const CATEGORY_CONFIG = {
  factual: {
    icon: Target,
    label: 'Factual',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-800/30',
  },
  feature: {
    icon: Zap,
    label: 'Feature',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/20',
    borderColor: 'border-purple-800/30',
  },
  benefit: {
    icon: Award,
    label: 'Benefit',
    color: 'text-green-400',
    bgColor: 'bg-green-950/20',
    borderColor: 'border-green-800/30',
  },
  social_proof: {
    icon: Users,
    label: 'Social Proof',
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/20',
    borderColor: 'border-orange-800/30',
  },
  claim: {
    icon: AlertCircle,
    label: 'Claim',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/20',
    borderColor: 'border-cyan-800/30',
  },
  general: {
    icon: Quote,
    label: 'General',
    color: 'text-gray-400',
    bgColor: 'bg-gray-950/20',
    borderColor: 'border-gray-800/30',
  },
};

type FilterType = 'all' | 'factual' | 'feature' | 'benefit' | 'social_proof' | 'claim';

export const LLMSnippetLibrary: React.FC<LLMSnippetLibraryProps> = ({ snippets }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filter snippets
  const filteredSnippets = activeFilter === 'all'
    ? snippets
    : snippets.filter((s) => s.category === activeFilter);

  // Sort by quality score
  const sortedSnippets = [...filteredSnippets].sort((a, b) => b.quality_score - a.quality_score);

  // Helper function to infer category from section
  const inferCategory = (section: string): string => {
    const s = section.toLowerCase();
    if (s.includes('feature')) return 'feature';
    if (s.includes('benefit')) return 'benefit';
    if (s.includes('social')) return 'social_proof';
    return 'general';
  };

  // Category counts (based on inferred categories from sections)
  const categoryCounts = snippets.reduce((acc, snippet) => {
    const category = inferCategory(snippet.section);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Quality stats
  const avgQuality = snippets.length > 0
    ? snippets.reduce((sum, s) => sum + s.quality_score, 0) / snippets.length
    : 0;
  const highQualityCount = snippets.filter((s) => s.quality_score >= 70).length;

  if (snippets.length === 0) {
    return (
      <Card className={cn(
        "border-zinc-800 bg-zinc-950/50",
        tacticalEffects.glassPanel.light
      )}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Quote className="h-12 w-12 text-zinc-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                No Quotable Snippets Found
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Your description lacks clear, quotable statements. Add concrete facts,
                features, or benefits to improve snippet quality.
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
        tacticalEffects.cornerBracket.colors.purple,
        tacticalEffects.cornerBracket.animated
      )} />
      <div className={cn(
        tacticalEffects.cornerBracket.bottomRight,
        tacticalEffects.cornerBracket.colors.purple,
        tacticalEffects.cornerBracket.animated
      )} />

      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className={cn(
            "flex items-center gap-2 relative z-10",
            auditTypography.section.main
          )}>
            <Quote className="h-5 w-5 text-purple-400" style={{ filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.4))' }} />
            <span>Quotable Snippets</span>
            <Badge variant="outline" className="ml-2 border-purple-500/30 text-purple-300">
              {snippets.length} found
            </Badge>
          </CardTitle>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Total Snippets</div>
            <div className="text-2xl font-bold text-purple-300">{snippets.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">High Quality</div>
            <div className="text-2xl font-bold text-green-300">{highQualityCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Avg Quality</div>
            <div className={cn(
              "text-2xl font-bold",
              getScoreTierColors(avgQuality).text
            )}>
              {Math.round(avgQuality)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-xs text-zinc-500 mb-1">Categories</div>
            <div className="text-2xl font-bold text-cyan-300">{Object.keys(categoryCounts).length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-4 relative z-10">
          <Filter className="h-4 w-4 text-zinc-500" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Filter:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveFilter('all')}
            className={cn(
              "h-7 text-xs",
              activeFilter === 'all'
                ? "border-purple-500/50 bg-purple-950/30 text-purple-300"
                : "border-zinc-700/50 text-zinc-400 hover:border-zinc-600"
            )}
          >
            All ({snippets.length})
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
            const count = categoryCounts[key] || 0;
            if (count === 0) return null;

            const Icon = config.icon;
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => setActiveFilter(key as FilterType)}
                className={cn(
                  "h-7 text-xs",
                  activeFilter === key
                    ? `border-${config.borderColor.split('-')[1]}-500/50 bg-${config.bgColor.split('-')[1]}-950/30 ${config.color}`
                    : "border-zinc-700/50 text-zinc-400 hover:border-zinc-600"
                )}
              >
                <Icon className="h-3 w-3 mr-1" />
                {config.label} ({count})
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 relative z-10">
        {sortedSnippets.map((snippet, index) => (
          <SnippetCard key={snippet.id || index} snippet={snippet} rank={index + 1} />
        ))}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Snippet Card Component
// ============================================================================

interface SnippetCardProps {
  snippet: LLMSnippet;
  rank: number;
}

const SnippetCard: React.FC<SnippetCardProps> = ({ snippet, rank }) => {
  // Infer category from section name (engine provides section, not category)
  const inferredCategory = snippet.section.toLowerCase().includes('feature')
    ? 'feature'
    : snippet.section.toLowerCase().includes('benefit')
    ? 'benefit'
    : snippet.section.toLowerCase().includes('social')
    ? 'social_proof'
    : 'general';

  const categoryConfig = CATEGORY_CONFIG[inferredCategory] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryConfig.icon;
  const tierColors = getScoreTierColors(snippet.quality_score);

  // Calculate length from text (engine doesn't provide length field)
  const snippetLength = snippet.text.length;

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      "bg-zinc-950/30",
      categoryConfig.borderColor,
      "hover:bg-zinc-900/40 transition-all duration-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
            "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50"
          )}>
            {rank}
          </div>
          <CategoryIcon className={cn("h-4 w-4", categoryConfig.color)} />
          <Badge variant="outline" className={cn("text-xs", categoryConfig.borderColor, categoryConfig.color)}>
            {categoryConfig.label}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-zinc-600 uppercase tracking-wider">Quality</span>
          <span className={cn("text-xl font-bold", tierColors.text)}>
            {Math.round(snippet.quality_score)}
          </span>
        </div>
      </div>

      {/* Snippet Text */}
      <div className={cn(
        "p-4 rounded-lg mb-3",
        categoryConfig.bgColor,
        "border-l-2",
        categoryConfig.borderColor
      )}>
        <Quote className={cn("h-4 w-4 mb-2 opacity-40", categoryConfig.color)} />
        <p className="text-sm text-zinc-200 leading-relaxed italic">
          "{snippet.text}"
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-600">
            Length: <span className="text-zinc-400 font-medium">{snippetLength} chars</span>
          </span>
          <span className="text-zinc-600">
            Section: <span className="text-zinc-400 font-medium">{snippet.section}</span>
          </span>
        </div>
        {/* Quality bar */}
        <div className="w-20 h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", tierColors.bg)}
            style={{
              width: `${snippet.quality_score}%`,
              boxShadow: `0 0 6px ${tierColors.ring}60`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
