
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cppStrategyService } from '@/services/cpp-strategy.service';
import { CppStrategyData } from '@/types/cpp';
import { SecurityContext } from '@/types/security';
import { DataImporter } from '@/components/shared/DataImporter';
import { Target } from 'lucide-react';

interface CppImporterProps {
  onStrategySuccess: (data: CppStrategyData, organizationId: string) => void;
}

export const CppImporter: React.FC<CppImporterProps> = ({ onStrategySuccess }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [securityContext, setSecurityContext] = useState<SecurityContext | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSecurityContext = async () => {
      try {
        console.log('🔍 [CPP-SECURITY] Fetching user security context...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (profile?.organization_id) {
            setOrganizationId(profile.organization_id);
            setSecurityContext({
              organizationId: profile.organization_id,
              userId: user.id,
              timestamp: new Date()
            });
            console.log('✅ [CPP-SECURITY] Security context established:', profile.organization_id);
          } else {
            console.warn('⚠️ [CPP-SECURITY] User has no organization_id.');
            toast({
              title: 'Organization Not Found',
              description: 'Your user account is not associated with an organization. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          console.warn('⚠️ [CPP-SECURITY] User not authenticated.');
          toast({
            title: 'Authentication Error',
            description: 'You must be logged in to analyze apps for CPP strategy.',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        console.error("❌ [CPP-SECURITY] Error fetching security context:", err);
        toast({ title: 'Could not load your user profile. Please try again.', variant: 'destructive' });
      }
    };
    fetchSecurityContext();
  }, [toast]);

  const handleAnalyze = async (searchInput: string) => {
    if (!organizationId || !securityContext) {
      toast({
        title: 'Security context missing.',
        description: 'Could not perform the analysis without proper security context. Please refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);
    console.log('🚀 [CPP-IMPORT] Starting secure CPP analysis for:', searchInput);

    try {
      // Simple validation - accept any non-empty string
      const trimmedInput = searchInput.trim();
      if (!trimmedInput) {
        toast({
          title: 'Input Required',
          description: 'Please enter a keyword or App Store URL',
          variant: 'destructive',
        });
        return;
      }

      const strategyData = await cppStrategyService.generateCppStrategy(searchInput, {
        organizationId,
        includeScreenshotAnalysis: true,
        generateThemes: true,
        includeCompetitorAnalysis: true,
        debugMode: process.env.NODE_ENV === 'development'
      }, securityContext);

      const themeCount = strategyData.suggestedThemes.length;
      const appName = strategyData.originalApp.name;

      toast({
        title: 'CPP Strategy Generated!',
        description: `Found ${themeCount} theme ${themeCount === 1 ? 'opportunity' : 'opportunities'} for ${appName}.`,
      });

      onStrategySuccess(strategyData, organizationId);

    } catch (error: any) {
      console.error('❌ [CPP-IMPORT] Analysis failed:', error);
      
      let errorMessage = 'An unknown error occurred while analyzing the app for CPP strategy.';
      
      if (error.message.includes('Rate limit exceeded')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message.includes('URL validation failed')) {
        errorMessage = 'Invalid App Store URL. Please check the URL format.';
      } else if (error.message.includes('Organization access denied')) {
        errorMessage = 'You do not have permission to perform this analysis.';
      } else if (error.message.includes('service unavailable')) {
        errorMessage = 'Analysis service is temporarily unavailable. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <DataImporter
        title="Analyze Market for CPP Strategy"
        description="Enter any keyword (e.g., 'pimsleur', 'duolingo') or App Store URL to generate Custom Product Page themes and competitive insights."
        placeholder="e.g., 'pimsleur', 'fitness apps', or https://apps.apple.com/..."
        onImport={handleAnalyze}
        isLoading={isAnalyzing || !organizationId || !securityContext}
        icon={<Target className="w-4 h-4 ml-2" />}
      />
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-zinc-800/50 p-3 rounded text-xs text-zinc-300">
          <div>Organization ID: {organizationId || 'Not loaded'}</div>
          <div>Security Context: {securityContext ? 'Established' : 'Not loaded'}</div>
          <div>CPP Debug Mode: Active</div>
          <div>Features: Screenshot Analysis + Theme Generation + Competitor Insights</div>
          <div>Security: Rate Limiting + Audit Logging + Input Validation</div>
        </div>
      )}
    </div>
  );
};
