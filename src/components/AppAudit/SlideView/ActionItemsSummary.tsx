import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: 'metadata' | 'keywords' | 'competitors';
  impact: number;
}

interface ActionItemsSummaryProps {
  recommendations: ActionItem[];
}

export const ActionItemsSummary: React.FC<ActionItemsSummaryProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <p className="text-zinc-400 text-center">No action items available</p>
        </CardContent>
      </Card>
    );
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bgColor: 'bg-red-500/20',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/30',
          label: 'HIGH'
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-500/20',
          textColor: 'text-yellow-400',
          borderColor: 'border-yellow-500/30',
          label: 'MED'
        };
      default:
        return {
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          label: 'LOW'
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'metadata':
        return '📝';
      case 'keywords':
        return '🎯';
      case 'competitors':
        return '👥';
      default:
        return '⚡';
    }
  };

  // Show top 5 recommendations
  const topRecommendations = recommendations.slice(0, 5);

  return (
    <div className="space-y-3">
      {topRecommendations.map((rec, index) => {
        const priorityConfig = getPriorityConfig(rec.priority);

        return (
          <Card
            key={index}
            className={`bg-gradient-to-r from-${priorityConfig.textColor.split('-')[1]}-500/5 to-transparent border-l-4 ${priorityConfig.borderColor}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-0.5">
                    <Badge className={`${priorityConfig.bgColor} ${priorityConfig.textColor} ${priorityConfig.borderColor} text-xs font-bold`}>
                      {priorityConfig.label}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">{getCategoryIcon(rec.category)}</span>
                      <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{rec.description}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Impact</p>
                    <p className={`text-lg font-bold ${priorityConfig.textColor}`}>{rec.impact}%</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                <div
                  className={`bg-gradient-to-r from-${priorityConfig.textColor.split('-')[1]}-500 to-${priorityConfig.textColor.split('-')[1]}-400 h-1.5 rounded-full transition-all duration-300`}
                  style={{ width: `${rec.impact}%` }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-zinc-300">
                Showing {topRecommendations.length} of {recommendations.length} total recommendations
              </span>
            </div>
            {recommendations.length > 5 && (
              <span className="text-xs text-zinc-500 flex items-center space-x-1">
                <span>View all in Actions tab</span>
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
