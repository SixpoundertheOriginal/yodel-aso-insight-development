import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Zap, Clock } from 'lucide-react';

interface QuickDiscoveryPanelProps {
  onDiscover: (threshold: 10 | 30 | 50) => Promise<void>;
  discovering: boolean;
  discoveryProgress?: number;
  discoveredCount?: number;
  targetCount?: number;
}

export const QuickDiscoveryPanel: React.FC<QuickDiscoveryPanelProps> = ({
  onDiscover,
  discovering,
  discoveryProgress = 0,
  discoveredCount = 0,
  targetCount = 0
}) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Keyword Discovery
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically find keywords where your app ranks in top positions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top 10 */}
          <Button
            size="lg"
            variant="outline"
            onClick={() => onDiscover(10)}
            disabled={discovering}
            className="h-32 flex-col gap-3 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all"
          >
            <Trophy className="w-8 h-8 text-amber-500" />
            <div className="text-center">
              <div className="font-bold text-lg">Top 10</div>
              <div className="text-xs text-muted-foreground mt-1">Quick Scan</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                ~2 minutes
              </div>
            </div>
          </Button>

          {/* Top 30 */}
          <Button
            size="lg"
            variant="outline"
            onClick={() => onDiscover(30)}
            disabled={discovering}
            className="h-32 flex-col gap-3 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
          >
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <div className="text-center">
              <div className="font-bold text-lg">Top 30</div>
              <div className="text-xs text-muted-foreground mt-1">Standard Scan</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                ~5 minutes
              </div>
            </div>
          </Button>

          {/* Top 50 */}
          <Button
            size="lg"
            variant="default"
            onClick={() => onDiscover(50)}
            disabled={discovering}
            className="h-32 flex-col gap-3 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all"
          >
            <Zap className="w-8 h-8" />
            <div className="text-center">
              <div className="font-bold text-lg">Top 50</div>
              <div className="text-xs opacity-90 mt-1">Deep Scan</div>
              <div className="text-xs opacity-90 flex items-center justify-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                ~10 minutes
              </div>
            </div>
          </Button>
        </div>

        {/* How it Works */}
        <div className="bg-zinc-800/40 rounded-lg p-4 border border-zinc-700/50">
          <h4 className="text-sm font-medium mb-2">How Quick Discovery Works</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Extracts seed keywords from your app name and developer</li>
            <li>• Searches App Store for related keyword variations</li>
            <li>• Identifies keywords where your app ranks in top {targetCount || 10} positions</li>
            <li>• Returns verified rankings with actual position data</li>
          </ul>
        </div>

        {/* Progress Indicator */}
        {discovering && (
          <div className="space-y-3 bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Discovery in Progress...</span>
              <span className="text-muted-foreground">
                {discoveredCount} / ~{targetCount} keywords
              </span>
            </div>
            <Progress value={discoveryProgress} className="w-full h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Scanning App Store search results for top-ranking keywords
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
