import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Award, 
  ArrowUp, 
  ArrowDown,
  Zap,
  Eye,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  enhancedCompetitorIntelligenceService, 
  type CompetitorIntelligenceReport,
  type CompetitorApp,
  type KeywordOpportunity 
} from '@/services/enhanced-competitor-intelligence.service';

interface CompetitorIntelligencePanelProps {
  organizationId: string;
  targetAppId?: string;
}

export const CompetitorIntelligencePanel: React.FC<CompetitorIntelligencePanelProps> = ({
  organizationId,
  targetAppId
}) => {
  const [report, setReport] = useState<CompetitorIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'competitors' | 'opportunities'>('overview');

  useEffect(() => {
    if (targetAppId && organizationId) {
      loadIntelligenceReport();
    }
  }, [targetAppId, organizationId]);

  const loadIntelligenceReport = async () => {
    if (!targetAppId) return;

    setIsLoading(true);
    try {
      console.log('📊 Loading competitor intelligence for app:', targetAppId);
      const intelligenceReport = await enhancedCompetitorIntelligenceService.getCompetitorIntelligenceReport(
        organizationId,
        targetAppId
      );
      setReport(intelligenceReport);
      toast.success('Competitor intelligence loaded');
    } catch (error) {
      console.error('Failed to load competitor intelligence:', error);
      toast.error('Failed to load competitor intelligence');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 animate-pulse" />
            <span>Analyzing competitive landscape...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report && targetAppId) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Competitor Intelligence</h3>
          <p className="text-muted-foreground mb-4">
            Analyze your competitors' keyword strategies and discover opportunities
          </p>
          <Button onClick={loadIntelligenceReport}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Intelligence Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!targetAppId) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select App for Analysis</h3>
          <p className="text-muted-foreground">
            Choose a target app to analyze competitive intelligence
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Market Analysis Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Market Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{report.marketAnalysis.totalKeywords}</div>
              <div className="text-sm text-muted-foreground">Total Keywords</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{report.competitors.length}</div>
              <div className="text-sm text-muted-foreground">Competitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{report.marketAnalysis.marketCoverage}%</div>
              <div className="text-sm text-muted-foreground">Market Coverage</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                report.marketAnalysis.competitionIntensity === 'high' ? 'text-red-500' :
                report.marketAnalysis.competitionIntensity === 'medium' ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {report.marketAnalysis.competitionIntensity.toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">Competition Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Opportunities Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Opportunities</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedView('opportunities')}
            >
              View All
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {report.opportunities.slice(0, 3).map((opportunity, index) => (
              <div key={opportunity.keyword} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">{opportunity.keyword}</div>
                  <div className="text-sm text-muted-foreground">
                    Competitor ranking: #{opportunity.bestCompetitorRank} • 
                    Volume: {opportunity.searchVolume.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    opportunity.opportunityType === 'quick_win' ? 'default' :
                    opportunity.opportunityType === 'high_potential' ? 'secondary' : 'outline'
                  }>
                    {opportunity.opportunityType.replace('_', ' ')}
                  </Badge>
                  <div className="text-lg font-bold text-green-500">
                    +{opportunity.potentialGain}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCompetitors = () => (
    <div className="space-y-4">
      {report.competitors.map((competitor, index) => (
        <Card key={competitor.appId}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">{competitor.name}</h4>
                <p className="text-sm text-muted-foreground">{competitor.developer}</p>
              </div>
              <Badge variant="outline">#{index + 1}</Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Keywords</div>
                <div className="font-medium">{competitor.keywordCount || 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Rank</div>
                <div className="font-medium">#{competitor.averageRank || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Market Share</div>
                <div className="font-medium">{competitor.marketShare || 0}%</div>
              </div>
            </div>

            {competitor.marketShare && (
              <div className="mt-3">
                <Progress value={competitor.marketShare} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderOpportunities = () => (
    <div className="space-y-4">
      {report.opportunities.map((opportunity) => (
        <Card key={opportunity.keyword}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold">{opportunity.keyword}</h4>
                <p className="text-sm text-muted-foreground">
                  {opportunity.competitors.slice(0, 2).join(', ')}
                  {opportunity.competitors.length > 2 && ` +${opportunity.competitors.length - 2} more`}
                </p>
              </div>
              <Badge variant={
                opportunity.opportunityType === 'quick_win' ? 'default' :
                opportunity.opportunityType === 'high_potential' ? 'secondary' : 'outline'
              }>
                {opportunity.opportunityType.replace('_', ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Current Rank</div>
                <div className="font-medium">
                  {opportunity.currentRank ? `#${opportunity.currentRank}` : 'Not ranking'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Best Competitor</div>
                <div className="font-medium">#{opportunity.bestCompetitorRank}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Potential Gain</div>
                <div className="font-medium text-green-500 flex items-center">
                  <ArrowUp className="w-4 h-4 mr-1" />
                  +{opportunity.potentialGain}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Search Volume</div>
                <div className="font-medium">{opportunity.searchVolume.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Difficulty Score</div>
                <Progress value={opportunity.difficultyScore * 10} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">
                {opportunity.difficultyScore.toFixed(1)}/10
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Competitor Intelligence</h2>
            <Button variant="outline" size="sm" onClick={loadIntelligenceReport}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedView === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('overview')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={selectedView === 'competitors' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('competitors')}
            >
              <Users className="w-4 h-4 mr-2" />
              Competitors ({report.competitors.length})
            </Button>
            <Button
              variant={selectedView === 'opportunities' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('opportunities')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Opportunities ({report.opportunities.length})
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'competitors' && renderCompetitors()}
      {selectedView === 'opportunities' && renderOpportunities()}
    </div>
  );
};