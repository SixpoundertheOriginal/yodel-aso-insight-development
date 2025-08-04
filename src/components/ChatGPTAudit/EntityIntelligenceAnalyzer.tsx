import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, Target, Users, Trophy, Zap, AlertCircle, Building, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface EntityData {
  entityName: string;
  context?: string;
  websiteData?: any;
  searchData?: any;
  // Enhanced audit context for competitive research
  auditContext?: {
    industry: string;
    topic: string;
    target_audience: string;
    known_competitors: string[];
    geographic_focus?: string;
    queryStrategy?: 'competitive_discovery' | 'market_research' | 'mixed';
  };
}

interface EnhancedEntityIntelligence {
  entityName: string;
  website?: string;
  description: string;
  specific_category: string;
  target_personas: Array<{
    name: string;
    demographics: string;
    goals: string[];
    typical_queries: string[];
  }>;
  services: string[];
  targetClients: string[];
  authentic_use_cases: string[];
  pain_points_solved: string[];
  competitors: Array<{
    name: string;
    positioning: string;
    weakness?: string;
  }>;
  marketPosition: string;
  industryFocus: string[];
  recentNews: string[];
  user_language: string[];
  confidence_score: number;
  scrapedAt: string;
}

interface EntityIntelligenceAnalyzerProps {
  entityData: EntityData;
  onIntelligenceGenerated: (intelligence: EnhancedEntityIntelligence) => void;
  onAnalysisComplete: () => void;
}

export const EntityIntelligenceAnalyzer: React.FC<EntityIntelligenceAnalyzerProps> = ({
  entityData,
  onIntelligenceGenerated,
  onAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelligence, setIntelligence] = useState<EnhancedEntityIntelligence | null>(null);
  const [analysisStep, setAnalysisStep] = useState('');

  const analyzeEntityIntelligence = async (): Promise<void> => {
    if (!entityData) return;

    setIsAnalyzing(true);
    setAnalysisStep("Analyzing entity intelligence with AI...");

    try {
      const enhancedAnalysis = await enhanceWithAI();
      
      if (enhancedAnalysis) {
        setIntelligence(enhancedAnalysis);
        onIntelligenceGenerated(enhancedAnalysis);
        setAnalysisStep("Analysis complete");
        return;
      }
      
      throw new Error("Enhanced analysis failed");
    } catch (error) {
      console.error('Error analyzing entity intelligence:', error);
      // Create minimal fallback if absolutely needed
      const fallback: EnhancedEntityIntelligence = {
        entityName: entityData.entityName,
        description: `Unable to analyze ${entityData.entityName}. Please try again.`,
        specific_category: 'unknown',
        target_personas: [],
        services: [],
        targetClients: [],
        authentic_use_cases: [],
        pain_points_solved: [],
        competitors: [],
        marketPosition: 'unknown',
        industryFocus: [],
        recentNews: [],
        user_language: [entityData.entityName],
        confidence_score: 0.1,
        scrapedAt: new Date().toISOString()
      };

      setIntelligence(fallback);
      onIntelligenceGenerated(fallback);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
      onAnalysisComplete();
    }
  };


  const enhanceWithAI = async (): Promise<EnhancedEntityIntelligence | null> => {
    if (!entityData) return null;

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-entity-intelligence', {
        body: { 
          entityData: entityData
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        return data.data;
      }

      return null;
    } catch (error) {
      console.error('AI analysis error:', error);
      return null;
    }
  };

  useEffect(() => {
    if (entityData && !intelligence) {
      analyzeEntityIntelligence();
    }
  }, [entityData, intelligence]);

  if (!intelligence) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Entity Intelligence Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{analysisStep}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Entity Intelligence Analysis
          </div>
          <Badge variant={intelligence.confidence_score > 0.7 ? 'default' : 'secondary'}>
            {Math.round(intelligence.confidence_score * 100)}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {intelligence.confidence_score < 0.5 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Low confidence analysis. Results may be generic. Consider providing more entity context.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Category & Position
              </h4>
              <Badge variant="outline" className="mr-2">{intelligence.specific_category}</Badge>
              <Badge variant="outline">{intelligence.marketPosition}</Badge>
            </div>

            {intelligence.website && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </h4>
                <a 
                  href={intelligence.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {intelligence.website}
                </a>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Services
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.services.slice(0, 6).map((service, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Clients
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.targetClients.slice(0, 4).map((client, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {client}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Industry Focus
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.industryFocus.slice(0, 4).map((industry, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Key Competitors
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.competitors.slice(0, 4).map((competitor, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {competitor.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Use Cases</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                {intelligence.authentic_use_cases.slice(0, 3).map((useCase, idx) => (
                  <div key={idx} className="truncate">• {useCase}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {intelligence.target_personas.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Target Personas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {intelligence.target_personas.slice(0, 4).map((persona, idx) => (
                <div key={idx} className="border rounded-lg p-3 text-xs">
                  <div className="font-medium">{persona.name}</div>
                  <div className="text-muted-foreground mt-1">{persona.demographics}</div>
                  {persona.goals.length > 0 && (
                    <div className="mt-2">
                      <span className="text-muted-foreground">Goals:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {persona.goals.slice(0, 2).map((goal, goalIdx) => (
                          <Badge key={goalIdx} variant="outline" className="text-xs">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="mb-2">{intelligence.description}</p>
          <p>Analysis completed: {new Date(intelligence.scrapedAt).toLocaleString()}</p>
        </div>

        <Button 
          onClick={onAnalysisComplete} 
          className="w-full"
          disabled={isAnalyzing}
        >
          Continue with Query Generation
        </Button>
      </CardContent>
    </Card>
  );
};