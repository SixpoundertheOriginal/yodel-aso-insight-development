import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ConfirmationState = 'loading' | 'success' | 'error';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<ConfirmationState>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (!accessToken || !refreshToken) {
          throw new Error('Invalid confirmation link. Please check your email and try again.');
        }

        // Verify the email confirmation token
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: accessToken,
          type: 'email'
        });

        if (verifyError) {
          throw new Error(verifyError.message || 'Email verification failed');
        }

        setState('success');

        // Redirect based on email type after a short delay
        setTimeout(() => {
          switch (type) {
            case 'signup':
              navigate('/auth/complete-signup', { replace: true });
              break;
            case 'recovery':
              navigate('/auth/update-password', { replace: true });
              break;
            case 'email_change':
              navigate('/dashboard', { replace: true });
              toast({
                title: 'Email confirmed',
                description: 'Your email has been successfully updated.',
              });
              break;
            default:
              navigate('/dashboard', { replace: true });
          }
        }, 2000);

      } catch (err: any) {
        console.error('Email confirmation error:', err);
        setError(err.message || 'Failed to confirm email');
        setState('error');
      }
    };

    confirmEmail();
  }, [searchParams, navigate, toast]);

  const handleRetry = () => {
    setState('loading');
    setError('');
    window.location.reload();
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-yodel-orange mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Confirming your email...</h3>
            <p className="text-zinc-400">Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Email confirmed!</h3>
            <p className="text-zinc-400">Redirecting you to complete your setup...</p>
          </div>
        );

      case 'error':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Confirmation failed</h3>
            </div>
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetry} className="bg-yodel-orange hover:bg-orange-600">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth/sign-in')}>
                Back to Sign In
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-foreground"
            onClick={() => navigate('/auth/sign-in')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg">
                <span className="text-lg font-bold text-foreground">Y</span>
              </div>
              <span className="text-2xl font-bold text-foreground">Yodel ASO</span>
            </div>
            <CardTitle className="text-foreground">Email Confirmation</CardTitle>
            <CardDescription className="text-zinc-400">
              We're verifying your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmEmail;