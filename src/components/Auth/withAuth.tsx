
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedAuth } from '@/hooks/useDebouncedAuth';
import { BrandedLoadingSpinner } from '@/components/ui/LoadingSkeleton';

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const AuthProtected: React.FC<P> = (props) => {
    const { session, loading } = useDebouncedAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !session) {
        navigate('/auth/sign-in');
      }
    }, [session, loading, navigate]);

    // If still loading, show branded spinner
    if (loading) {
      return <BrandedLoadingSpinner />;
    }

    // If not authenticated, don't render anything (redirect will happen)
    if (!session) {
      return null;
    }

    // If authenticated, render the protected component
    return <Component {...props} />;
  };

  return AuthProtected;
};
