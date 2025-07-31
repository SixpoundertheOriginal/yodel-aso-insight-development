import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Info, Target } from 'lucide-react';

interface ContextValidationData {
  industryRelevance: number;
  audienceAlignment: number;
  contextWarnings: string[];
  recommendedActions: string[];
}

interface ContextValidationCardProps {
  topicData: {
    topic: string;
    industry: string;
    target_audience: string;
    context_description?: string;
    entityToTrack?: string;
  };
  validationData: ContextValidationData;
}

export const ContextValidationCard: React.FC<ContextValidationCardProps> = ({
  topicData,
  validationData
}) => {
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRelevanceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          <span>Context Validation</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Setup Context Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Audit Context</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Topic</div>
              <div className="text-sm font-medium">{topicData.topic}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Industry</div>
              <div className="text-sm font-medium">{topicData.industry}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Target Audience</div>
              <div className="text-sm font-medium">{topicData.target_audience}</div>
            </div>
            {topicData.entityToTrack && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Entity Tracking</div>
                <div className="text-sm font-medium">{topicData.entityToTrack}</div>
              </div>
            )}
          </div>
        </div>

        {/* Relevance Scores */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Context Relevance</h4>
          
          {/* Industry Relevance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Industry Alignment</span>
              <Badge 
                variant="outline" 
                className={getRelevanceColor(validationData.industryRelevance)}
              >
                {getRelevanceLabel(validationData.industryRelevance)}
              </Badge>
            </div>
            <Progress 
              value={validationData.industryRelevance * 100} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              {Math.round(validationData.industryRelevance * 100)}% of responses contained {topicData.industry}-specific terminology
            </div>
          </div>

          {/* Audience Alignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Audience Alignment</span>
              <Badge 
                variant="outline" 
                className={getRelevanceColor(validationData.audienceAlignment)}
              >
                {getRelevanceLabel(validationData.audienceAlignment)}
              </Badge>
            </div>
            <Progress 
              value={validationData.audienceAlignment * 100} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              {Math.round(validationData.audienceAlignment * 100)}% of responses addressed {topicData.target_audience} needs
            </div>
          </div>
        </div>

        {/* Context Warnings */}
        {validationData.contextWarnings.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Context Warnings</span>
            </h4>
            <div className="space-y-2">
              {validationData.contextWarnings.map((warning, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">{warning}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {validationData.recommendedActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span>Recommended Actions</span>
            </h4>
            <div className="space-y-2">
              {validationData.recommendedActions.map((action, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">{action}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Context */}
        {topicData.context_description && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Additional Context</h4>
            <div className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg">
              {topicData.context_description}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};