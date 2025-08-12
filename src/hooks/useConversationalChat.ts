import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MetricsData, FilterContext } from '@/types/aso';

interface UseConversationalChatProps {
  organizationId: string;
  metricsData?: MetricsData;
  filterContext: FilterContext;
}

export const useConversationalChat = ({
  organizationId,
  metricsData,
  filterContext
}: UseConversationalChatProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChatResponse = async (userQuestion: string): Promise<string> => {
    if (!metricsData) {
      throw new Error('No dashboard data available');
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🔧 Generating chat response for:', userQuestion.substring(0, 50) + '...');

      const { data, error } = await supabase.functions.invoke('ai-insights-generator', {
        body: {
          organizationId,
          metricsData,
          filterContext,
          userQuestion // This triggers conversational mode
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate response');
      }

      return data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateChatResponse,
    isGenerating,
    error
  };
};

export default useConversationalChat;
