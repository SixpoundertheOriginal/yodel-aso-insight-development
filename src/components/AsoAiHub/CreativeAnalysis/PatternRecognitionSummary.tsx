import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Lightbulb } from 'lucide-react';

interface PatternData {
  commonMessageTypes: Array<{ item: string; count: number; percentage: number }>;
  commonDesignPatterns: Array<{ item: string; count: number; percentage: number }>;
  commonLayoutTypes: Array<{ item: string; count: number; percentage: number }>;
  insights: string[];
}

interface PatternRecognitionSummaryProps {
  patterns: PatternData;
  keyword: string;
}

export const PatternRecognitionSummary: React.FC<PatternRecognitionSummaryProps> = ({
  patterns,
  keyword
}) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-100">
          <TrendingUp className="w-5 h-5" />
          Pattern Recognition for "{keyword}"
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Insights */}
        <div>
          <h4 className="flex items-center gap-2 font-medium text-zinc-200 mb-3">
            <Lightbulb className="w-4 h-4" />
            Key Insights
          </h4>
          <div className="space-y-2">
            {patterns.insights.map((insight, i) => (
              <div key={i} className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-sm text-zinc-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Message Types */}
          <div>
            <h4 className="flex items-center gap-2 font-medium text-zinc-200 mb-3">
              <BarChart3 className="w-4 h-4" />
              Message Types
            </h4>
            <div className="space-y-2">
              {patterns.commonMessageTypes.slice(0, 3).map((type, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                    {type.item.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-zinc-400">
                    {type.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Design Patterns */}
          <div>
            <h4 className="font-medium text-zinc-200 mb-3">Design Patterns</h4>
            <div className="space-y-2">
              {patterns.commonDesignPatterns.slice(0, 3).map((pattern, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                    {pattern.item}
                  </Badge>
                  <span className="text-sm text-zinc-400">
                    {pattern.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Types */}
          <div>
            <h4 className="font-medium text-zinc-200 mb-3">Layout Types</h4>
            <div className="space-y-2">
              {patterns.commonLayoutTypes.slice(0, 3).map((layout, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                    {layout.item}
                  </Badge>
                  <span className="text-sm text-zinc-400">
                    {layout.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};