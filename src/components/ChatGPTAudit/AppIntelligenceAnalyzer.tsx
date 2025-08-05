import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandedLoadingSpinner } from '@/components/ui/LoadingSkeleton';
import { Brain, Target, Users, Trophy, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface AppData {
  app_name: string;
  description: string;
  category: string;
  developer: string;
  bundle_id: string;
}

interface AppIntelligence {
  refined_category: string;
  learning_method?: string;
  target_audience: string[];
  competitors: string[];
  key_features: string[];
  use_cases: string[];
  market_position: string;
  confidence_score: number;
}

interface AppIntelligenceAnalyzerProps {
  appData: AppData;
  onIntelligenceGenerated: (intelligence: AppIntelligence) => void;
  onAnalysisComplete: () => void;
}

// Category-specific analysis rules
const CATEGORY_INTELLIGENCE_RULES = {
  'Education': {
    subcategories: ['language_learning', 'skill_development', 'academic', 'professional_training'],
    common_competitors: ['Duolingo', 'Khan Academy', 'Coursera', 'Udemy'],
    typical_audiences: ['students', 'professionals', 'lifelong_learners'],
    key_metrics: ['engagement_time', 'completion_rates', 'retention']
  },
  'Health & Fitness': {
    subcategories: ['meditation', 'workout', 'nutrition', 'sleep', 'mental_health'],
    common_competitors: ['Headspace', 'Calm', 'MyFitnessPal', 'Nike Training'],
    typical_audiences: ['fitness_enthusiasts', 'beginners', 'health_conscious'],
    key_metrics: ['daily_usage', 'goal_completion', 'health_outcomes']
  },
  'Productivity': {
    subcategories: ['task_management', 'note_taking', 'time_tracking', 'collaboration'],
    common_competitors: ['Notion', 'Todoist', 'Evernote', 'Slack'],
    typical_audiences: ['professionals', 'students', 'teams', 'entrepreneurs'],
    key_metrics: ['task_completion', 'collaboration_efficiency', 'time_savings']
  },
  'Finance': {
    subcategories: ['budgeting', 'investing', 'banking', 'crypto', 'expense_tracking'],
    common_competitors: ['Mint', 'YNAB', 'Robinhood', 'PayPal'],
    typical_audiences: ['young_professionals', 'investors', 'budget_conscious'],
    key_metrics: ['savings_goals', 'investment_returns', 'spending_insights']
  },
  'Entertainment': {
    subcategories: ['streaming', 'gaming', 'social', 'music', 'video'],
    common_competitors: ['Netflix', 'Spotify', 'TikTok', 'YouTube'],
    typical_audiences: ['gen_z', 'millennials', 'entertainment_seekers'],
    key_metrics: ['engagement_time', 'content_consumption', 'social_sharing']
  }
};

export const AppIntelligenceAnalyzer: React.FC<AppIntelligenceAnalyzerProps> = ({
  appData,
  onIntelligenceGenerated,
  onAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelligence, setIntelligence] = useState<AppIntelligence | null>(null);
  const [analysisStep, setAnalysisStep] = useState('');

  const analyzeAppIntelligence = async (): Promise<void> => {
    if (!appData) return;

    setIsAnalyzing(true);
    setAnalysisStep("Enhancing with AI analysis...");

    try {
      // Try AI enhancement first
      const enhancedAnalysis = await enhanceWithAI();
      
      if (enhancedAnalysis) {
        setIntelligence(enhancedAnalysis);
        onIntelligenceGenerated(enhancedAnalysis);
        setAnalysisStep("AI enhancement complete");
        return;
      }
    } catch (error) {
      console.warn('AI enhancement failed, using fallback analysis:', error);
    }

    // Fallback to rule-based analysis
    setAnalysisStep("Using rule-based analysis...");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisStep("Analyzing app category...");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisStep("Extracting target audience...");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisStep("Identifying competitors...");

      const generated: AppIntelligence = {
        refined_category: refineCategory(appData.app_name, appData.description, appData.category),
        target_audience: extractTargetAudience(appData.description, appData.category),
        competitors: identifyCompetitors(appData.app_name, appData.category, appData.description),
        key_features: extractKeyFeatures(appData.description),
        use_cases: extractUseCases(appData.description, appData.category),
        learning_method: extractLearningMethod(appData.description, appData.category),
        market_position: determineMarketPosition(appData.app_name, [], extractKeyFeatures(appData.description)),
        confidence_score: calculateConfidenceScore(appData.description)
      };

      setIntelligence(generated);
      onIntelligenceGenerated(generated);
    } catch (error) {
      console.error('Error analyzing app intelligence:', error);
      // Final fallback
      const fallback: AppIntelligence = {
        refined_category: appData.category,
        target_audience: ['general users'],
        competitors: [],
        key_features: ['mobile app'],
        use_cases: ['general use'],
        market_position: 'established',
        confidence_score: 0.3
      };
      setIntelligence(fallback);
      onIntelligenceGenerated(fallback);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const enhanceWithAI = async (): Promise<AppIntelligence | null> => {
    if (!appData) return null;

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-app-intelligence', {
        body: { appData }
      });

      if (error) throw error;

      if (data.success && data.data) {
        const enhanced = data.data;
        
        // Convert AI analysis to AppIntelligence format
        return {
          refined_category: enhanced.specific_category,
          target_audience: enhanced.target_personas.map((p: any) => p.name),
          competitors: enhanced.competitor_context.map((c: any) => c.name),
          key_features: enhanced.authentic_use_cases,
          use_cases: enhanced.authentic_use_cases,
          learning_method: enhanced.user_language.find((lang: string) => 
            lang.includes('learning') || lang.includes('method')
          ),
          market_position: enhanced.competitor_context.length > 3 ? 'competitive' : 'established',
          confidence_score: enhanced.confidence_score || 0.8
        };
      }

      return null;
    } catch (error) {
      console.error('AI enhancement error:', error);
      return null;
    }
  };

  const refineCategory = (name: string, description: string, category: string): string => {
    const nameAndDesc = `${name} ${description}`.toLowerCase();
    
    // Language learning detection
    if (nameAndDesc.includes('language') || nameAndDesc.includes('spanish') || nameAndDesc.includes('french') || 
        nameAndDesc.includes('english') || nameAndDesc.includes('pronunciation') || nameAndDesc.includes('vocabulary')) {
      return 'language_learning';
    }
    
    // Meditation/mindfulness detection
    if (nameAndDesc.includes('meditation') || nameAndDesc.includes('mindfulness') || nameAndDesc.includes('calm') || 
        nameAndDesc.includes('breathe') || nameAndDesc.includes('stress') || nameAndDesc.includes('anxiety')) {
      return 'meditation';
    }
    
    // Fitness detection
    if (nameAndDesc.includes('workout') || nameAndDesc.includes('fitness') || nameAndDesc.includes('exercise') || 
        nameAndDesc.includes('training') || nameAndDesc.includes('gym')) {
      return 'fitness';
    }
    
    // Productivity detection
    if (nameAndDesc.includes('task') || nameAndDesc.includes('productivity') || nameAndDesc.includes('note') || 
        nameAndDesc.includes('organize') || nameAndDesc.includes('schedule')) {
      return 'productivity';
    }
    
    // Finance detection
    if (nameAndDesc.includes('budget') || nameAndDesc.includes('money') || nameAndDesc.includes('bank') || 
        nameAndDesc.includes('invest') || nameAndDesc.includes('expense')) {
      return 'finance';
    }
    
    return category?.toLowerCase() || 'general';
  };

  const extractTargetAudience = (description: string, category: string): string[] => {
    const audiences: string[] = [];
    const desc = description.toLowerCase();
    
    // Category-specific audiences
    if (category === 'language_learning') {
      if (desc.includes('beginner') || desc.includes('start')) audiences.push('beginners');
      if (desc.includes('business') || desc.includes('professional')) audiences.push('business_professionals');
      if (desc.includes('travel') || desc.includes('vacation')) audiences.push('travelers');
      if (desc.includes('commute') || desc.includes('busy')) audiences.push('busy_professionals');
    } else if (category === 'meditation') {
      if (desc.includes('beginner')) audiences.push('meditation_beginners');
      if (desc.includes('stress') || desc.includes('anxiety')) audiences.push('stress_relief_seekers');
      if (desc.includes('sleep')) audiences.push('better_sleep_seekers');
    } else if (category === 'fitness') {
      if (desc.includes('beginner')) audiences.push('fitness_beginners');
      if (desc.includes('home')) audiences.push('home_workout_enthusiasts');
      if (desc.includes('gym')) audiences.push('gym_goers');
    }
    
    // General audience detection
    if (desc.includes('student')) audiences.push('students');
    if (desc.includes('parent')) audiences.push('parents');
    if (desc.includes('teen') || desc.includes('young')) audiences.push('young_adults');
    if (desc.includes('senior') || desc.includes('older')) audiences.push('seniors');
    
    return audiences.length > 0 ? audiences : ['general_users'];
  };

  const identifyCompetitors = (appName: string, category: string, description: string): string[] => {
    const competitors: string[] = [];
    
    // Category-specific competitor mapping
    const categoryCompetitors: Record<string, string[]> = {
      'language_learning': ['Duolingo', 'Babbel', 'Rosetta Stone', 'Busuu', 'Memrise'],
      'meditation': ['Headspace', 'Calm', 'Insight Timer', 'Ten Percent Happier', 'Waking Up'],
      'fitness': ['Nike Training Club', 'Adidas Training', 'Peloton', 'Fitbit Coach', 'MyFitnessPal'],
      'productivity': ['Notion', 'Todoist', 'Evernote', 'Trello', 'Asana'],
      'finance': ['Mint', 'YNAB', 'Personal Capital', 'Robinhood', 'Acorns']
    };
    
    const potentialCompetitors = categoryCompetitors[category] || [];
    
    // Add competitors that aren't the app itself
    potentialCompetitors.forEach(competitor => {
      if (competitor.toLowerCase() !== appName.toLowerCase()) {
        competitors.push(competitor);
      }
    });
    
    return competitors.slice(0, 4); // Limit to top 4 competitors
  };

  const extractKeyFeatures = (description: string): string[] => {
    const features: string[] = [];
    const desc = description.toLowerCase();
    
    // Feature detection patterns
    const featurePatterns = [
      { pattern: /audio|voice|speak/g, feature: 'audio_based' },
      { pattern: /track|progress|achievement/g, feature: 'progress_tracking' },
      { pattern: /personalized|custom|adapt/g, feature: 'personalization' },
      { pattern: /offline|download/g, feature: 'offline_access' },
      { pattern: /social|share|community/g, feature: 'social_features' },
      { pattern: /remind|notification|alert/g, feature: 'reminders' },
      { pattern: /lesson|course|curriculum/g, feature: 'structured_lessons' },
      { pattern: /game|fun|engaging/g, feature: 'gamification' }
    ];
    
    featurePatterns.forEach(({ pattern, feature }) => {
      if (pattern.test(desc)) {
        features.push(feature);
      }
    });
    
    return features.length > 0 ? features : ['mobile_app'];
  };

  const extractUseCases = (description: string, category: string): string[] => {
    const useCases: string[] = [];
    const desc = description.toLowerCase();
    
    // Category-specific use cases
    if (category === 'language_learning') {
      if (desc.includes('travel')) useCases.push('travel_preparation');
      if (desc.includes('business') || desc.includes('work')) useCases.push('business_communication');
      if (desc.includes('conversation')) useCases.push('conversational_fluency');
      if (desc.includes('beginner')) useCases.push('language_basics');
    } else if (category === 'meditation') {
      if (desc.includes('sleep')) useCases.push('better_sleep');
      if (desc.includes('stress')) useCases.push('stress_reduction');
      if (desc.includes('focus')) useCases.push('improved_focus');
      if (desc.includes('anxiety')) useCases.push('anxiety_management');
    }
    
    return useCases.length > 0 ? useCases : ['general_use'];
  };

  const extractLearningMethod = (description: string, category: string): string | undefined => {
    if (category !== 'language_learning') return undefined;
    
    const desc = description.toLowerCase();
    if (desc.includes('audio') || desc.includes('listen') || desc.includes('hear')) return 'audio_based';
    if (desc.includes('visual') || desc.includes('image') || desc.includes('picture')) return 'visual_based';
    if (desc.includes('conversation') || desc.includes('speak') || desc.includes('talk')) return 'conversation_based';
    if (desc.includes('game') || desc.includes('fun') || desc.includes('play')) return 'gamified';
    
    return 'mixed_approach';
  };

  const determineMarketPosition = (appName: string, competitors: string[], features: string[]): string => {
    if (competitors.length === 0) return 'niche_player';
    if (features.includes('audio_based')) return 'audio_specialist';
    if (features.includes('gamification')) return 'gamified_approach';
    if (features.includes('personalization')) return 'personalized_solution';
    return 'mainstream_competitor';
  };

  const calculateConfidenceScore = (description: string): number => {
    let score = 0.5; // Base score
    
    // Increase confidence based on description richness
    if (description.length > 100) score += 0.2;
    if (description.length > 300) score += 0.1;
    
    // Decrease if description is too generic
    if (description.toLowerCase().includes('mobile app')) score -= 0.1;
    if (description.toLowerCase().includes('great app')) score -= 0.1;
    
    return Math.max(0.3, Math.min(0.95, score));
  };

  useEffect(() => {
    if (appData) {
      analyzeAppIntelligence();
    }
  }, [appData]);

  if (!intelligence) {
    return <BrandedLoadingSpinner message="App Intelligence Analysis" description={analysisStep} />;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            App Intelligence Analysis
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
              Low confidence analysis. Results may be generic. Consider adding more app description details.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Category & Method
              </h4>
              <Badge variant="outline" className="mr-2">{intelligence.refined_category}</Badge>
              {intelligence.learning_method && (
                <Badge variant="outline">{intelligence.learning_method}</Badge>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Audience
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.target_audience.map((audience, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {audience.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Key Features
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.key_features.map((feature, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {feature.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Main Competitors
              </h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.competitors.length > 0 ? (
                  intelligence.competitors.map((competitor, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      {competitor}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No competitors identified</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Use Cases</h4>
              <div className="flex flex-wrap gap-1">
                {intelligence.use_cases.map((useCase, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {useCase.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Market Position</h4>
              <Badge variant="outline">{intelligence.market_position.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={onAnalysisComplete} className="w-full">
            Generate Smart Queries
            <Brain className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};