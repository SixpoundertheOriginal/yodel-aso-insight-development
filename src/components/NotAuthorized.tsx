import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotAuthorizedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

export function NotAuthorized({ 
  title = "Access Restricted", 
  message = "You don't have permission to access this feature. Contact your administrator if you need access.",
  showBackButton = true 
}: NotAuthorizedProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <Shield className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-muted-foreground leading-relaxed">{message}</p>
        </div>
        
        {showBackButton && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotAuthorized;