/**
 * Session Security Hook
 *
 * Purpose: Implement session timeouts for security compliance
 * Compliance: Required for SOC 2 Type II, ISO 27001
 *
 * Features:
 * - Idle timeout: 15 minutes of inactivity
 * - Absolute timeout: 8 hours maximum session duration
 * - Activity tracking: Mouse, keyboard, touch events
 * - Warning before logout: 2 minutes notice
 * - Audit logging: Session start/end events
 *
 * Security:
 * - Prevents session hijacking via stolen tokens
 * - Limits exposure window for compromised sessions
 * - Forces periodic re-authentication
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// Configuration
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const WARNING_BEFORE_LOGOUT_MS = 2 * 60 * 1000; // 2 minutes warning

// Activity events to track
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

interface SessionSecurityConfig {
  enabled: boolean;
  idleTimeoutMs?: number;
  absoluteTimeoutMs?: number;
  warningBeforeLogoutMs?: number;
}

export function useSessionSecurity(config: SessionSecurityConfig = { enabled: true }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);

  const idleTimeout = config.idleTimeoutMs || IDLE_TIMEOUT_MS;
  const absoluteTimeout = config.absoluteTimeoutMs || ABSOLUTE_TIMEOUT_MS;
  const warningTime = config.warningBeforeLogoutMs || WARNING_BEFORE_LOGOUT_MS;

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If warning is showing, hide it (user is active)
    if (showWarning) {
      setShowWarning(false);
      setTimeRemaining(null);

      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    }
  }, [showWarning]);

  // Log session event
  const logSessionEvent = async (action: string, details?: any) => {
    if (!user) return;

    try {
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_organization_id: null,
        p_user_email: user.email || null,
        p_action: action,
        p_resource_type: 'user_session',
        p_resource_id: user.id,
        p_details: details || {},
        p_status: 'success',
      });
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  };

  // Handle logout
  const handleLogout = useCallback(async (reason: 'idle_timeout' | 'absolute_timeout' | 'user_action') => {
    // Log session end
    await logSessionEvent('session_end', {
      reason,
      session_duration_ms: Date.now() - sessionStartRef.current,
      idle_duration_ms: reason === 'idle_timeout' ? Date.now() - lastActivityRef.current : null,
    });

    // Sign out
    await signOut();

    // Redirect to login with reason
    navigate(`/login?session_expired=${reason}`);
  }, [navigate, signOut, user]);

  // Show warning dialog
  const showLogoutWarning = useCallback((timeoutType: 'idle' | 'absolute') => {
    setShowWarning(true);

    // Start countdown timer
    const warningDuration = warningTime;
    let remaining = warningDuration / 1000; // Convert to seconds

    setTimeRemaining(remaining);

    warningTimerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (warningTimerRef.current) {
          clearInterval(warningTimerRef.current);
          warningTimerRef.current = null;
        }
        handleLogout(timeoutType === 'idle' ? 'idle_timeout' : 'absolute_timeout');
      }
    }, 1000);
  }, [handleLogout, warningTime]);

  // Check timeouts
  const checkTimeouts = useCallback(() => {
    if (!config.enabled || !user) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeSinceSessionStart = now - sessionStartRef.current;

    // Check absolute timeout
    if (timeSinceSessionStart >= absoluteTimeout) {
      handleLogout('absolute_timeout');
      return;
    }

    // Check if approaching absolute timeout
    if (timeSinceSessionStart >= absoluteTimeout - warningTime && !showWarning) {
      showLogoutWarning('absolute');
      return;
    }

    // Check idle timeout
    if (timeSinceActivity >= idleTimeout) {
      handleLogout('idle_timeout');
      return;
    }

    // Check if approaching idle timeout
    if (timeSinceActivity >= idleTimeout - warningTime && !showWarning) {
      showLogoutWarning('idle');
      return;
    }
  }, [config.enabled, user, idleTimeout, absoluteTimeout, warningTime, showWarning, handleLogout, showLogoutWarning]);

  // Extend session (user clicked "Stay logged in")
  const extendSession = useCallback(() => {
    updateActivity();
    setShowWarning(false);
    setTimeRemaining(null);

    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    // Log session extension
    logSessionEvent('session_extended', {
      idle_duration_ms: Date.now() - lastActivityRef.current,
    });
  }, [updateActivity]);

  // Setup activity listeners
  useEffect(() => {
    if (!config.enabled || !user) return;

    // Log session start
    sessionStartRef.current = Date.now();
    lastActivityRef.current = Date.now();

    logSessionEvent('session_start', {
      idle_timeout_ms: idleTimeout,
      absolute_timeout_ms: absoluteTimeout,
    });

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Start periodic timeout check (every 30 seconds)
    checkTimerRef.current = setInterval(checkTimeouts, 30 * 1000);

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });

      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }

      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    };
  }, [config.enabled, user, updateActivity, checkTimeouts, idleTimeout, absoluteTimeout]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    handleLogout: () => handleLogout('user_action'),
  };
}
