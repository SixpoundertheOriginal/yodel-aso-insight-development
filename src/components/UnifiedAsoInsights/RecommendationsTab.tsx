
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnifiedAso } from '@/context/UnifiedAsoContext';

export const RecommendationsTab: React.FC = () => {
  const { analysis } = useUnifiedAso();
  const recommendations = analysis.auditData?.recommendations || [];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Priority Recommendations</CardTitle>
        <CardDescription>
          AI-powered optimization suggestions based on comprehensive analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.map((rec, index) => (
          <div key={index} className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg mb-3">
            <Badge className={`mt-1 ${
              rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
              rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
              'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {rec.priority}
            </Badge>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">{rec.title}</h4>
                <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                  {rec.category}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mt-1">{rec.description}</p>
              {'impact' in rec && (
                <div className="mt-2">
                  <div className="text-xs text-zinc-500">Expected Impact: {rec.impact}%</div>
                  <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-yodel-orange h-1.5 rounded-full" 
                      style={{ width: `${rec.impact}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
