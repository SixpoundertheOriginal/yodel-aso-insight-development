
import { useState } from 'react';
import { useAsoAiHub } from '@/context/AsoAiHubContext';
import { supabase } from '@/integrations/supabase/client';

export const useCopilotChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { addMessage } = useAsoAiHub();

  const sendMessage = async (content: string, copilotId: string): Promise<string | null> => {
    setIsLoading(true);
    
    try {
      // Add user message immediately
      addMessage(content, 'user');

      // Send to edge function with copilot context
      const { data, error } = await supabase.functions.invoke('aso-chat', {
        body: { 
          message: content,
          copilotType: copilotId,
          context: 'aso-ai-hub'
        }
      });

      if (error) {
        console.error('Copilot chat error:', error);
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
        return null;
      }

      const responseMessage = data.response || 'I apologize, but I did not receive a proper response. Please try again.';
      // Add assistant response
      addMessage(responseMessage, 'assistant');
      return responseMessage;
      
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Sorry, there was a technical issue. Please try again.', 'assistant');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading
  };
};
