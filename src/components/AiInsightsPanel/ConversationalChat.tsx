import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { ChatInput } from './ChatInput';
import type { MetricsData, FilterContext } from '@/types/aso';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dashboardContext?: string;
}

interface PersistedConversation {
  id: string;
  timestamp: string;
  messages: Message[];
  dashboardContext: string;
  title: string;
  saved?: boolean;
}

export interface ConversationalChatHandle {
  saveConversation: () => void;
  exportConversation: () => void;
  showHistory: () => void;
}

interface ConversationalChatProps {
  metricsData?: MetricsData;
  filterContext: FilterContext;
  organizationId: string;
  onGenerateInsight: (question: string) => Promise<string>;
  isGenerating?: boolean;
  className?: string;
}

export const ConversationalChat = forwardRef<
  ConversationalChatHandle,
  ConversationalChatProps
>(
  (
    {
      metricsData,
      filterContext,
      organizationId,
      onGenerateInsight,
      isGenerating = false,
      className = 'h-full'
    },
    ref
  ) => {
    void organizationId;

    const [conversations, setConversations] = useState<PersistedConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConversation = conversations.find(
      (c) => c.id === activeConversationId
    );

    // Load saved conversations
    useEffect(() => {
      const saved = localStorage.getItem('ai-chat-conversations');
      if (saved) {
        const parsed: PersistedConversation[] = JSON.parse(saved);
        setConversations(parsed);
        if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
        }
      }
    }, []);

    // Persist conversations
    useEffect(() => {
      localStorage.setItem('ai-chat-conversations', JSON.stringify(conversations));
    }, [conversations]);

    // Initialize with welcome message
    useEffect(() => {
      if (!activeConversation && metricsData) {
        const welcome: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `Hi! I'm your mobile marketing expert. I can see you're analyzing ${
            filterContext.trafficSources.join(', ') || 'all traffic sources'
          } for ${filterContext.dateRange.start} to ${filterContext.dateRange.end}. Ask me anything about your KPIs!`,
          timestamp: new Date().toISOString(),
          dashboardContext: `${
            filterContext.trafficSources.join(', ') || 'all traffic sources'
          } (${filterContext.dateRange.start} to ${filterContext.dateRange.end})`
        };

        const convo: PersistedConversation = {
          id: `conv-${Date.now()}`,
          timestamp: new Date().toISOString(),
          messages: [welcome],
          dashboardContext: welcome.dashboardContext ?? '',
          title: 'Conversation',
          saved: false
        };

        setConversations([convo]);
        setActiveConversationId(convo.id);
      }
    }, [activeConversation, filterContext, metricsData]);

    // Auto-scroll
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
      scrollToBottom();
    }, [activeConversation]);

    const handleSendMessage = async (userMessage: string) => {
      let convoId = activeConversationId;
      if (!convoId) {
        convoId = `conv-${Date.now()}`;
        const newConvo: PersistedConversation = {
          id: convoId,
          timestamp: new Date().toISOString(),
          messages: [],
          dashboardContext: `${
            filterContext.trafficSources.join(', ') || 'all traffic sources'
          } (${filterContext.dateRange.start} to ${filterContext.dateRange.end})`,
          title: '',
          saved: false
        };
        setConversations((prev) => [...prev, newConvo]);
        setActiveConversationId(convoId);
      }

      const userChat: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? {
                ...c,
                title: c.title || userMessage,
                messages: [...c.messages, userChat]
              }
            : c
        )
      );
      setIsLoading(true);

      try {
        const aiResponse = await onGenerateInsight(userMessage);
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          dashboardContext: `${
            filterContext.trafficSources.join(', ') || 'all traffic sources'
          } (${filterContext.dateRange.start} to ${filterContext.dateRange.end})`
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId ? { ...c, messages: [...c.messages, aiMessage] } : c
          )
        );
      } catch (error) {
        console.error('Error generating insight:', error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            "I'm sorry, I encountered an error analyzing your data. Please try asking your question again.",
          timestamp: new Date().toISOString()
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId ? { ...c, messages: [...c.messages, errorMessage] } : c
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    const handleCopyMessage = (message: Message) => {
      navigator.clipboard.writeText(message.content);
      console.log('Message copied!');
    };

    const handleSaveInsight = (message: Message) => {
      const insight = {
        id: Date.now().toString(),
        content: message.content,
        timestamp: new Date(),
        source: 'ai-chat'
      };
      console.log('Insight saved:', insight);
    };

    const handleSaveConversation = () => {
      if (activeConversationId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, saved: true } : c
          )
        );
        console.log('Conversation saved!');
      }
    };

    const handleExportConversation = () => {
      if (activeConversationId) {
        const conv = conversations.find((c) => c.id === activeConversationId);
        if (conv) {
          const exportText = conv.messages
            .map((m) => `**${m.role}**: ${m.content}`)
            .join('\n\n');
          const blob = new Blob([exportText], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ai-chat-${conv.timestamp}.md`;
          a.click();
        }
      }
    };

    const handleShowHistory = () => {
      console.log('Show conversation history');
    };

    useImperativeHandle(ref, () => ({
      saveConversation: handleSaveConversation,
      exportConversation: handleExportConversation,
      showHistory: handleShowHistory
    }));

    const suggestedQuestions = [
      'Why are my downloads dropping?',
      'Which traffic source performs best?',
      'How can I improve my conversion rate?',
      "What's driving the recent trend?"
    ];

    const messagesToRender = activeConversation?.messages || [];

    const MessageComponent = ({
      message,
      isLast
    }: {
      message: Message;
      isLast: boolean;
    }) => (
      <div
        className={`flex gap-3 mb-4 ${
          message.role === 'user' ? 'justify-end' : 'justify-start'
        }`}
      >
        <div
          className={`max-w-[80%] rounded-lg p-3 ${
            message.role === 'user'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className="text-sm">{message.content}</div>
          <div className="text-xs opacity-70 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
          {message.role === 'assistant' && message.dashboardContext && (
            <div className="text-xs opacity-70 mt-1 border-t pt-1">
              Context: {message.dashboardContext}
            </div>
          )}
          {message.role === 'assistant' && isLast && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleCopyMessage(message)}
                className="text-xs hover:underline"
              >
                Copy
              </button>
              <button
                onClick={() => handleSaveInsight(message)}
                className="text-xs hover:underline"
              >
                Save Insight
              </button>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex-1 overflow-y-auto p-4">
          {messagesToRender.length === 0 ? (
            <div className="text-center py-8">
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
              {messagesToRender.map((message, index) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  isLast={index === messagesToRender.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <div className="flex-shrink-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || isGenerating || !metricsData}
            placeholder={
              !metricsData ? 'Loading dashboard data...' : 'Ask about your KPIs...'
            }
          />
        </div>
      </div>
    );
  }
);

export default ConversationalChat;

