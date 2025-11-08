/**
 * Session Security Provider
 *
 * Purpose: Wraps the app with session timeout functionality
 * Usage: Add to App.tsx root component
 *
 * Configuration:
 * - Development: Disabled (for easier testing)
 * - Production: Enabled with standard timeouts
 *
 * Example:
 * <SessionSecurityProvider>
 *   <YourApp />
 * </SessionSecurityProvider>
 */

import { ReactNode } from 'react';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';

interface SessionSecurityProviderProps {
  children: ReactNode;
}

export function SessionSecurityProvider({ children }: SessionSecurityProviderProps) {
  // Disable in development for easier testing
  const isDevelopment = import.meta.env.DEV;

  const {
    showWarning,
    timeRemaining,
    extendSession,
    handleLogout,
  } = useSessionSecurity({
    enabled: !isDevelopment, // Enable in production only
    // Optional: Override default timeouts
    // idleTimeoutMs: 15 * 60 * 1000, // 15 minutes
    // absoluteTimeoutMs: 8 * 60 * 60 * 1000, // 8 hours
  });

  return (
    <>
      {children}

      <SessionTimeoutWarning
        isOpen={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </>
  );
}
