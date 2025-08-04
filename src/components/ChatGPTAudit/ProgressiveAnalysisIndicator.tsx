import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface AnalysisProgress {
  currentQuery: number;
  totalQueries: number;
  stage: string;
  entityDetections: number;
  averageConfidence: number;
  processingTime: number;
}

interface ProgressiveAnalysisIndicatorProps {
  progress: AnalysisProgress;
  isComplete?: boolean;
  className?: string;
}

export const ProgressiveAnalysisIndicator: React.FC<ProgressiveAnalysisIndicatorProps> = ({
  progress,
  isComplete = false,
  className
}) => {
  const completionPercentage = (progress.currentQuery / progress.totalQueries) * 100;
  const detectionRate = progress.currentQuery > 0 ? (progress.entityDetections / progress.currentQuery) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Main Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                )}
                <span className="font-medium">
                  {isComplete ? 'Analysis Complete' : 'Processing Queries'}
                </span>
              </div>
              <Badge variant="outline">
                {progress.currentQuery}/{progress.totalQueries}
              </Badge>
            </div>
            
            <Progress value={completionPercentage} className="h-2" />
            
            <div className="text-sm text-muted-foreground">
              {progress.stage}
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Entity Detections</div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{progress.entityDetections}</span>
                <Badge variant={detectionRate > 20 ? "default" : "secondary"} className="text-xs">
                  {Math.round(detectionRate)}%
                </Badge>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg. Confidence</div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{Math.round(progress.averageConfidence * 100)}%</span>
                <div className={`w-2 h-2 rounded-full ${
                  progress.averageConfidence >= 0.8 ? 'bg-green-500' :
                  progress.averageConfidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Processing Time
              </div>
              <div className="font-medium text-sm">
                {formatTime(progress.processingTime)}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {!isComplete && progress.entityDetections === 0 && progress.currentQuery > 5 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                No entity mentions detected yet. Consider checking entity aliases.
              </span>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Analysis completed successfully! View detailed results below.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};