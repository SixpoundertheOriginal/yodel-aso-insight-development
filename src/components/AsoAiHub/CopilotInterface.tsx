
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, RotateCcw } from 'lucide-react';
import { useAsoAiHub } from '@/context/AsoAiHubContext';
import { CopilotChatMessage } from './CopilotChatMessage';
import { MetadataCopilot } from './MetadataCopilot/MetadataCopilot';
import { GrowthGapCopilot } from './GrowthGapCopilot';
import { AsoKnowledgeEngine } from './AsoKnowledgeEngine';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const CopilotInterface: React.FC = () => {
  const { 
    activeCopilot, 
    currentSession, 
    setActiveCopilot, 
    clearSession, 
    copilots 
  } = useAsoAiHub();
  
  const [message, setMessage] = useState('');
  const { sendMessage, isLoading } = useCopilotChat();

  // Get organization ID for knowledge engine
  const { data: userContext } = useQuery({
    queryKey: ['user-context'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      return {
        organizationId: profile?.organization_id || null
      };
    },
  });

  const activeCopilotData = copilots.find(c => c.id === activeCopilot);

  if (!activeCopilot || !currentSession || !activeCopilotData) {
    return null;
  }

  const renderCopilot = () => {
    switch (activeCopilot) {
      case 'aso-knowledge-engine':
        return userContext?.organizationId ? (
          <AsoKnowledgeEngine organizationId={userContext.organizationId} />
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Authentication Required</h3>
            <p className="text-zinc-400">Please sign in to access the ASO Knowledge Engine</p>
          </div>
        );
      case 'metadata-copilot':
        return <MetadataCopilot />;
      case 'growth-gap-finder':
        return <GrowthGapCopilot />;
      default:
        return (
          <div className="flex-1 flex flex-col p-0">
            {/* Chat UI for other copilots */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentSession.messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">{activeCopilotData.icon}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Welcome to {activeCopilotData.name}
                  </h3>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    I'm here to help you with {activeCopilotData.description.toLowerCase()}. 
                    What would you like to work on today?
                  </p>
                </div>
              ) : (
                currentSession.messages.map((msg) => (
                  <CopilotChatMessage key={msg.id} message={msg} />
                ))
              )}
              
              {isLoading && (
                <div className="flex items-center space-x-2 text-zinc-400">
                  <div className="animate-spin w-4 h-4 border-2 border-yodel-orange border-t-transparent rounded-full" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800">
              <div className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask ${activeCopilotData.name} anything...`}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-foreground placeholder-zinc-400"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="bg-yodel-orange hover:bg-yodel-orange/90 text-foreground"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = message.trim();
    setMessage('');
    
    await sendMessage(userMessage, activeCopilot);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="bg-zinc-900/70 backdrop-blur-sm border-zinc-800 fixed inset-x-4 bottom-4 top-20 z-50 flex flex-col">
      <CardHeader className="pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{activeCopilotData.icon}</div>
            <div>
              <CardTitle className="text-lg text-foreground">
                {activeCopilotData.name}
              </CardTitle>
              <p className="text-sm text-zinc-400">
                {activeCopilotData.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSession}
              className="text-zinc-400 hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveCopilot(null)}
              className="text-zinc-400 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        {renderCopilot()}
      </CardContent>
    </Card>
  );
};
