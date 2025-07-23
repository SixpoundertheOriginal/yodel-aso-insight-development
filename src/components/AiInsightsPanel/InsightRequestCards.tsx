import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Eye, 
  Target, 
  Search, 
  Calendar,
  BarChart3,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface InsightRequestCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  type: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  hasExisting: boolean;
}

interface InsightRequestCardsProps {
  onRequestInsight: (type: string) => Promise<void>;
  isGenerating: boolean;
  hasInsightType: (type: string) => boolean;
}

export const InsightRequestCards: React.FC<InsightRequestCardsProps> = ({
  onRequestInsight,
  isGenerating,
  hasInsightType
}) => {
  const requestCards: InsightRequestCard[] = [
    {
      id: 'cvr_analysis',
      title: 'Conversion Rate Deep Dive',
      description: 'Analyze conversion rates by traffic source and identify optimization opportunities',
      icon: TrendingUp,
      type: 'cvr_analysis',
      priority: 'high',
      estimatedTime: '30 seconds',
      hasExisting: hasInsightType('cvr_analysis')
    },
    {
      id: 'impression_trends',
      title: 'Impression Trend Analysis',
      description: 'Examine impression patterns, seasonality, and visibility optimization strategies',
      icon: Eye,
      type: 'impression_trends', 
      priority: 'high',
      estimatedTime: '30 seconds',
      hasExisting: hasInsightType('impression_trends')
    },
    {
      id: 'traffic_source_performance',
      title: 'Traffic Source Performance',
      description: 'Compare App Store Search vs Browse vs Referral performance and optimization tactics',
      icon: Target,
      type: 'traffic_source_performance',
      priority: 'medium',
      estimatedTime: '45 seconds',
      hasExisting: hasInsightType('traffic_source_performance')
    },
    {
      id: 'keyword_optimization',
      title: 'Keyword Optimization',
      description: 'Get specific keyword ranking improvements and metadata optimization recommendations',
      icon: Search,
      type: 'keyword_optimization',
      priority: 'high',
      estimatedTime: '45 seconds',
      hasExisting: hasInsightType('keyword_optimization')
    },
    {
      id: 'seasonal_pattern',
      title: 'Seasonal Trend Analysis',
      description: 'Identify seasonal patterns, timing opportunities, and cyclical performance trends',
      icon: Calendar,
      type: 'seasonal_pattern',
      priority: 'medium',
      estimatedTime: '30 seconds',
      hasExisting: hasInsightType('seasonal_pattern')
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Request Specific Insights</h3>
        <Badge variant="outline" className="text-xs">
          AI-Powered Analysis
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requestCards.map((card) => {
          const IconComponent = card.icon;
          const isDisabled = isGenerating;
          
          return (
            <Card 
              key={card.id} 
              className={`relative transition-all duration-200 hover:shadow-md border ${
                card.hasExisting ? 'border-green-200 bg-green-50/30' : 'border-border'
              }`}
            >
              {card.hasExisting && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPriorityColor(card.priority)}`}
                  >
                    {card.priority}
                  </Badge>
                </div>
                <CardTitle className="text-base">{card.title}</CardTitle>
                <CardDescription className="text-sm">
                  {card.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {card.estimatedTime}
                  </span>
                  
                  <Button
                    size="sm"
                    variant={card.hasExisting ? "outline" : "default"}
                    className="text-xs"
                    disabled={isDisabled}
                    onClick={() => onRequestInsight(card.type)}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Analyzing...
                      </>
                    ) : card.hasExisting ? (
                      'Refresh'
                    ) : (
                      'Analyze'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-xs text-muted-foreground text-center bg-muted/30 p-3 rounded-lg">
        💡 <strong>Pro Tip:</strong> Request specific insights to get targeted recommendations for your biggest optimization opportunities
      </div>
    </div>
  );
};