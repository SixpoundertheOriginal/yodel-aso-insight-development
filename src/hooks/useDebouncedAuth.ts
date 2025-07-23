import { useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useAuth } from '@/context/AuthContext';

/**
 * Debounced auth hook to prevent cascade re-renders during auth state changes
 */
export const useDebouncedAuth = (delay: number = 300) => {
  const auth = useAuth();
  
  // Debounce auth state changes to prevent excessive re-renders
  const [debouncedSession] = useDebounce(auth.session, delay);
  const [debouncedUser] = useDebounce(auth.user, delay);
  const [debouncedLoading] = useDebounce(auth.loading, delay);

  return useMemo(() => ({
    ...auth,
    session: debouncedSession,
    user: debouncedUser,
    loading: debouncedLoading,
    // Keep these methods immediate for responsiveness
    signIn: auth.signIn,
    signOut: auth.signOut,
    signUp: auth.signUp,
    signInWithOAuth: auth.signInWithOAuth
  }), [auth, debouncedSession, debouncedUser, debouncedLoading]);
};
