import React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureProtectedRouteProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AccessDeniedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your organization doesn't have access to this feature.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact your administrator to request access to this module.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const FeatureProtectedRoute: React.FC<FeatureProtectedRouteProps> = ({
  feature,
  children,
  fallback = <AccessDeniedPage />
}) => {
  const { hasFeature, loading } = useFeatureAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};