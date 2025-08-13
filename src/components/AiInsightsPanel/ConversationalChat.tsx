import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { MessageCircle, Sparkles } from 'lucide-react';
import type { MetricsData, FilterContext } from '@/types/aso';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationalChatProps {
  metricsData?: MetricsData;
  filterContext: FilterContext;
  organizationId: string;
  onGenerateInsight: (question: string) => Promise<string>;
  isGenerating?: boolean;
  className?: string;
}

export const ConversationalChat: React.FC<ConversationalChatProps> = ({
  metricsData,
  filterContext,
  organizationId,
  onGenerateInsight,
  isGenerating = false,
  className = 'h-80'
}) => {
  void organizationId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message on first load
  useEffect(() => {
    if (messages.length === 0 && metricsData) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm your mobile marketing expert. I can see you're analyzing ${filterContext.trafficSources.join(', ') || 'all traffic sources'} for ${filterContext.dateRange.start} to ${filterContext.dateRange.end}. Ask me anything about your KPIs!`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [metricsData, messages.length]);

  const handleSendMessage = async (userMessage: string) => {
    // Add user message
    const userChatMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userChatMessage]);
    setIsLoading(true);

    try {
      // Generate AI response
      const aiResponse = await onGenerateInsight(userMessage);
      
      // Add AI response
      const aiChatMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiChatMessage]);
    } catch (error) {
      console.error('Error generating insight:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error analyzing your data. Please try asking your question again.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "Why are my downloads dropping?",
    "Which traffic source performs best?",
    "How can I improve my conversion rate?",
    "What's driving the recent trend?"
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chat Header */}
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-foreground">Ask Your Marketing Expert</h4>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            AI
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask questions about your current KPIs and get expert insights
        </p>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Start a conversation about your KPIs
            </p>
            <div className="grid grid-cols-1 gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(question)}
                  disabled={isLoading || isGenerating}
                  className="text-xs p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      {/* Chat Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || isGenerating || !metricsData}
          placeholder={
            !metricsData 
              ? "Loading dashboard data..." 
              : "Ask about your KPIs..."
          }
        />
      </div>
    </div>
  );
};

export default ConversationalChat;
