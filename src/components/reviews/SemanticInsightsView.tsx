import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Sparkles, Target, Package } from 'lucide-react';
import type { StoredInsight } from '@/services/semantic-insight.service';
import type { FeatureGap } from '@/services/competitor-review-intelligence.service';

interface SemanticInsightsViewProps {
  insights?: {
    asoOpportunities: StoredInsight[];
    productFeatures: StoredInsight[];
    trending: StoredInsight[];
    semanticGaps: FeatureGap[];
  };
}

export const SemanticInsightsView: React.FC<SemanticInsightsViewProps> = ({ insights }) => {
  if (!insights) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No semantic insights available</p>
        <p className="text-sm mt-2">Run a new analysis to generate semantic insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ASO Keyword Opportunities */}
      {insights.asoOpportunities.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-orange-500" />
            <h4 className="text-sm font-semibold">ASO Keyword Opportunities</h4>
            <Badge variant="outline" className="ml-auto">
              {insights.asoOpportunities.length} opportunities
            </Badge>
          </div>
          <div className="space-y-2">
            {insights.asoOpportunities.slice(0, 5).map((insight, idx) => (
              <InsightCard key={insight.id} insight={insight} rank={idx + 1} type="aso" />
            ))}
          </div>
        </section>
      )}

      {/* Product Feature Requests */}
      {insights.productFeatures.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold">Product Feature Requests</h4>
            <Badge variant="outline" className="ml-auto">
              {insights.productFeatures.length} features
            </Badge>
          </div>
          <div className="space-y-2">
            {insights.productFeatures.slice(0, 5).map((insight, idx) => (
              <InsightCard key={insight.id} insight={insight} rank={idx + 1} type="product" />
            ))}
          </div>
        </section>
      )}

      {/* Trending Topics */}
      {insights.trending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h4 className="text-sm font-semibold">Trending Topics</h4>
            <Badge variant="outline" className="ml-auto">
              {insights.trending.length} rising
            </Badge>
          </div>
          <div className="space-y-2">
            {insights.trending.slice(0, 5).map((insight, idx) => (
              <InsightCard key={insight.id} insight={insight} rank={idx + 1} type="trending" />
            ))}
          </div>
        </section>
      )}

      {/* Semantic Feature Gaps */}
      {insights.semanticGaps.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <h4 className="text-sm font-semibold">Semantic Feature Gaps</h4>
            <Badge variant="outline" className="ml-auto">
              {insights.semanticGaps.length} gaps
            </Badge>
          </div>
          <div className="space-y-2">
            {insights.semanticGaps.map((gap, idx) => (
              <SemanticGapCard key={idx} gap={gap} rank={idx + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/**
 * Individual insight card
 */
const InsightCard: React.FC<{
  insight: StoredInsight;
  rank: number;
  type: 'aso' | 'product' | 'trending';
}> = ({ insight, rank, type }) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground shrink-0">#{rank}</span>
            <h5 className="font-medium text-sm truncate">{insight.context_phrase}</h5>
            <TrendIndicator
              direction={insight.trend_direction}
              momPct={insight.trend_mom_pct}
            />
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="whitespace-nowrap">{insight.mention_count} mentions</span>
            <span>•</span>
            <span className="whitespace-nowrap">
              {Math.round(insight.sentiment_positive_pct)}% positive
            </span>
            <span>•</span>
            <Badge variant={getDemandVariant(insight.demand_level)} className="text-[10px] px-1.5 py-0">
              {insight.demand_level.toUpperCase()}
            </Badge>
          </div>

          {/* ASO Keywords or Product Info */}
          {type === 'aso' && insight.aso_keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {insight.aso_keywords.map((kw, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {kw}
                </Badge>
              ))}
            </div>
          )}

          {type === 'product' && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {insight.exploitability} complexity
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {insight.category}
              </Badge>
            </div>
          )}
        </div>

        {/* Impact Score */}
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${getImpactColor(insight.impact_score)}`}>
            {insight.impact_score}
          </div>
          <div className="text-xs text-muted-foreground">Impact</div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Semantic gap card (from feature gaps)
 */
const SemanticGapCard: React.FC<{
  gap: FeatureGap;
  rank: number;
}> = ({ gap, rank }) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-muted-foreground">#{rank}</span>
            <h5 className="font-medium text-sm">{gap.feature}</h5>
            <Badge variant={getDemandVariant(gap.userDemand)} className="text-[10px] px-1.5 py-0">
              {gap.userDemand.toUpperCase()} DEMAND
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              Mentioned in {gap.mentionedInCompetitors.length} competitor{gap.mentionedInCompetitors.length > 1 ? 's' : ''}
              • {gap.frequency} total mentions
              • Sentiment: {Math.round(((gap.competitorSentiment + 1) / 2) * 100)}%
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {gap.mentionedInCompetitors.map((comp, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Trend indicator component
 */
const TrendIndicator: React.FC<{
  direction: 'rising' | 'stable' | 'declining' | 'new';
  momPct: number | null;
}> = ({ direction, momPct }) => {
  if (direction === 'new') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
        NEW
      </Badge>
    );
  }

  if (!momPct) return null;

  const Icon = direction === 'rising' ? TrendingUp : direction === 'declining' ? TrendingDown : Minus;
  const color = direction === 'rising' ? 'text-green-500' : direction === 'declining' ? 'text-red-500' : 'text-gray-500';

  return (
    <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 shrink-0">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className={color}>{momPct > 0 ? '+' : ''}{momPct.toFixed(1)}%</span>
    </Badge>
  );
};

/**
 * Get demand level badge variant
 */
const getDemandVariant = (level: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (level) {
    case 'critical': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

/**
 * Get impact score color
 */
const getImpactColor = (score: number): string => {
  if (score >= 80) return 'text-orange-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-blue-500';
  return 'text-gray-500';
};
