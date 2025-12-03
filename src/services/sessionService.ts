/**
 * Session Management Service
 *
 * Purpose: Track user sessions for admin monitoring
 * Features:
 * - Create session on login
 * - Update session activity (heartbeat)
 * - End session on logout
 * - Force logout sessions (super admin)
 * - Get active sessions
 * - Session analytics
 */

import { supabase } from '@/integrations/supabase/client';
import { supabaseCompat } from '@/lib/supabase-compat';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  countryCode?: string;
  city?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  organizationId: string | null;
  userEmail: string;
  sessionTokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string | null;
  endedAt: string | null;
  endReason: string | null;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  userEmail: string;
  organizationId: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  countryCode: string | null;
  city: string | null;
  lastActiveAt: string;
  sessionDuration: string; // PostgreSQL interval as string
}

export interface SessionStats {
  totalActiveSessions: number;
  activeLast5min: number;
  activeLast1hour: number;
  totalSessionsToday: number;
  avgSessionDuration: string | null; // PostgreSQL interval as string
}

// ============================================================
// SESSION SERVICE
// ============================================================

export class SessionService {
  /**
   * Parse user agent string to extract device/browser/OS info
   * Simple regex-based detection (lightweight alternative to ua-parser-js)
   */
  private static parseUserAgent(userAgent: string): {
    deviceType: string;
    browser: string;
    os: string;
  } {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType = 'desktop';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      deviceType = 'tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      deviceType = 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('safari')) {
      browser = 'Safari';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    }

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('win')) {
      os = 'Windows';
    } else if (ua.includes('mac')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    return {
      deviceType,
      browser,
      os,
    };
  }

  /**
   * Generate SHA-256 hash of session token for storage
   * (We don't store the actual token for security)
   */
  private static async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Get session token from current Supabase session
   */
  private static async getSessionToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Create a new session on login
   *
   * @param userId - User UUID
   * @param organizationId - Organization UUID (if applicable)
   * @param userEmail - User email
   * @param metadata - Optional session metadata (IP, user agent, etc.)
   * @returns Session ID or null if failed
   */
  static async createSession(
    userId: string,
    organizationId: string | null,
    userEmail: string,
    metadata?: SessionMetadata
  ): Promise<string | null> {
    try {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) {
        console.error('[SESSION] No session token found');
        return null;
      }

      const sessionTokenHash = await this.hashToken(sessionToken);

      // Parse user agent if provided
      let deviceInfo = {
        deviceType: 'unknown',
        browser: null,
        os: null,
      };

      if (metadata?.userAgent) {
        deviceInfo = this.parseUserAgent(metadata.userAgent);
      }

      // Get session expiration from JWT
      const { data: { session } } = await supabase.auth.getSession();
      const expiresAt = session?.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null;

      console.log('[SESSION] Creating session:', {
        userId,
        organizationId,
        email: userEmail,
        ...deviceInfo,
      });

      const { data, error } = await supabaseCompat.rpcAny('create_user_session', {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_user_email: userEmail,
        p_session_token_hash: sessionTokenHash,
        p_ip_address: metadata?.ipAddress || null,
        p_user_agent: metadata?.userAgent || null,
        p_device_type: deviceInfo.deviceType,
        p_browser: deviceInfo.browser,
        p_os: deviceInfo.os,
        p_expires_at: expiresAt,
      });

      if (error) {
        console.error('[SESSION] Error creating session:', error);
        return null;
      }

      console.log('[SESSION] Session created:', data);
      return data as string;
    } catch (err) {
      console.error('[SESSION] Unexpected error creating session:', err);
      return null;
    }
  }

  /**
   * Update session activity (heartbeat)
   * Call this periodically to track user activity
   */
  static async updateSessionActivity(): Promise<void> {
    try {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) return;

      const sessionTokenHash = await this.hashToken(sessionToken);

      await supabaseCompat.rpcAny('update_session_activity', {
        p_session_token_hash: sessionTokenHash,
      });

      console.log('[SESSION] Activity updated');
    } catch (err) {
      console.error('[SESSION] Error updating session activity:', err);
    }
  }

  /**
   * End current session (on logout)
   *
   * @param reason - Why session ended ('logout', 'timeout', etc.)
   */
  static async endSession(reason: string = 'logout'): Promise<void> {
    try {
      const sessionToken = await this.getSessionToken();
      if (!sessionToken) return;

      const sessionTokenHash = await this.hashToken(sessionToken);

      console.log('[SESSION] Ending session:', reason);

      await supabaseCompat.rpcAny('end_user_session', {
        p_session_token_hash: sessionTokenHash,
        p_end_reason: reason,
      });

      console.log('[SESSION] Session ended');
    } catch (err) {
      console.error('[SESSION] Error ending session:', err);
    }
  }

  /**
   * Force logout a session (super admin only)
   *
   * @param sessionId - Session UUID to terminate
   * @returns True if session was ended, false otherwise
   */
  static async forceLogoutSession(sessionId: string): Promise<boolean> {
    try {
      console.log('[SESSION] Force logging out session:', sessionId);

      const { data, error } = await supabaseCompat.rpcAny('force_logout_session', {
        p_session_id: sessionId,
      });

      if (error) {
        console.error('[SESSION] Error force logging out session:', error);
        return false;
      }

      console.log('[SESSION] Force logout result:', data);
      return data as boolean;
    } catch (err) {
      console.error('[SESSION] Unexpected error force logging out session:', err);
      return false;
    }
  }

  /**
   * Get active sessions (super admin only)
   *
   * @param minutesThreshold - Consider users active if last activity within this many minutes (default: 5)
   * @returns Array of active sessions
   */
  static async getActiveSessions(minutesThreshold: number = 5): Promise<ActiveSession[]> {
    try {
      const { data, error } = await supabaseCompat.rpcAny('get_active_sessions', {
        p_minutes_threshold: minutesThreshold,
      });

      if (error) {
        console.error('[SESSION] Error getting active sessions:', error);
        return [];
      }

      return data as ActiveSession[];
    } catch (err) {
      console.error('[SESSION] Unexpected error getting active sessions:', err);
      return [];
    }
  }

  /**
   * Get session statistics (super admin only)
   *
   * @returns Session stats (active sessions, average duration, etc.)
   */
  static async getSessionStats(): Promise<SessionStats | null> {
    try {
      const { data, error } = await supabaseCompat.rpcAny('get_session_stats', {});

      if (error) {
        console.error('[SESSION] Error getting session stats:', error);
        return null;
      }

      // RPC returns array with single row
      const stats = Array.isArray(data) && data.length > 0 ? data[0] : data;

      return {
        totalActiveSessions: Number(stats.total_active_sessions) || 0,
        activeLast5min: Number(stats.active_last_5min) || 0,
        activeLast1hour: Number(stats.active_last_1hour) || 0,
        totalSessionsToday: Number(stats.total_sessions_today) || 0,
        avgSessionDuration: stats.avg_session_duration || null,
      };
    } catch (err) {
      console.error('[SESSION] Unexpected error getting session stats:', err);
      return null;
    }
  }

  /**
   * Get user's own session history (GDPR compliance)
   *
   * @param userId - User UUID
   * @param limit - Number of sessions to return (default: 50)
   * @returns Array of user's sessions
   */
  static async getUserSessionHistory(userId: string, limit: number = 50): Promise<UserSession[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[SESSION] Error getting user session history:', error);
        return [];
      }

      return data.map((record: any) => ({
        id: record.id,
        userId: record.user_id,
        organizationId: record.organization_id,
        userEmail: record.user_email,
        sessionTokenHash: record.session_token_hash,
        ipAddress: record.ip_address,
        userAgent: record.user_agent,
        deviceType: record.device_type,
        browser: record.browser,
        os: record.os,
        countryCode: record.country_code,
        countryName: record.country_name,
        city: record.city,
        createdAt: record.created_at,
        lastActiveAt: record.last_active_at,
        expiresAt: record.expires_at,
        endedAt: record.ended_at,
        endReason: record.end_reason,
      }));
    } catch (err) {
      console.error('[SESSION] Unexpected error getting user session history:', err);
      return [];
    }
  }
}
