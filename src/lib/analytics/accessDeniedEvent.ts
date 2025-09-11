import { debugLog } from '@/lib/utils/debug';

export interface AccessDeniedEventData {
  userId: string;
  email?: string;
  organizationId: string | null;
  roles: string[];
  isSuperAdmin: boolean;
  reason: 'no-organization' | 'no-roles' | 'other';
  timestamp: string;
  userAgent?: string;
  path?: string;
}

/**
 * Logs access denied events for monitoring and troubleshooting
 * Supports multiple analytics providers
 */
export class AccessDeniedLogger {
  private static instance: AccessDeniedLogger;

  public static getInstance(): AccessDeniedLogger {
    if (!AccessDeniedLogger.instance) {
      AccessDeniedLogger.instance = new AccessDeniedLogger();
    }
    return AccessDeniedLogger.instance;
  }

  /**
   * Log access denied event with multiple providers
   */
  public logAccessDenied(data: AccessDeniedEventData): void {
    const eventPayload = {
      ...data,
      sessionId: this.getSessionId(),
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // Always log to console for debugging
    console.warn('ACCESS DENIED:', eventPayload);

    // Log to debug system
    debugLog.error('User access denied', eventPayload);

    // Send to Google Analytics (if available)
    this.sendToGoogleAnalytics(eventPayload);

    // Send to custom analytics (if available)
    this.sendToCustomAnalytics(eventPayload);

    // Store in localStorage for support debugging (non-sensitive data only)
    this.storeForDebug(eventPayload);
  }

  /**
   * Send event to Google Analytics
   */
  private sendToGoogleAnalytics(data: AccessDeniedEventData): void {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'user_access_denied', {
          custom_parameters: {
            user_id: data.userId,
            has_organization: !!data.organizationId,
            roles_count: data.roles.length,
            is_super_admin: data.isSuperAdmin,
            denial_reason: data.reason,
            path: data.path,
          },
        });
      }
    } catch (error) {
      console.warn('Failed to send access denied event to GA:', error);
    }
  }

  /**
   * Send to custom analytics service
   * Replace this with your actual analytics service
   */
  private sendToCustomAnalytics(data: AccessDeniedEventData): void {
    try {
      // Example: Send to Mixpanel, Amplitude, PostHog, etc.
      if (typeof window !== 'undefined' && (window as any).mixpanel) {
        (window as any).mixpanel.track('Access Denied', {
          userId: data.userId,
          organizationId: data.organizationId,
          rolesCount: data.roles.length,
          isSuperAdmin: data.isSuperAdmin,
          reason: data.reason,
          path: data.path,
        });
      }

      // Example: Send to your internal API
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/analytics/access-denied', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'access_denied',
            userId: data.userId,
            organizationId: data.organizationId,
            reason: data.reason,
            timestamp: data.timestamp,
          }),
        }).catch(error => {
          console.warn('Failed to send access denied event to API:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to send access denied event to custom analytics:', error);
    }
  }

  /**
   * Store non-sensitive debug info in localStorage for support
   */
  private storeForDebug(data: AccessDeniedEventData): void {
    try {
      const debugInfo = {
        timestamp: data.timestamp,
        hasOrg: !!data.organizationId,
        rolesCount: data.roles.length,
        isSuperAdmin: data.isSuperAdmin,
        reason: data.reason,
        path: data.path,
      };

      const existing = JSON.parse(localStorage.getItem('access_denied_events') || '[]');
      existing.push(debugInfo);
      
      // Keep only last 10 events
      const recent = existing.slice(-10);
      localStorage.setItem('access_denied_events', JSON.stringify(recent));
    } catch (error) {
      console.warn('Failed to store access denied debug info:', error);
    }
  }

  /**
   * Get session ID for tracking
   */
  private getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    } catch {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
}

/**
 * Convenience function to log access denied events
 */
export const logAccessDenied = (data: Omit<AccessDeniedEventData, 'timestamp'>) => {
  const logger = AccessDeniedLogger.getInstance();
  logger.logAccessDenied({
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
  }
}