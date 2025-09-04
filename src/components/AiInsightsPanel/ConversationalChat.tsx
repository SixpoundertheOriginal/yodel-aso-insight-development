import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { ChatInput } from './ChatInput';
import type { MetricsData, FilterContext } from '@/types/aso';
import ReactMarkdown from 'react-markdown';
// remark-gfm temporarily disabled to prevent runtime error
// import remarkGfm from 'remark-gfm';
import { Copy, Bookmark, Share, User } from 'lucide-react';

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

// Auto-detect table-like content and convert to markdown tables
const formatAIResponse = (content: string): string => {
  const kpiPattern = /(\w+(?:\s+\w+)*)\s*[:|]\s*([^|]+)(?:\s*\|\s*([^|\n]+))?/g;

  if (kpiPattern.test(content)) {
    let formatted = content.replace(
      /(\w+(?:\s+\w+)*)\s*[:|]\s*([^|]+)(?:\s*\|\s*([^|\n]+))?/g,
      '| $1 | $2 | $3 |'
    );

    if (!formatted.includes('|---')) {
      formatted =
        '| Metric | Value | Change |\n|-------|-------|--------|\n' + formatted;
    }
    return formatted;
  }

  return content;
};

const EnhancedMessageContent = ({
  content,
  role
}: {
  content: string;
  role: 'user' | 'assistant';
}) => {
  const markdownComponents = {
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse bg-gray-50 rounded-lg overflow-hidden shadow-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => (
      <thead className="bg-orange-500 text-white">{children}</thead>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th className="px-4 py-3 text-left text-sm font-semibold border-r border-orange-400 last:border-r-0">
        {children}
      </th>
    ),
    tbody: ({ children }: { children: React.ReactNode }) => (
      <tbody className="divide-y divide-gray-200">{children}</tbody>
    ),
    tr: ({ children }: { children: React.ReactNode }) => (
      <tr className="hover:bg-gray-100 transition-colors">{children}</tr>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 last:border-r-0">
        {children}
      </td>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <span className="font-semibold text-gray-900 bg-yellow-50 px-1 rounded">
        {children}
      </span>
    ),
    em: ({ children }: { children: React.ReactNode }) => (
      <span className="italic text-orange-600">{children}</span>
    ),
    code: ({
      children,
      className
    }: {
      children: React.ReactNode;
      className?: string;
    }) => {
      const isBlock = className?.includes('language-');
      return isBlock ? (
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-3 text-sm">
          <code>{children}</code>
        </pre>
      ) : (
        <code className="bg-gray-100 text-orange-600 px-2 py-1 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="space-y-2 my-3 ml-4">{children}</ul>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="flex items-start gap-2">
        <span className="text-orange-500 mt-1">•</span>
        <span>{children}</span>
      </li>
    ),
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2 pb-2 border-b border-gray-200">
        {children}
      </h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="text-lg font-semibold text-gray-800 mt-3 mb-2">
        {children}
      </h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="text-md font-medium text-gray-700 mt-2 mb-1">
        {children}
      </h3>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <div className="border-l-4 border-orange-400 bg-orange-50 p-4 my-3 rounded-r-lg">
        <div className="text-orange-800">{children}</div>
      </div>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-3 leading-relaxed text-gray-700 last:mb-0">{children}</p>
    )
  } as const;

  return (
    <div className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert' : ''}`}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

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
        const formatted = formatAIResponse(aiResponse);
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: formatted,
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

    const handleShareMessage = (message: Message) => {
      console.log('Share message:', message.id);
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

    const PremiumMessageBubble = ({
      message,
      isLast
    }: {
      message: Message;
      isLast: boolean;
    }) => (
      <div
        className={`flex gap-4 mb-6 ${
          message.role === 'user' ? 'justify-end' : 'justify-start'
        }`}
      >
        {message.role === 'assistant' && (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        <div
          className={`max-w-[85%] ${
            message.role === 'user'
              ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-tr-md shadow-lg'
              : 'bg-white border border-gray-200 rounded-2xl rounded-tl-md shadow-sm'
          } overflow-hidden`}
        >
          {message.role === 'assistant' && (
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-xs font-medium text-gray-600">
                  AI Marketing Expert
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          <div className="p-4">
            <EnhancedMessageContent
              content={message.content}
              role={message.role}
            />

            {message.role === 'assistant' && message.dashboardContext && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="font-medium">Analysis Context:</span>{' '}
                  {message.dashboardContext}
                </div>
              </div>
            )}
          </div>

          {message.role === 'assistant' && isLast && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopyMessage(message)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                <button
                  onClick={() => handleSaveInsight(message)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <Bookmark className="w-3 h-3" />
                  Save Insight
                </button>
                <button
                  onClick={() => handleShareMessage(message)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <Share className="w-3 h-3" />
                  Share
                </button>
                <div className="ml-auto text-xs text-gray-400">
                  Response time: 1.2s
                </div>
              </div>
            </div>
          )}
        </div>

        {message.role === 'user' && (
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <User className="w-5 h-5 text-white" />
          </div>
        )}
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
                <PremiumMessageBubble
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

