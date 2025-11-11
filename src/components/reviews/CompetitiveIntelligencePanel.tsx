import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target, AlertTriangle, Shield, TrendingUp,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompetitiveIntelligence, FeatureGap, CompetitiveOpportunity, CompetitiveStrength, CompetitiveThreat } from '@/services/competitor-review-intelligence.service';

interface CompetitiveIntelligencePanelProps {
  intelligence: CompetitiveIntelligence;
}

export const CompetitiveIntelligencePanel: React.FC<CompetitiveIntelligencePanelProps> = ({
  intelligence
}) => {
  const [activeTab, setActiveTab] = useState('gaps');

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-10 blur-3xl bg-gradient-to-br from-orange-500 to-red-600" />

      <div className="relative p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold uppercase tracking-wide">
              Competitive Intelligence
            </h3>
            <p className="text-xs text-muted-foreground/80">
              Actionable insights from competitor review analysis
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Gaps ({intelligence.featureGaps.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Opportunities ({intelligence.opportunities.length})
            </TabsTrigger>
            <TabsTrigger value="strengths" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Strengths ({intelligence.strengths.length})
            </TabsTrigger>
            <TabsTrigger value="threats" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Threats ({intelligence.threats.length})
            </TabsTrigger>
          </TabsList>

          {/* Feature Gaps Tab */}
          <TabsContent value="gaps" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Features your competitors have that you don't - ranked by user demand
            </div>

            {intelligence.featureGaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                🎉 No feature gaps found - you're feature-complete!
              </div>
            ) : (
              intelligence.featureGaps.map((gap, idx) => (
                <FeatureGapCard key={idx} gap={gap} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Competitor weaknesses you can exploit in marketing and positioning
            </div>

            {intelligence.opportunities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No major opportunities identified
              </div>
            ) : (
              intelligence.opportunities.map((opp, idx) => (
                <OpportunityCard key={idx} opportunity={opp} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          {/* Strengths Tab */}
          <TabsContent value="strengths" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Areas where you outperform competitors - leverage these in messaging
            </div>

            {intelligence.strengths.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clear strengths identified yet - need more data
              </div>
            ) : (
              intelligence.strengths.map((strength, idx) => (
                <StrengthCard key={idx} strength={strength} rank={idx + 1} />
              ))
            )}
          </TabsContent>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-3">
            <div className="text-sm text-muted-foreground mb-4">
              Popular competitor features you're missing - consider adding
            </div>

            {intelligence.threats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ✅ No immediate threats detected
              </div>
            ) : (
              intelligence.threats.map((threat, idx) => (
                <ThreatCard key={idx} threat={threat} rank={idx + 1} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

// Individual card components for each insight type

const FeatureGapCard: React.FC<{ gap: FeatureGap; rank: number }> = ({ gap, rank }) => {
  const [expanded, setExpanded] = useState(false);

  const demandColor = {
    high: 'text-destructive bg-destructive/10 border-destructive/30',
    medium: 'text-warning bg-warning/10 border-warning/30',
    low: 'text-warning/70 bg-warning/10 border-warning/30'
  };

  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{gap.feature}</h4>
            <Badge className={cn("text-xs", demandColor[gap.userDemand])}>
              {gap.userDemand.toUpperCase()} DEMAND
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mentioned in {gap.mentionedInCompetitors.length} competitor{gap.mentionedInCompetitors.length > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{gap.frequency} total mentions</span>
            <span>•</span>
            <span>Sentiment: {(gap.competitorSentiment * 100).toFixed(0)}%</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {gap.mentionedInCompetitors.map((comp: string) => (
              <Badge key={comp} variant="secondary" className="text-xs">
                {comp}
              </Badge>
            ))}
          </div>

          {expanded && gap.examples.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Example Reviews:
              </div>
              {gap.examples.map((example: string, idx: number) => (
                <div key={idx} className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
                  "{example}"
                </div>
              ))}
            </div>
          )}
        </div>

        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </Card>
  );
};

const OpportunityCard: React.FC<{ opportunity: CompetitiveOpportunity; rank: number }> = ({ opportunity, rank }) => {
  const exploitColor = {
    high: 'text-success bg-success/10 border-success/30',
    medium: 'text-accent bg-accent/10 border-accent/30',
    low: 'text-text-tertiary bg-muted/10 border-muted/30'
  };

  return (
    <Card className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{opportunity.description}</h4>
            <Badge className={cn("text-xs", exploitColor[opportunity.exploitability])}>
              {opportunity.exploitability.toUpperCase()}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{opportunity.competitor}</span> has {opportunity.frequency} complaints
            {opportunity.sentiment < -0.5 && ' (very negative)'}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
            <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
              💡 Recommendation:
            </div>
            <div className="text-sm">{opportunity.recommendation}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const StrengthCard: React.FC<{ strength: CompetitiveStrength; rank: number }> = ({ strength, rank }) => {
  return (
    <Card className="p-4 bg-success/5 border-success/20 hover:bg-success/10 transition-colors">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold bg-success/10 border-success/30">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base capitalize">{strength.aspect}</h4>
            <Badge className="text-xs bg-success text-white border-success/30">
              +{(strength.difference * 100).toFixed(0)}% BETTER
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Your Score:</span>
              <span className="font-medium ml-2">{(strength.yourSentiment * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Competitors Avg:</span>
              <span className="font-medium ml-2">{(strength.competitorAvgSentiment * 100).toFixed(0)}%</span>
            </div>
            <Badge variant="outline" className="text-xs ml-auto">
              {strength.confidence.toUpperCase()} CONFIDENCE
            </Badge>
          </div>

          {strength.evidence.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Evidence from your reviews:
              </div>
              {strength.evidence.map((evidence: string, idx: number) => (
                <div key={idx} className="text-sm italic text-muted-foreground border-l-2 border-success/30 pl-3">
                  "{evidence}"
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const ThreatCard: React.FC<{ threat: CompetitiveThreat; rank: number }> = ({ threat, rank }) => {
  return (
    <Card className="p-4 bg-warning/5 border-warning/20 hover:bg-warning/10 transition-colors">
      <div className="flex items-start gap-3">
        <Badge variant="outline" className="text-xs font-bold bg-warning/10 border-warning/30">#{rank}</Badge>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{threat.feature}</h4>
            <Badge className="text-xs bg-warning text-white border-warning/30">
              {(threat.userDemand * 100).toFixed(0)}% DEMAND
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{threat.competitor}</span> users love this feature
            <span className="mx-2">•</span>
            <span>Sentiment: {(threat.sentiment * 100).toFixed(0)}%</span>
            <span className="mx-2">•</span>
            <span className="capitalize">{threat.momentum}</span>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-2">
            <div className="text-xs font-medium text-warning uppercase tracking-wide mb-1">
              ⚠️ Recommendation:
            </div>
            <div className="text-sm">{threat.recommendation}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
