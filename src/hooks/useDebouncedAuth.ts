import { useMemo, useRef, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useAuth } from '@/context/AuthContext';
import { debugLog } from '@/lib/utils/debug';

/**
 * Enhanced debounced auth hook to prevent cascade re-renders during auth state changes
 * with stability tracking and performance optimization
 */
export const useDebouncedAuth = (delay: number = 300) => {
  const auth = useAuth();
  const stableAuthRef = useRef(auth);
  const lastStableStateRef = useRef<string>('');
  
  // Debounce auth state changes to prevent excessive re-renders
  const [debouncedSession] = useDebounce(auth.session, delay);
  const [debouncedUser] = useDebounce(auth.user, delay);
  const [debouncedLoading] = useDebounce(auth.loading, delay);

  // Track auth state stability
  const currentStateKey = `${!!auth.session}-${!!auth.user}-${auth.loading}`;
  
  useEffect(() => {
    if (currentStateKey !== lastStableStateRef.current) {
      debugLog.verbose('[DEBOUNCED-AUTH] Auth state changed', {
        from: lastStableStateRef.current,
        to: currentStateKey,
        hasSession: !!auth.session,
        hasUser: !!auth.user,
        loading: auth.loading
      });
      lastStableStateRef.current = currentStateKey;
    }
  }, [currentStateKey, auth.session, auth.user, auth.loading]);

  // Create stable auth object to prevent unnecessary re-renders
  const stableAuth = useMemo(() => {
    const authObj = {
      ...auth,
      session: debouncedSession,
      user: debouncedUser,
      loading: debouncedLoading,
      // Keep these methods immediate for responsiveness
      signIn: auth.signIn,
      signOut: auth.signOut,
      signUp: auth.signUp,
      signInWithOAuth: auth.signInWithOAuth
    };

    // Only update stable ref if auth state has meaningfully changed
    const newStateKey = `${!!authObj.session}-${!!authObj.user}-${authObj.loading}`;
    if (newStateKey !== lastStableStateRef.current) {
      stableAuthRef.current = authObj;
    }

    return stableAuthRef.current;
  }, [auth, debouncedSession, debouncedUser, debouncedLoading]);

  return stableAuth;
};
