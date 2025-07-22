
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Clock, TrendingUp, Target } from 'lucide-react';

interface ContextPanelProps {
  userContext: any;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ userContext }) => {
  if (!userContext) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Context Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400 text-sm">Gathering your ASO data...</p>
        </CardContent>
      </Card>
    );
  }

  const { recentAudits, keywordData } = userContext;

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center space-x-2">
            <BarChart className="w-4 h-4" />
            <span>Your ASO Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recent Audits */}
          <div>
            <h4 className="text-xs font-medium text-zinc-300 mb-2 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Recent Audits</span>
            </h4>
            {recentAudits?.length > 0 ? (
              <div className="space-y-2">
                {recentAudits.slice(0, 3).map((audit: any, index: number) => (
                  <div key={index} className="p-2 bg-zinc-800 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-200 font-medium">{audit.app_name || 'App'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {audit.status}
                      </Badge>
                    </div>
                    <p className="text-zinc-400">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-xs">No recent audits</p>
            )}
          </div>

          {/* Keyword Data */}
          <div>
            <h4 className="text-xs font-medium text-zinc-300 mb-2 flex items-center space-x-1">
              <Target className="w-3 h-3" />
              <span>Keyword Performance</span>
            </h4>
            {keywordData?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-zinc-800 rounded text-center">
                    <div className="text-purple-400 font-semibold">{keywordData.length}</div>
                    <div className="text-zinc-400">Keywords</div>
                  </div>
                  <div className="p-2 bg-zinc-800 rounded text-center">
                    <div className="text-green-400 font-semibold">
                      {keywordData.filter((k: any) => k.rank_position <= 10).length}
                    </div>
                    <div className="text-zinc-400">Top 10</div>
                  </div>
                </div>
                
                {/* Top performing keywords */}
                <div className="space-y-1">
                  <h5 className="text-xs text-zinc-400">Top Keywords:</h5>
                  {keywordData
                    .filter((k: any) => k.rank_position <= 20)
                    .slice(0, 3)
                    .map((keyword: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <span className="text-zinc-200 truncate">{keyword.keyword}</span>
                        <Badge variant="outline" className="text-xs">
                          #{keyword.rank_position}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-xs">No keyword data available</p>
            )}
          </div>

          {/* Performance Trends */}
          <div>
            <h4 className="text-xs font-medium text-zinc-300 mb-2 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Quick Stats</span>
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-2 bg-zinc-800 rounded">
                <div className="text-zinc-400">Organization</div>
                <div className="text-zinc-200 font-medium">{userContext.organizationId?.slice(0, 8)}...</div>
              </div>
              <div className="p-2 bg-zinc-800 rounded">
                <div className="text-zinc-400">Last Update</div>
                <div className="text-zinc-200 font-medium">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
