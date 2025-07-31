import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, Users, TrendingUp } from 'lucide-react';

interface RankingDetail {
  position: number;
  query: string;
  totalEntities?: number;
  competitors?: string[];
}

interface RankingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  rankingDetails: RankingDetail[];
}

export const RankingDetailsModal: React.FC<RankingDetailsModalProps> = ({
  isOpen,
  onClose,
  entityName,
  rankingDetails
}) => {
  if (!rankingDetails.length) return null;

  const bestRanking = Math.min(...rankingDetails.map(r => r.position));
  const averageRanking = rankingDetails.reduce((sum, r) => sum + r.position, 0) / rankingDetails.length;
  const topThreeCount = rankingDetails.filter(r => r.position <= 3).length;
  
  // Get all unique competitors across all rankings
  const allCompetitors = Array.from(new Set(
    rankingDetails.flatMap(r => r.competitors || [])
  )).filter(comp => comp.toLowerCase() !== entityName.toLowerCase());

  // Calculate position distribution
  const positionDistribution = {
    top1: rankingDetails.filter(r => r.position === 1).length,
    top3: rankingDetails.filter(r => r.position <= 3).length,
    top5: rankingDetails.filter(r => r.position <= 5).length,
    top10: rankingDetails.filter(r => r.position <= 10).length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Competitive Landscape: {entityName}</span>
          </DialogTitle>
          <DialogDescription>
            Detailed ranking analysis across {rankingDetails.length} queries
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary flex items-center justify-center space-x-1">
                  <Medal className="h-5 w-5 text-yellow-500" />
                  <span>#{bestRanking}</span>
                </div>
                <div className="text-xs text-muted-foreground">Best Ranking</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">#{averageRanking.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Average Ranking</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary flex items-center justify-center space-x-1">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <span>{topThreeCount}</span>
                </div>
                <div className="text-xs text-muted-foreground">Top 3 Positions</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary flex items-center justify-center space-x-1">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>{allCompetitors.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">Unique Competitors</div>
              </CardContent>
            </Card>
          </div>

          {/* Position Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Position Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>#1 Position</span>
                    <span>{positionDistribution.top1}/{rankingDetails.length}</span>
                  </div>
                  <Progress value={(positionDistribution.top1 / rankingDetails.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Top 3</span>
                    <span>{positionDistribution.top3}/{rankingDetails.length}</span>
                  </div>
                  <Progress value={(positionDistribution.top3 / rankingDetails.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Top 5</span>
                    <span>{positionDistribution.top5}/{rankingDetails.length}</span>
                  </div>
                  <Progress value={(positionDistribution.top5 / rankingDetails.length) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Top 10</span>
                    <span>{positionDistribution.top10}/{rankingDetails.length}</span>
                  </div>
                  <Progress value={(positionDistribution.top10 / rankingDetails.length) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitive Landscape */}
          {allCompetitors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Key Competitors</span>
                  <Badge variant="outline">{allCompetitors.length} detected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allCompetitors.slice(0, 12).map((competitor, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {competitor}
                    </Badge>
                  ))}
                  {allCompetitors.length > 12 && (
                    <Badge variant="outline">+{allCompetitors.length - 12} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Rankings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Query-by-Query Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankingDetails.map((ranking, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={ranking.position <= 3 ? "default" : "secondary"}
                        className={ranking.position <= 3 ? "bg-yellow-500 text-yellow-50" : ""}
                      >
                        #{ranking.position}
                      </Badge>
                      {ranking.totalEntities && (
                        <span className="text-sm text-muted-foreground">
                          of {ranking.totalEntities} entities
                        </span>
                      )}
                    </div>
                    {ranking.position <= 3 && (
                      <Award className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  
                  <p className="text-sm font-medium mb-2">
                    "{ranking.query}"
                  </p>
                  
                  {ranking.competitors && ranking.competitors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Competitors mentioned:</p>
                      <div className="flex flex-wrap gap-1">
                        {ranking.competitors.map((competitor, compIndex) => (
                          <Badge key={compIndex} variant="outline" className="text-xs">
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};