
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Brain, Zap, BarChart, Target, Trophy, Search } from 'lucide-react';
import { useCopilotChat } from '@/hooks/useCopilotChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AsoKnowledgeMessage } from './AsoKnowledgeMessage';
import { QuickActionButtons } from './QuickActionButtons';
import { ContextPanel } from './ContextPanel';

interface AsoKnowledgeEngineProps {
  organizationId: string;
}

export const AsoKnowledgeEngine: React.FC<AsoKnowledgeEngineProps> = ({ organizationId }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'quick-action' | 'contextual';
    context?: any;
  }>>([]);
  const [showContext, setShowContext] = useState(false);
  const { sendMessage: sendCopilotMessage, isLoading } = useCopilotChat();

  // Get user context for personalized responses
  const { data: userContext } = useQuery({
    queryKey: ['aso-knowledge-context', organizationId],
    queryFn: async () => {
      // Get recent audit data
      const { data: audits } = await supabase
        .from('chatgpt_audit_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(3);

      // Get keyword data
      const { data: keywords } = await supabase
        .from('keyword_ranking_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .order('snapshot_date', { ascending: false })
        .limit(50);

      return {
        recentAudits: audits || [],
        keywordData: keywords || [],
        organizationId
      };
    },
  });

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `# Welcome to the ASO Knowledge Engine! 🧠

I'm your comprehensive ASO expert, ready to help with:

**🎯 Strategic Guidance**: App store optimization strategy and planning
**📊 Data Analysis**: Keyword performance and competitive insights  
**🚀 Growth Tactics**: User acquisition and featuring opportunities
**⚡ Quick Solutions**: Instant answers to common ASO questions

Use the quick action buttons below or ask me anything about ASO!`,
        timestamp: new Date(),
        type: 'contextual'
      }]);
    }
  }, []);

  const handleQuickAction = async (action: string, prompt: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: prompt,
      timestamp: new Date(),
      type: 'quick-action' as const
    };

    setMessages(prev => [...prev, userMessage]);

    // Build context for the request
    const contextData = {
      action,
      organizationId,
      recentAudits: userContext?.recentAudits || [],
      keywordData: userContext?.keywordData || [],
      timestamp: new Date().toISOString()
    };

    try {
      const response = await sendCopilotMessage(
        `${prompt}\n\nContext: ${JSON.stringify(contextData)}`,
        'aso-knowledge-engine'
      );

      if (response) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          context: contextData
        }]);
      }
    } catch (error) {
      console.error('Error with quick action:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage('');

    // Build context for the request
    const contextData = {
      organizationId,
      recentAudits: userContext?.recentAudits || [],
      keywordData: userContext?.keywordData || [],
      timestamp: new Date().toISOString()
    };

    try {
      const response = await sendCopilotMessage(
        `${currentMessage}\n\nContext: ${JSON.stringify(contextData)}`,
        'aso-knowledge-engine'
      );

      if (response) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          context: contextData
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white flex items-center space-x-2">
                <span>ASO Knowledge Engine</span>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  AI Expert
                </Badge>
              </CardTitle>
              <p className="text-sm text-zinc-400">
                Comprehensive ASO guidance with context-aware insights
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContext(!showContext)}
              className="text-zinc-400 hover:text-white"
            >
              <BarChart className="w-4 h-4 mr-2" />
              Context
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Actions */}
          <QuickActionButtons onAction={handleQuickAction} />

          {/* Chat Interface */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <AsoKnowledgeMessage key={msg.id} message={msg} />
                  ))}
                  
                  {isLoading && (
                    <div className="flex items-center space-x-2 text-zinc-400">
                      <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                      <span>Analyzing your ASO data...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-zinc-800">
                <div className="flex space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask anything about ASO strategy, keywords, competition..."
                    className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Context Panel */}
        {showContext && (
          <div className="lg:col-span-1">
            <ContextPanel userContext={userContext} />
          </div>
        )}
      </div>
    </div>
  );
};
