import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Target } from 'lucide-react';

interface CompactCompetitorSummaryProps {
  competitorScore: number;
  competitorCount: number;
  sharedKeywordsCount: number;
  uniqueOpportunitiesCount: number;
  marketPosition?: string;
}

export const CompactCompetitorSummary: React.FC<CompactCompetitorSummaryProps> = ({
  competitorScore,
  competitorCount,
  sharedKeywordsCount,
  uniqueOpportunitiesCount,
  marketPosition
}) => {
  const scoreColor =
    competitorScore >= 70 ? 'text-green-400' :
    competitorScore >= 50 ? 'text-blue-400' :
    competitorScore >= 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-400" />
              <span className="text-sm text-zinc-400">Competitive Position</span>
            </div>
            <span className={`text-3xl font-bold ${scoreColor}`}>{competitorScore}/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <p className="text-xs text-zinc-400">Competitors</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{competitorCount}</p>
            <p className="text-xs text-zinc-500">Tracked</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="h-4 w-4 text-yellow-400" />
              <p className="text-xs text-zinc-400">Shared</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{sharedKeywordsCount}</p>
            <p className="text-xs text-zinc-500">Keywords</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <p className="text-xs text-zinc-400">Opportunities</p>
            </div>
            <p className="text-2xl font-bold text-green-400">{uniqueOpportunitiesCount}</p>
            <p className="text-xs text-zinc-500">Unique</p>
          </CardContent>
        </Card>
      </div>

      {/* Market Position */}
      {marketPosition && (
        <Card className="bg-gradient-to-r from-purple-500/5 to-transparent border-l-4 border-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">
              Market Position
            </p>
            <p className="text-sm text-zinc-300 leading-relaxed">{marketPosition}</p>
          </CardContent>
        </Card>
      )}

      {/* Competitive Insights */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">
            Competitive Insights
          </p>
          <ul className="space-y-1 text-xs text-zinc-300">
            <li>• {competitorCount > 0 ? `Monitoring ${competitorCount} direct competitors` : 'No competitors currently tracked - add competitors for better insights'}</li>
            <li>• {sharedKeywordsCount > 0 ? `${sharedKeywordsCount} keywords overlap with competitors` : 'Limited keyword overlap detected'}</li>
            <li>• {uniqueOpportunitiesCount > 0 ? `${uniqueOpportunitiesCount} untapped keyword opportunities identified` : 'Expand keyword research to find new opportunities'}</li>
            <li>• {competitorScore >= 60 ? 'Strong competitive positioning' : 'Room for improvement in competitive strategy'}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
