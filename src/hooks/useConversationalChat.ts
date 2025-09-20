import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DemoAIChatService } from '@/services/demoAIChatService';
import type { MetricsData, FilterContext } from '@/types/aso';

interface UseConversationalChatProps {
  organizationId: string;
  metricsData?: MetricsData;
  filterContext: FilterContext;
  isDemoMode?: boolean;
}

export const useConversationalChat = ({
  organizationId,
  metricsData,
  filterContext,
  isDemoMode = false
}: UseConversationalChatProps) => {
  // Ensure stable initialization with proper guards
  const [isGenerating, setIsGenerating] = useState(() => false);
  const [error, setError] = useState<string | null>(() => null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const generateChatResponse = async (userQuestion: string): Promise<string> => {
    // Utility: timeout wrapper to avoid indefinite hanging
    const withTimeout = async <T,>(promise: Promise<T>, ms = 25000): Promise<T> => {
      let timeoutId: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Response timed out')), ms);
      });
      try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result as T;
      } finally {
        clearTimeout(timeoutId);
      }
    };
    // Handle demo mode with local AI responses
    if (isDemoMode || metricsData?.meta?.isDemo) {
      setIsGenerating(true);
      setError(null);
      
      try {
        console.log('🎪 Generating demo chat response for:', userQuestion.substring(0, 50) + '...');
        
        // Simulate some processing time for realism
        await withTimeout(new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)), 5000);
        
        const response = await withTimeout(
          DemoAIChatService.generateDemoResponse(userQuestion, metricsData, filterContext),
          20000
        );
        
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate demo response';
        if (isMounted.current) {
          setError(errorMessage);
        }
        throw new Error(errorMessage);
      } finally {
        if (isMounted.current) {
          setIsGenerating(false);
        }
      }
    }

    // Production mode - original logic
    if (!metricsData) {
      throw new Error('No dashboard data available');
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🔧 Generating chat response for:', userQuestion.substring(0, 50) + '...');

      const { data, error } = await withTimeout(
        supabase.functions.invoke('ai-insights-generator', {
          body: {
            organizationId,
            metricsData,
            filterContext,
            userQuestion // This triggers conversational mode
          }
        }),
        25000
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate response');
      }

      return data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      if (isMounted.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  };

  return {
    generateChatResponse,
    isGenerating,
    error
  };
};

export default useConversationalChat;
