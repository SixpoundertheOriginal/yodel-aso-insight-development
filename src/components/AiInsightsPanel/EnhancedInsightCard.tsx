import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { EnhancedAsoInsight } from '@/hooks/useEnhancedAsoInsights';

interface EnhancedInsightCardProps {
  insight: EnhancedAsoInsight;
  onViewDetails?: (insight: EnhancedAsoInsight) => void;
}

export const EnhancedInsightCard: React.FC<EnhancedInsightCardProps> = ({
  insight,
  onViewDetails
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cvr_analysis': return TrendingUp;
      case 'performance_alert': return AlertTriangle;
      case 'configuration': return CheckCircle;
      default: return Lightbulb;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cvr_analysis': return 'text-blue-600';
      case 'impression_trends': return 'text-purple-600';
      case 'traffic_source_performance': return 'text-green-600';
      case 'keyword_optimization': return 'text-orange-600';
      case 'competitive_analysis': return 'text-red-600';
      case 'seasonal_pattern': return 'text-cyan-600';
      case 'performance_alert': return 'text-red-600';
      case 'configuration': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getEffortColor = (effort?: string) => {
    switch (effort) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const IconComponent = getTypeIcon(insight.type);
  const typeColor = getTypeColor(insight.type);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      insight.priority === 'high' ? 'border-l-4 border-l-red-500' : 
      insight.priority === 'medium' ? 'border-l-4 border-l-yellow-500' : 
      'border-l-4 border-l-green-500'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 ${typeColor}`} />
            <Badge variant="outline" className="text-xs">
              {formatType(insight.type)}
            </Badge>
            {insight.is_user_requested && (
              <Badge variant="secondary" className="text-xs">
                Requested
              </Badge>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${getPriorityColor(insight.priority)}`}
          >
            {insight.priority}
          </Badge>
        </div>
        
        <CardTitle className="text-base leading-tight">
          {insight.title}
        </CardTitle>
        
        <CardDescription className="text-sm leading-relaxed">
          {insight.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Recommendations */}
        {insight.actionable_recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-1">
              <Target className="h-4 w-4" />
              Action Items
            </h4>
            <ul className="space-y-1">
              {insight.actionable_recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
            {insight.actionable_recommendations.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{insight.actionable_recommendations.length - 3} more recommendations
              </p>
            )}
          </div>
        )}

        {/* Implementation Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {insight.confidence > 0 && (
              <span className="text-muted-foreground">
                Confidence: {Math.round(insight.confidence * 100)}%
              </span>
            )}
            
            {insight.implementation_effort && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEffortColor(insight.implementation_effort)}`}>
                {insight.implementation_effort} effort
              </div>
            )}
          </div>
          
          {insight.expected_timeline && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {insight.expected_timeline}
            </span>
          )}
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onViewDetails(insight)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Full Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
};