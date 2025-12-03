/**
 * Session Heartbeat Hook
 *
 * Purpose: Periodically update last_active_at timestamp for session tracking
 * Usage: Place in MainLayout or App component:
 *        useSessionHeartbeat();
 *
 * This keeps the "who's online" dashboard accurate
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SessionService } from '@/services/sessionService';

export interface SessionHeartbeatOptions {
  /**
   * Interval between heartbeats in milliseconds
   * Default: 30000 (30 seconds)
   * Recommended: 30-60 seconds for good balance
   */
  intervalMs?: number;

  /**
   * Enable heartbeat (default: true)
   */
  enabled?: boolean;
}

export function useSessionHeartbeat(options: SessionHeartbeatOptions = {}) {
  const {
    intervalMs = 30000, // 30 seconds
    enabled = true,
  } = options;

  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Only run if user is logged in and enabled
    if (!user || !enabled) {
      return;
    }

    console.log('[HEARTBEAT] Starting session heartbeat (interval: %ds)', intervalMs / 1000);

    // Update immediately on mount
    SessionService.updateSessionActivity();

    // Then update periodically
    intervalRef.current = setInterval(() => {
      SessionService.updateSessionActivity();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('[HEARTBEAT] Stopped session heartbeat');
      }
    };
  }, [user, enabled, intervalMs]);
}
