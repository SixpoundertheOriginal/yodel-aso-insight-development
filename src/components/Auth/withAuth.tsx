
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const AuthProtected: React.FC<P> = (props) => {
    const { session, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading && !session) {
        navigate('/auth/sign-in');
      }
    }, [session, loading, navigate]);

    // If still loading, show a spinner
    if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      );
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
