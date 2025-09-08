import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Tables } from '@/integrations/supabase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const location = useLocation();

  // Show spinner while auth or profile are loading
  if (loading || (user && profileLoading)) {
    return <AuthLoadingSpinner />;
  }

  // If no authenticated user, store intended path and redirect to sign in
  if (!user) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // 🔧 FIX: Check if user is in auth flow - don't redirect during auth processes
  const isInAuthFlow = location.search.includes('access_token') || 
                      location.search.includes('token_hash') || 
                      location.search.includes('type=') ||
                      location.pathname.startsWith('/auth/');

  // ✅ ENHANCED: Only redirect non-super-admin users without organization
  // BUT NOT if they're in the middle of an auth flow (email confirmation, password reset, etc.)
  if (profile && !profile.organization_id && !isInAuthFlow) {
    const userRoles = (profile.user_roles || []) as Tables<'user_roles'>[];
    const isSuperAdmin = userRoles.some(
      (role) => role.role?.toLowerCase() === 'super_admin' && role.organization_id === null
    );

    if (!isSuperAdmin) {
      return <Navigate to="/apps" replace />;
    }
  }

  // Clear any stored intent once authenticated and organization validated
  sessionStorage.removeItem('postLoginRedirect');
  return <>{children}</>;
};

export default ProtectedRoute;
