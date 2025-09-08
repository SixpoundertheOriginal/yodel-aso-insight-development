
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { debugLog } from '@/lib/utils/debug';

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
        
        // Force refresh tokens if session exists but may be stale
        if (currentSession?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              const { data } = await supabase.auth.refreshSession();
              if (data.session) {
                debugLog.verbose('Token refreshed successfully');
              }
            } catch (error) {
              console.warn('Token refresh failed:', error);
            }
          }, 100);
        }
        
        if (event === 'SIGNED_IN') {
          toast({
            title: 'Signed in successfully',
            description: 'Welcome back!',
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: 'Signed out successfully',
            description: 'You have been signed out.',
          });
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      debugLog.verbose('Initial session check', currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
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
        throw error;
      }
      // Restore navigation intent if present
      const redirectPath = sessionStorage.getItem('postLoginRedirect') || '/dashboard';
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
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
      const redirectPath = sessionStorage.getItem('postLoginRedirect') || '/dashboard';
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
