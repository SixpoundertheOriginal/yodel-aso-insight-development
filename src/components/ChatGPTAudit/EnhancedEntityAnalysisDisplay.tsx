import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, TrendingUp, Users, MapPin } from 'lucide-react';

interface EntityAnalysisResult {
  mentioned: boolean;
  mentionCount: number;
  mentionContexts: string[];
  position?: number;
  confidence: number;
  matchedAlias?: string;
  competitors: string[];
  sentimentScore: number;
  visibilityScore: number;
}

interface EnhancedEntityAnalysisDisplayProps {
  result: EntityAnalysisResult;
  targetEntity: string;
  className?: string;
}

export const EnhancedEntityAnalysisDisplay: React.FC<EnhancedEntityAnalysisDisplayProps> = ({
  result,
  targetEntity,
  className
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 20) return { label: 'Very Positive', color: 'bg-green-100 text-green-800' };
    if (score > 0) return { label: 'Positive', color: 'bg-green-50 text-green-700' };
    if (score === 0) return { label: 'Neutral', color: 'bg-gray-100 text-gray-800' };
    if (score > -20) return { label: 'Negative', color: 'bg-red-50 text-red-700' };
    return { label: 'Very Negative', color: 'bg-red-100 text-red-800' };
  };

  const sentiment = getSentimentLabel(result.sentimentScore);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {result.mentioned ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          Entity Analysis Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detection Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Detection Status</span>
              <Badge variant={result.mentioned ? "default" : "secondary"}>
                {result.mentioned ? "Detected" : "Not Found"}
              </Badge>
            </div>
            
            {result.mentioned && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mentions</span>
                  <span className="text-sm font-medium">{result.mentionCount}</span>
                </div>
                
                {result.position && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Position</span>
                    <Badge variant="outline">#{result.position}</Badge>
                  </div>
                )}

                {result.matchedAlias && result.matchedAlias !== targetEntity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Matched As</span>
                    <span className="text-sm font-medium text-blue-600">{result.matchedAlias}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence</span>
                <span className="text-sm font-medium">{Math.round(result.confidence * 100)}%</span>
              </div>
              <Progress 
                value={result.confidence * 100} 
                className="h-2"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Visibility Score</span>
                <span className="text-sm font-medium">{result.visibilityScore}/100</span>
              </div>
              <Progress 
                value={result.visibilityScore} 
                className="h-2"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sentiment</span>
              <Badge className={sentiment.color}>
                {sentiment.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Mention Contexts */}
        {result.mentionContexts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Mention Contexts
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {result.mentionContexts.slice(0, 3).map((context, index) => (
                <div key={index} className="text-xs bg-muted p-2 rounded border-l-2 border-primary">
                  "{context}"
                </div>
              ))}
              {result.mentionContexts.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{result.mentionContexts.length - 3} more contexts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competitors */}
        {result.competitors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Competitors Mentioned ({result.competitors.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {result.competitors.slice(0, 6).map((competitor, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {competitor}
                </Badge>
              ))}
              {result.competitors.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{result.competitors.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};