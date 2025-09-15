import React from 'react';
import { 
  PremiumCard, 
  PremiumCardHeader, 
  PremiumCardContent,
  PremiumTypography 
} from '@/components/ui/premium';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Target, 
  Trophy, 
  CheckCircle, 
  Clock, 
  Lightbulb,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedAsoInsight } from '@/types/aso';
import { getInsightCategoryById } from './insightCategories';

interface AiInsightCardProps {
  insight: EnhancedAsoInsight;
  onViewDetails?: (insight: EnhancedAsoInsight) => void;
  isDemoMode?: boolean;
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  insight,
  onViewDetails,
  isDemoMode = false
}) => {
  // Map insight type to category for styling
  const getCategoryFromType = (type: string) => {
    if (type.includes('impression') || type.includes('keyword') || type.includes('seasonal')) {
      return 'visibility';
    }
    if (type.includes('cvr') || type.includes('traffic_source')) {
      return 'conversion';
    }
    if (type.includes('competitive')) {
      return 'competitive';
    }
    return 'visibility'; // default
  };

  const categoryId = getCategoryFromType(insight.type);
  const category = getInsightCategoryById(categoryId);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getEffortColor = (effort?: string) => {
    switch (effort) {
      case 'low': return 'text-green-400 bg-green-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'high': return 'text-red-400 bg-red-500/10';
      default: return 'text-zinc-400 bg-zinc-500/10';
    }
  };

  const IconComponent = category?.icon || Lightbulb;

  return (
    <PremiumCard 
      variant="glass" 
      intensity="medium" 
      glowColor={category?.glowColor || 'blue'}
      className="h-full border-l-4 border-l-primary/50 hover:border-l-primary transition-all duration-300 rounded-md shadow-md"
    >
      <PremiumCardHeader className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg", 
              category?.color === 'orange' && 'bg-orange-500/20 text-orange-400',
              category?.color === 'blue' && 'bg-blue-500/20 text-blue-400', 
              category?.color === 'success' && 'bg-emerald-500/20 text-emerald-400'
            )}>
              <IconComponent className="h-5 w-5" />
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-zinc-400 text-sm uppercase font-medium tracking-wide">
                {category?.title || 'AI Insight'}
              </span>
              {isDemoMode && (
                <Badge 
                  variant="secondary" 
                  className="text-xs w-fit bg-primary/10 text-primary border-primary/20"
                >
                  Demo Data
                </Badge>
              )}
            </div>
          </div>
          
          <Badge
            variant="outline"
            className={cn("text-xs font-medium", getPriorityColor(insight.priority))}
          >
            {insight.priority.toUpperCase()}
          </Badge>
        </div>

        <div className="text-2xl font-bold text-foreground mb-2">
          {insight.title}
        </div>

        <div className="text-sm text-zinc-300 leading-relaxed flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
          <span>
            {insight.description.length > 120
              ? `${insight.description.slice(0, 120)}...`
              : insight.description}
          </span>
        </div>
      </PremiumCardHeader>

      <PremiumCardContent className="pt-0 space-y-4">
        {/* Key Recommendations */}
        {insight.actionable_recommendations && insight.actionable_recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <PremiumTypography.Caption className="text-foreground font-medium">
                Key Actions
              </PremiumTypography.Caption>
            </div>
            <div className="space-y-1">
              {insight.actionable_recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-emerald-400 mt-1 flex-shrink-0" />
                  <span className="text-zinc-300 leading-relaxed">{rec}</span>
                </div>
              ))}
              {insight.actionable_recommendations.length > 2 && (
                <PremiumTypography.Caption className="text-zinc-500 ml-5">
                  +{insight.actionable_recommendations.length - 2} more actions
                </PremiumTypography.Caption>
              )}
            </div>
          </div>
        )}

        {/* Metrics Impact */}
        {insight.metrics_impact && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <PremiumTypography.Caption className="text-foreground font-medium">
                Expected Impact
              </PremiumTypography.Caption>
            </div>
            <div className="text-sm text-zinc-300">
              {insight.metrics_impact.downloads && (
                <div className="flex justify-between">
                  <span>Downloads:</span>
                  <span className="text-emerald-400">{insight.metrics_impact.downloads}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer with meta info */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 text-xs">
            {insight.confidence > 0 && (
              <span className="text-zinc-400">
                {Math.round(insight.confidence * 100)}% confidence
              </span>
            )}
            
            {insight.implementation_effort && (
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium", 
                getEffortColor(insight.implementation_effort)
              )}>
                {insight.implementation_effort} effort
              </div>
            )}
          </div>

          {insight.expected_timeline && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="h-3 w-3" />
              {insight.expected_timeline}
            </div>
          )}
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-3 border-zinc-700 hover:border-primary/50 hover:bg-primary/5"
            onClick={() => onViewDetails(insight)}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            View Full Analysis
          </Button>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
};