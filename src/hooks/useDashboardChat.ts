import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Dashboard Chat Hook
 *
 * Manages multi-session AI chat state and API calls.
 * Handles session creation, message sending, and session management.
 */

// ============================================
// Type Definitions
// ============================================

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  expires_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  token_count?: number;
  model?: string;
}

export interface DashboardContext {
  dateRange: { start: string; end: string };
  appIds: string[];
  trafficSources: string[];
  kpiSummary: {
    impressions: number;
    downloads: number;
    cvr: number;
    product_page_views: number;
  };
}

// ============================================
// Hook Implementation
// ============================================

export function useDashboardChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  /**
   * List all active sessions for the current user
   */
  const listSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: { action: 'list_sessions' }
      });

      if (error) {
        console.error('[useDashboardChat] List sessions error:', error);
        throw error;
      }

      setSessions(data.sessions || []);
      console.log(`[useDashboardChat] Loaded ${data.sessions?.length || 0} sessions`);
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to list sessions:', error);

      // Check if it's an auth error (backend not deployed or not logged in)
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.warn('[useDashboardChat] Backend not deployed or authentication issue');
        // Silent fail - don't show error toast on mount
      } else {
        toast.error('Failed to load chat sessions');
      }

      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new chat session
   */
  const createSession = useCallback(async (context: DashboardContext) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: {
          action: 'create_session',
          dashboardContext: context
        }
      });

      if (error) {
        console.error('[useDashboardChat] Create session error:', error);
        throw error;
      }

      const newSession = data.session;
      setCurrentSession(newSession);
      setMessages([]);
      await listSessions(); // Refresh list

      console.log(`[useDashboardChat] Created session: ${newSession.id}`);
      toast.success('New chat started');

      return newSession;
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to create session:', error);

      // Check for specific errors
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('AI Chat backend not deployed. See deployment guide in docs/QUICKSTART_CHAT.md');
      } else if (error.message?.includes('Maximum active sessions')) {
        toast.error('Too many active chats. Please delete or wait for old chats to expire.');
      } else {
        toast.error('Failed to create chat session');
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [listSessions]);

  /**
   * Load a specific session and its messages
   */
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: {
          action: 'get_session',
          sessionId
        }
      });

      if (error) {
        console.error('[useDashboardChat] Load session error:', error);
        throw error;
      }

      setCurrentSession(data.session);
      setMessages(data.messages || []);

      console.log(`[useDashboardChat] Loaded session ${sessionId} with ${data.messages?.length || 0} messages`);
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to load session:', error);
      toast.error('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Send a message in the current session
   */
  const sendMessage = useCallback(async (
    sessionId: string,
    message: string,
    context: DashboardContext
  ) => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setIsSending(true);

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: {
          action: 'send_message',
          sessionId,
          message,
          dashboardContext: context
        }
      });

      if (error) {
        console.error('[useDashboardChat] Send message error:', error);
        throw error;
      }

      // Remove temp message and reload session to get encrypted messages
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      await loadSession(sessionId);

      console.log(`[useDashboardChat] Message sent, ${data.tokenCount} tokens used`);

      return data.message;
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to send message:', error);

      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));

      // Check for rate limit error
      if (error.message?.includes('Daily message limit')) {
        toast.error('Daily message limit reached. Please try again tomorrow.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }

      throw error;
    } finally {
      setIsSending(false);
    }
  }, [loadSession]);

  /**
   * Pin or unpin a session
   */
  const pinSession = useCallback(async (sessionId: string, isPinned: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: {
          action: 'pin_session',
          sessionId,
          isPinned
        }
      });

      if (error) {
        console.error('[useDashboardChat] Pin session error:', error);
        throw error;
      }

      // Update current session if it's the one being pinned
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, is_pinned: isPinned } : null);
      }

      // Update in sessions list
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, is_pinned: isPinned } : s
      ));

      toast.success(isPinned ? 'Chat pinned' : 'Chat unpinned');

      console.log(`[useDashboardChat] Session ${sessionId} ${isPinned ? 'pinned' : 'unpinned'}`);
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to pin session:', error);
      toast.error('Failed to update chat');
    }
  }, [currentSession]);

  /**
   * Update session title
   */
  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: {
          action: 'update_session_title',
          sessionId,
          title
        }
      });

      if (error) {
        console.error('[useDashboardChat] Update title error:', error);
        throw error;
      }

      // Update current session if it's the one being renamed
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, title } : null);
      }

      // Update in sessions list
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, title } : s
      ));

      toast.success('Chat renamed');

      console.log(`[useDashboardChat] Session ${sessionId} renamed to: ${title}`);
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to update title:', error);
      toast.error('Failed to rename chat');
    }
  }, [currentSession]);

  /**
   * Delete a session
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-chat', {
        body: {
          action: 'delete_session',
          sessionId
        }
      });

      if (error) {
        console.error('[useDashboardChat] Delete session error:', error);
        throw error;
      }

      // Clear current session if it's the one being deleted
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }

      // Remove from sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      toast.success('Chat deleted');

      console.log(`[useDashboardChat] Session ${sessionId} deleted`);
    } catch (error: any) {
      console.error('[useDashboardChat] Failed to delete session:', error);
      toast.error('Failed to delete chat');
    }
  }, [currentSession]);

  /**
   * Clear current session (UI only, doesn't delete)
   */
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
  }, []);

  return {
    // State
    sessions,
    currentSession,
    messages,
    isLoading,
    isSending,

    // Actions
    listSessions,
    createSession,
    loadSession,
    sendMessage,
    pinSession,
    updateSessionTitle,
    deleteSession,
    clearCurrentSession,
  };
}
