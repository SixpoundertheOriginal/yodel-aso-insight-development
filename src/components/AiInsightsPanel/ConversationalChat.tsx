import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import type { MetricsData, FilterContext } from '@/types/aso';
import { DemoAIChatService } from '@/services/demoAIChatService';
// Markdown rendering is handled inside MessageBubble via MarkdownRenderer
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
  isDemoMode?: boolean;
}

// Auto-detect table-like content and convert to markdown tables (GFM) without dropping other text
const formatAIResponse = (content: string): string => {
  // Do not attempt to transform fenced code blocks
  if (content.includes('```')) return content;

  const lines = content.split(/\n/);
  const out: string[] = [];
  let i = 0;

  const isKpiLine = (l: string) => /\w(?:[\w\s])*\s*[:|]\s*[^|\n]+/.test(l);
  const isPipeRow = (l: string) => (l.includes('|') && (l.match(/\|/g)?.length || 0) >= 2);
  const isCsvRow = (l: string) => (l.match(/,/g)?.length || 0) >= 1 && !l.includes('|');

  while (i < lines.length) {
    const l = lines[i];

    // KPI block
    if (isKpiLine(l)) {
      const start = i;
      const block: string[] = [];
      while (i < lines.length && isKpiLine(lines[i])) { block.push(lines[i]); i++; }
      // Build table
      const rows = block.map(row => {
        const m = row.match(/^(.*?)\s*[:|]\s*([^|\n]+?)(?:\s*\|\s*([^|\n]+))?\s*$/);
        const c1 = m?.[1]?.trim() || '';
        const c2 = m?.[2]?.trim() || '';
        const c3 = m?.[3]?.trim() || '';
        return `| ${c1} | ${c2} | ${c3} |`;
      });
      if (rows.length) {
        out.push('| Metric | Value | Change |');
        out.push('| --- | --- | --- |');
        out.push(...rows);
      } else {
        out.push(...block);
      }
      continue;
    }

    // Pipe table block (normalize by ensuring header separator exists)
    if (isPipeRow(l)) {
      const block: string[] = [];
      while (i < lines.length && isPipeRow(lines[i])) { block.push(lines[i]); i++; }
      const hasSep = block.some(r => /\|\s*-{3,}\s*/.test(r));
      if (!hasSep && block.length >= 2) {
        const normalizeRow = (r: string) => {
          let t = r.trim();
          if (!t.startsWith('|')) t = `| ${t}`;
          if (!t.endsWith('|')) t = `${t} |`;
          return t;
        };
        const normalized = block.map(normalizeRow);
        const cols = (normalized[0].match(/\|/g)?.length || 0) - 1;
        const sep = '|' + Array.from({ length: cols }).map(() => ' --- ').join('|') + '|';
        out.push(normalized[0]);
        out.push(sep);
        out.push(...normalized.slice(1));
      } else {
        out.push(...block);
      }
      continue;
    }

    // CSV block
    if (isCsvRow(l)) {
      const block: string[] = [];
      while (i < lines.length && isCsvRow(lines[i])) { block.push(lines[i]); i++; }
      if (block.length >= 2) {
        const toCells = (r: string) => r.split(',').map(x => x.trim()).join(' | ');
        const header = toCells(block[0]);
        const colCount = header.split('|').length;
        const sep = Array.from({ length: colCount }).map(() => '---').join(' | ');
        out.push(`| ${header} |`);
        out.push(`| ${sep} |`);
        for (const r of block.slice(1)) out.push(`| ${toCells(r)} |`);
      } else {
        out.push(...block);
      }
      continue;
    }

    // Default: passthrough
    out.push(l);
    i++;
  }

  return out.join('\n');
};

// Generate premium welcome message with enhanced formatting
const generatePremiumWelcomeMessage = (filterContext: FilterContext): string => {
  const formatDateRange = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startFormatted = start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      const endFormatted = end.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: end.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      
      // Calculate days difference
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return `${startFormatted} - ${endFormatted} (${diffDays} days)`;
    } catch {
      return `${startDate} to ${endDate}`;
    }
  };

  const formatTrafficSources = (sources: string[]): string => {
    if (!sources.length || sources.includes('all')) {
      return 'all traffic sources';
    }
    
    if (sources.length === 1) {
      return `**${sources[0]}** traffic`;
    }
    
    if (sources.length === 2) {
      return `**${sources[0]}** and **${sources[1]}** traffic`;
    }
    
    const last = sources.pop();
    return `**${sources.join(', ')}**, and **${last}** traffic`;
  };

  const trafficText = formatTrafficSources([...filterContext.trafficSources]);
  const dateText = formatDateRange(filterContext.dateRange.start, filterContext.dateRange.end);
  
  return `# 👋 Welcome to Your ASO Command Center

**I'm your AI-powered mobile marketing strategist**, here to help you unlock insights from your app's performance data.

## 📊 **Current Analysis Scope**
- **Traffic Sources:** ${trafficText}  
- **Time Period:** ${dateText}

## 🚀 **What I Can Help You With**
- **Performance Analysis** - Deep dive into your KPIs and metrics
- **Conversion Optimization** - Identify opportunities to improve CVR  
- **Traffic Source Insights** - Compare and optimize channel performance
- **Trend Analysis** - Spot patterns and growth opportunities
- **Strategic Recommendations** - Data-driven advice for your ASO strategy

---

💡 **Ready to get started?** Ask me about any metric, trend, or performance question you have in mind!`;
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
      className = 'h-full',
      isDemoMode = false
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
        const welcomeContent = isDemoMode || metricsData?.metadata?.isDemo 
          ? DemoAIChatService.generateDemoWelcomeMessage(filterContext)
          : generatePremiumWelcomeMessage(filterContext);

        const welcome: Message = {
          id: 'welcome',
          role: 'assistant',
          content: welcomeContent,
          timestamp: new Date().toISOString(),
          dashboardContext: `Analysis: ${
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
    }, [activeConversation, filterContext, metricsData, isDemoMode]);

    // Auto-scroll
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
      scrollToBottom();
    }, [activeConversation]);

    // Ensure we scroll on each new message as well
    useEffect(() => {
      scrollToBottom();
    }, [activeConversation?.messages?.length]);

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
      // Failsafe: clear local loading if something goes wrong silently
      const loadingGuard = setTimeout(() => setIsLoading(false), 30000);

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
        clearTimeout(loadingGuard);
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
      '🚀 What are my top performing KPIs this period?',
      '📈 Which traffic source is driving the highest ROI?',
      '⚡ How can I optimize my conversion funnel?',
      '🎯 What opportunities should I focus on first?',
      '📊 Show me my biggest performance wins and challenges'
    ];

    const messagesToRender = activeConversation?.messages || [];

// Component removed - now using MessageBubble

    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex-1 overflow-y-auto p-4">
          {messagesToRender.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Your AI Marketing Strategist is Ready
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Ask me anything about your app's performance, and I'll provide data-driven insights to help you grow.
              </p>
              <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(question)}
                    disabled={isLoading || isGenerating}
                    className="text-sm p-4 bg-gradient-to-r from-zinc-50 to-zinc-100 border border-zinc-200 rounded-xl hover:from-orange-50 hover:to-orange-100 hover:border-orange-200 transition-all duration-200 text-left shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messagesToRender.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  onCopy={() => navigator.clipboard.writeText(message.content)}
                  onBookmark={() => {
                    // TODO: Implement bookmark functionality
                    console.log('Bookmark message:', message.id);
                  }}
                  onShare={() => {
                    // TODO: Implement share functionality  
                    console.log('Share message:', message.id);
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <div className="flex-shrink-0">
          {/**
           * Disable input only while a response is generating or local send is pending.
           * Allow follow-up messages even if metricsData becomes temporarily undefined.
           */}
          {/** Compute disabled: if no metricsData AND no messages yet, keep disabled; otherwise allow. */}
          {/** This prevents the "stuck after first reply" condition caused by strict metrics gating. */}
          {(() => {
            const messagesCount = messagesToRender.length;
            const inputDisabled = isLoading || isGenerating || (!metricsData && messagesCount === 0);
            return (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={inputDisabled}
            placeholder={
              !metricsData ? 'Loading dashboard data...' : 'Ask about your KPIs...'
            }
          />);
          })()}
        </div>
      </div>
    );
  }
);

export default ConversationalChat;
