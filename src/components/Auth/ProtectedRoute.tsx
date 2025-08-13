import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';
import { useUserProfile } from '@/hooks/useUserProfile';

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

  // If user lacks organization, redirect to app selection/assignment
  if (profile && !profile.organization_id) {
    return <Navigate to="/apps" replace />;
  }

  // Clear any stored intent once authenticated and organization validated
  sessionStorage.removeItem('postLoginRedirect');
  return <>{children}</>;
};

export default ProtectedRoute;
