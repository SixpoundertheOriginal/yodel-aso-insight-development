import { useState, useCallback } from 'react';
import { 
  enhancedCompetitiveIntelligenceService, 
  CompetitorApp, 
  CompetitiveInsights,
  CompetitiveAnalysis 
} from '@/services/enhanced-competitive-intelligence.service';
import { useToast } from '@/hooks/use-toast';

interface UseCompetitiveAnalysisProps {
  organizationId: string;
}

interface CompetitiveAnalysisState {
  isAnalyzing: boolean;
  currentAnalysis: {
    analysisId: string;
    competitorApps: CompetitorApp[];
    insights: CompetitiveInsights;
    summary: string;
  } | null;
  recentAnalyses: CompetitiveAnalysis[];
  showDashboard: boolean;
}

export function useCompetitiveAnalysis({ organizationId }: UseCompetitiveAnalysisProps) {
  const [state, setState] = useState<CompetitiveAnalysisState>({
    isAnalyzing: false,
    currentAnalysis: null,
    recentAnalyses: [],
    showDashboard: false
  });
  const { toast } = useToast();

  const runAnalysis = useCallback(async (
    searchTerm: string,
    analysisType: 'brand' | 'keyword' | 'category',
    maxCompetitors: number = 10
  ) => {
    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const result = await enhancedCompetitiveIntelligenceService.analyzeCompetitors(
        searchTerm,
        analysisType,
        organizationId,
        maxCompetitors
      );

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentAnalysis: result,
        showDashboard: true
      }));

      toast({
        title: "Analysis Complete",
        description: `Analyzed ${result.competitorApps.length} competitors for "${searchTerm}"`,
      });

      // Refresh recent analyses
      loadRecentAnalyses();

      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isAnalyzing: false }));
      
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze competitors. Please try again.",
        variant: "destructive",
      });
      
      console.error('Competitive analysis failed:', error);
      throw error;
    }
  }, [organizationId, toast]);

  const loadRecentAnalyses = useCallback(async () => {
    try {
      const analyses = await enhancedCompetitiveIntelligenceService.getRecentAnalyses(organizationId, 10);
      setState(prev => ({ ...prev, recentAnalyses: analyses }));
    } catch (error) {
      console.error('Failed to load recent analyses:', error);
    }
  }, [organizationId]);

  const loadAnalysis = useCallback(async (analysisId: string) => {
    try {
      const [analysis, competitorApps] = await Promise.all([
        enhancedCompetitiveIntelligenceService.getAnalysis(analysisId),
        enhancedCompetitiveIntelligenceService.getCompetitorApps(analysisId)
      ]);

      if (analysis && competitorApps) {
        setState(prev => ({
          ...prev,
          currentAnalysis: {
            analysisId: analysis.id,
            competitorApps,
            insights: analysis.insights || {},
            summary: analysis.ai_summary || 'Competitive analysis completed.'
          },
          showDashboard: true
        }));
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load the analysis.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const searchAnalyses = useCallback(async (
    searchTerm?: string,
    analysisType?: string
  ) => {
    try {
      const analyses = await enhancedCompetitiveIntelligenceService.searchAnalyses(
        organizationId,
        searchTerm,
        analysisType
      );
      setState(prev => ({ ...prev, recentAnalyses: analyses }));
      return analyses;
    } catch (error) {
      console.error('Failed to search analyses:', error);
      return [];
    }
  }, [organizationId]);

  const closeDashboard = useCallback(() => {
    setState(prev => ({ ...prev, showDashboard: false }));
  }, []);

  const clearCurrentAnalysis = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      currentAnalysis: null, 
      showDashboard: false 
    }));
  }, []);

  return {
    // State
    isAnalyzing: state.isAnalyzing,
    currentAnalysis: state.currentAnalysis,
    recentAnalyses: state.recentAnalyses,
    showDashboard: state.showDashboard,

    // Actions
    runAnalysis,
    loadAnalysis,
    loadRecentAnalyses,
    searchAnalyses,
    closeDashboard,
    clearCurrentAnalysis,

    // Service access for direct use
    service: enhancedCompetitiveIntelligenceService
  };
}