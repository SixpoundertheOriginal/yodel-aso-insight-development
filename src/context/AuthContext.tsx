
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { supabaseCompat } from '@/lib/supabase-compat';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { debugLog } from '@/lib/utils/debug';
import { SessionService } from '@/services/sessionService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (options: { email: string; password: string }) => Promise<any>;
  signIn: (options: { email: string; password: string }) => Promise<any>;
  signOut: () => Promise<any>;
  signInWithOAuth: (options: { provider: 'google' | 'github' | 'twitter' }) => Promise<any>;
  resetPassword: (email: string) => Promise<{ success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up the auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Only log auth events in verbose debug mode
        debugLog.verbose(`Auth state changed: ${event}`, currentSession?.user?.email);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // If loading was true, set it to false when we get an auth state change
        if (loading) {
          setLoading(false);
        }

        // Avoid forcing an immediate token refresh on sign-in.
        // Supabase client handles refresh automatically when needed.
        // Removing the manual refresh prevents spurious 400s in dev tools.

        if (event === 'SIGNED_IN') {
          toast({
            title: 'Signed in successfully',
            description: 'Welcome back!',
          });

          // Create session tracking
          if (currentSession?.user) {
            // Get organization ID from user metadata or profile
            const organizationId = currentSession.user.user_metadata?.organization_id || null;

            // Create session with metadata
            SessionService.createSession(
              currentSession.user.id,
              organizationId,
              currentSession.user.email || '',
              {
                userAgent: navigator.userAgent,
                // IP address will be captured server-side if needed
              }
            );

            // Log authentication event to audit logs
            supabaseCompat.rpcAny('log_audit_event', {
              p_user_id: currentSession.user.id,
              p_organization_id: organizationId,
              p_user_email: currentSession.user.email || null,
              p_action: 'user_login',
              p_resource_type: 'auth',
              p_resource_id: null,
              p_details: {
                method: 'password',
                user_agent: navigator.userAgent,
              },
              p_status: 'success',
            }).catch((err) => console.error('Failed to log auth event:', err));
          }
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: 'Signed out successfully',
            description: 'You have been signed out.',
          });

          // End session tracking
          SessionService.endSession('logout');

          // Log logout event
          if (currentSession?.user) {
            supabaseCompat.rpcAny('log_audit_event', {
              p_user_id: currentSession.user.id,
              p_organization_id: currentSession.user.user_metadata?.organization_id || null,
              p_user_email: currentSession.user.email || null,
              p_action: 'user_logout',
              p_resource_type: 'auth',
              p_resource_id: null,
              p_details: {},
              p_status: 'success',
            }).catch((err) => console.error('Failed to log logout event:', err));
          }
        } else if (event === 'TOKEN_REFRESHED') {
          debugLog.verbose('Token refreshed successfully');
          // Update session activity on token refresh
          SessionService.updateSessionActivity();
        } else if (event === 'USER_UPDATED') {
          debugLog.verbose('User updated');
        }
      }
    );

    // Then check for existing session with timeout
    const sessionCheckTimeout = setTimeout(() => {
      // If still loading after 5 seconds, force loading to false
      debugLog.warn('Session check timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      debugLog.verbose('Initial session check', currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      clearTimeout(sessionCheckTimeout);
    }).catch((error) => {
      debugLog.error('Failed to get session', error);
      setLoading(false);
      clearTimeout(sessionCheckTimeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(sessionCheckTimeout);
    };
  }, [toast]);

  const signUp = async ({ email, password }: { email: string; password: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/confirm-email?type=signup`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Sign up successful!',
        description: 'Please check your email for verification.',
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message || 'There was an error during sign up.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        supabaseCompat.rpcAny('log_audit_event', {
          p_user_id: null,
          p_organization_id: null,
          p_user_email: email,
          p_action: 'user_login_failed',
          p_resource_type: 'auth',
          p_resource_id: null,
          p_details: {
            method: 'password',
            error: error.message,
            user_agent: navigator.userAgent,
          },
          p_status: 'failure',
          p_error_message: error.message,
        }).catch((err) => console.error('Failed to log failed login:', err));

        throw error;
      }
      // Restore navigation intent if present, default to Performance Dashboard
      const redirectPath = sessionStorage.getItem('postLoginRedirect') || '/dashboard-v2';
      navigate(redirectPath);
      sessionStorage.removeItem('postLoginRedirect');
      return data;
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear auth caches before signing out (Performance Optimization Phase 1.1)
      const { clearAuthCache } = await import('@/services/authz');
      await clearAuthCache();

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      localStorage.setItem('is-super-admin', 'false');
      navigate('/auth/sign-in');
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'There was an error signing out.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signInWithOAuth = async ({ provider }: { provider: 'google' | 'github' | 'twitter' }) => {
    try {
      const redirectPath = sessionStorage.getItem('postLoginRedirect') || '/dashboard-v2';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      toast({
        title: 'OAuth sign in failed',
        description: error.message || `There was an error signing in with ${provider}.`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/confirm-email?type=recovery`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link.',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Failed to send password reset email.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithOAuth,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
