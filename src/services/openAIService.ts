import { supabase } from '@/integrations/supabase/client';

interface MotivationParams {
  tonnage: number;
  sets: number;
  reps: number;
  deltaPct: number;
  period: string;
  periodType: string;
  locale: string;
}

class OpenAIService {
  async generateMotivationForPeriod(params: MotivationParams): Promise<string> {
    const { data, error } = await supabase.functions.invoke('openai-motivation', {
      body: params,
    });

    if (error) {
      console.error('Failed to generate motivation', error);
      return 'Keep pushing! You\'re doing great 💪';
    }

    return data?.text ?? 'Keep pushing! You\'re doing great 💪';
  }
}

export const openAIService = new OpenAIService();
export type { MotivationParams };
