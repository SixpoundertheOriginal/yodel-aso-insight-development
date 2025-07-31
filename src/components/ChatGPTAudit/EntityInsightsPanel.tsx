import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EntityAnalysis } from '@/types/topic-audit.types';
import { 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Heart,
  Meh,
  ThumbsDown,
  Users,
  Star
} from 'lucide-react';

interface EntityInsightsPanelProps {
  entityName: string;
  queryResults: Array<{
    id: string;
    query_text: string;
    entityAnalysis?: EntityAnalysis;
  }>;
}

interface EntityInsights {
  entityName: string;
  totalMentions: number;
  mentionRate: number;
  averagePosition?: number;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  keyContexts: string[];
  competitiveInsight: string;
}

export const EntityInsightsPanel: React.FC<EntityInsightsPanelProps> = ({
  entityName,
  queryResults
}) => {
  // Calculate entity insights from query results
  const calculateEntityInsights = (): EntityInsights => {
    const resultsWithEntity = queryResults.filter(result => result.entityAnalysis);
    const mentionedResults = resultsWithEntity.filter(result => result.entityAnalysis?.entityMentioned);
    
    const totalMentions = mentionedResults.reduce((sum, result) => 
      sum + (result.entityAnalysis?.mentionCount || 0), 0
    );
    
    const mentionRate = queryResults.length > 0 ? mentionedResults.length / queryResults.length : 0;
    
    // Calculate average position
    const positionedResults = mentionedResults.filter(result => result.entityAnalysis?.entityPosition);
    const averagePosition = positionedResults.length > 0 
      ? positionedResults.reduce((sum, result) => sum + (result.entityAnalysis?.entityPosition || 0), 0) / positionedResults.length
      : undefined;
    
    // Determine overall sentiment
    const sentiments = mentionedResults.map(result => result.entityAnalysis?.sentiment || 'neutral');
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    
    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) {
      overallSentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      overallSentiment = 'negative';
    }
    
    // Extract key contexts
    const allContexts = mentionedResults.flatMap(result => result.entityAnalysis?.mentionContexts || []);
    const keyContexts = allContexts.slice(0, 3); // Keep top 3
    
    // Generate competitive insight
    const competitiveInsight = mentionedResults.length > 0 
      ? `Mentioned in ${Math.round(mentionRate * 100)}% of queries`
      : 'Not mentioned in any responses';
    
    return {
      entityName,
      totalMentions,
      mentionRate,
      averagePosition,
      overallSentiment,
      keyContexts,
      competitiveInsight
    };
  };

  const insights = calculateEntityInsights();

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Heart className="h-4 w-4 text-green-400" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-400" />;
      default:
        return <Meh className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  // Don't render if no entity mentions found
  if (insights.totalMentions === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-400" />
            <span>Entity Tracking Results</span>
            <Badge variant="outline">No Mentions</Badge>
          </CardTitle>
          <CardDescription>
            Analysis for "{entityName}" in ChatGPT responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              "{entityName}" was not mentioned in any of the ChatGPT responses.
            </p>
            <p className="text-xs mt-1">
              Try different query variations or check if the entity name is spelled correctly.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-400" />
          <span>Entity Tracking Results</span>
          <Badge variant="secondary">{insights.totalMentions} mentions</Badge>
        </CardTitle>
        <CardDescription>
          Analysis for "{entityName}" in ChatGPT responses
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{insights.totalMentions}</div>
            <div className="text-xs text-muted-foreground">Total Mentions</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{Math.round(insights.mentionRate * 100)}%</div>
            <div className="text-xs text-muted-foreground">Mention Rate</div>
          </div>
          
          {insights.averagePosition && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">#{Math.round(insights.averagePosition)}</div>
              <div className="text-xs text-muted-foreground">Avg Position</div>
            </div>
          )}
          
          <div className="text-center">
            <div className={`text-lg font-bold flex items-center justify-center space-x-1 ${getSentimentColor(insights.overallSentiment)}`}>
              {getSentimentIcon(insights.overallSentiment)}
              <span className="capitalize">{insights.overallSentiment}</span>
            </div>
            <div className="text-xs text-muted-foreground">Overall Sentiment</div>
          </div>
        </div>

        {/* Mention Rate Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mention Rate</span>
            <span>{Math.round(insights.mentionRate * 100)}%</span>
          </div>
          <Progress value={insights.mentionRate * 100} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {insights.competitiveInsight}
          </p>
        </div>

        {/* Key Contexts */}
        {insights.keyContexts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-primary flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Key Mentions</span>
            </h4>
            <div className="space-y-2">
              {insights.keyContexts.map((context, index) => (
                <div key={index} className="p-3 bg-background/50 rounded-lg border border-border">
                  <p className="text-sm text-foreground">"{context.trim()}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-primary flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Sentiment Analysis</span>
          </h4>
          <div className="p-3 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center space-x-2">
              {getSentimentIcon(insights.overallSentiment)}
              <span className="text-sm text-foreground">
                Overall sentiment for "{entityName}" is{' '}
                <span className={`font-medium ${getSentimentColor(insights.overallSentiment)}`}>
                  {insights.overallSentiment}
                </span>
                {insights.averagePosition && (
                  <span className="text-muted-foreground">
                    {' '}with an average position of #{Math.round(insights.averagePosition)} in recommendations
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};