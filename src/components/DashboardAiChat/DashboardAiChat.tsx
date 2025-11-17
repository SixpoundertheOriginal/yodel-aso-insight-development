import { useState, useEffect, useRef } from 'react';
import { useDashboardChat, type DashboardContext } from '@/hooks/useDashboardChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Send,
  Plus,
  MessageSquare,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  Check,
  X as XIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Dashboard AI Chat Component
 *
 * Multi-session AI chat interface for dashboard analytics.
 * Integrates with dashboard-v2 filters and KPI data.
 */

interface DashboardAiChatProps {
  organizationId: string;
  dateRange: { start: string; end: string };
  selectedAppIds: string[];
  selectedTrafficSources: string[];
  analyticsData: any; // EnterpriseAnalyticsResponse
}

export function DashboardAiChat({
  organizationId,
  dateRange,
  selectedAppIds,
  selectedTrafficSources,
  analyticsData
}: DashboardAiChatProps) {
  const {
    sessions,
    currentSession,
    messages,
    isLoading,
    isSending,
    listSessions,
    createSession,
    loadSession,
    sendMessage,
    pinSession,
    updateSessionTitle,
    deleteSession,
  } = useDashboardChat();

  const [inputMessage, setInputMessage] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    listSessions();
  }, [listSessions]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build dashboard context from props
  const dashboardContext: DashboardContext = {
    dateRange,
    appIds: selectedAppIds,
    trafficSources: selectedTrafficSources,
    kpiSummary: {
      impressions: analyticsData?.processedData?.summary?.impressions?.value || 0,
      downloads: analyticsData?.processedData?.summary?.downloads?.value || 0,
      cvr: analyticsData?.processedData?.summary?.cvr?.value || 0,
      product_page_views: analyticsData?.processedData?.summary?.product_page_views?.value || 0,
    }
  };

  const handleNewChat = async () => {
    try {
      await createSession(dashboardContext);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return;

    try {
      await sendMessage(currentSession.id, inputMessage, dashboardContext);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handlePinToggle = async () => {
    if (!currentSession) return;
    await pinSession(currentSession.id, !currentSession.is_pinned);
  };

  const handleEditTitle = () => {
    if (!currentSession) return;
    setEditedTitle(currentSession.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!currentSession || !editedTitle.trim()) return;
    await updateSessionTitle(currentSession.id, editedTitle.trim());
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Delete this chat? This cannot be undone.')) {
      await deleteSession(sessionId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 space-y-3" role="banner">
        {currentSession ? (
          <div className="space-y-2">
            {/* Session Title */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEditTitle();
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEditTitle}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-100">
                    {currentSession.title}
                  </h2>
                  {currentSession.is_pinned && (
                    <Badge variant="secondary" className="text-xs">
                      <Pin className="h-3 w-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={handleEditTitle}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handlePinToggle}>
                    {currentSession.is_pinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSession(currentSession.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            )}
            <p className="text-sm text-zinc-400">
              Ask questions about your analytics
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">AI Dashboard Chat</h2>
            <p className="text-sm text-zinc-400">
              Start a conversation to analyze your data
            </p>
          </div>
        )}
      </div>

      {/* New Chat Button + Session List */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        <Button
          onClick={handleNewChat}
          className="w-full"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        {sessions.length > 0 && (
          <>
            <Separator />
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Recent Chats
            </div>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      "w-full text-left p-2 rounded hover:bg-zinc-800 transition",
                      currentSession?.id === session.id && "bg-zinc-800 ring-1 ring-yodel-orange/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(session.updated_at).toLocaleDateString()} at{' '}
                          {new Date(session.updated_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {session.is_pinned && (
                          <Pin className="h-3 w-3 text-yodel-orange" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {!currentSession && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <MessageSquare className="h-12 w-12 text-zinc-600" />
            <div>
              <p className="text-zinc-400 mb-2">Start a new chat to ask questions</p>
              <div className="text-zinc-500 text-sm space-y-1">
                <p>Try asking:</p>
                <ul className="list-disc list-inside space-y-1 text-left inline-block">
                  <li>What's driving my download growth?</li>
                  <li>How does my Search CVR compare to Browse?</li>
                  <li>What opportunities should I focus on?</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {currentSession && messages.length === 0 && !isSending && (
          <div className="text-zinc-500 text-sm space-y-2">
            <p className="font-medium">Ask me anything about your dashboard data:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Analyze my current performance trends</li>
              <li>Compare Search vs Browse effectiveness</li>
              <li>Identify optimization opportunities</li>
              <li>Explain unusual patterns in my data</li>
            </ul>
            <p className="text-xs text-zinc-600 pt-2">
              💡 Tip: I can see your current filters (date range, apps, traffic sources)
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "mb-4 p-3 rounded-lg",
              msg.role === 'user'
                ? "bg-yodel-orange/10 ml-8"
                : "bg-zinc-800 mr-8"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-zinc-500">
                {msg.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="text-xs text-zinc-600">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="text-sm text-zinc-200 whitespace-pre-wrap">
              {msg.content}
            </div>
            {msg.token_count && (
              <div className="text-xs text-zinc-600 mt-2">
                {msg.token_count.toLocaleString()} tokens
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
            <Loader2 className="h-5 w-5 animate-spin text-yodel-orange" />
            <span className="text-sm text-zinc-400">AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      {currentSession && (
        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about your analytics..."
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !inputMessage.trim()}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-yodel-orange" />
        </div>
      )}
    </div>
  );
}
