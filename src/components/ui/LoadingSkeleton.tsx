import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingSkeletonProps {
  variant?: 'dashboard' | 'table' | 'card-grid' | 'sidebar' | 'page' | 'chart';
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'page', 
  className = '' 
}) => {
  switch (variant) {
    case 'dashboard':
      return (
        <div className={`space-y-6 ${className}`}>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Main Chart Area */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
          
          {/* Data Table */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'table':
      return (
        <div className={`space-y-4 ${className}`}>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex-1" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'card-grid':
      return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case 'sidebar':
      return (
        <div className={`space-y-4 ${className}`}>
          <div className="space-y-2">
            <Skeleton className="h-8 w-32 mb-4" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-4 border-t">
            <Skeleton className="h-6 w-28 mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'chart':
      return (
        <Card className={className}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      );

    case 'page':
    default:
      return (
        <div className={`space-y-6 ${className}`}>
          {/* Page Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          {/* Navigation/Tabs */}
          <div className="flex space-x-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
          
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );
  }
};

// Branded loading spinner for app-level loading states
export const BrandedLoadingSpinner: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => (
  <div className={`flex h-screen w-full items-center justify-center ${className}`}>
    <div className="relative">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/50 to-background backdrop-blur-sm animate-fade-in" />
      
      {/* Main loading content */}
      <div className="relative z-10 text-center space-y-8 animate-scale-in">
        {/* Premium spinner with multiple rings */}
        <div className="relative mx-auto w-20 h-20">
          {/* Outer ring - orange gradient */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-yodel-orange via-yodel-orange/80 to-yodel-orange bg-clip-border animate-spin [animation-duration:2s]">
            <div className="absolute inset-1 rounded-full bg-background" />
          </div>
          
          {/* Inner ring - purple accent */}
          <div className="absolute inset-2 rounded-full border-2 border-transparent bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 bg-clip-border animate-spin [animation-duration:1.5s] [animation-direction:reverse]">
            <div className="absolute inset-0.5 rounded-full bg-background" />
          </div>
          
          {/* Center dot with pulse */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-yodel-orange to-purple-500 animate-pulse" />
          
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yodel-orange/20 to-purple-500/20 blur-lg animate-pulse" />
        </div>
        
        {/* Branded text */}
        <div className="space-y-3">
          <div className="text-lg font-semibold bg-gradient-to-r from-yodel-orange to-purple-500 bg-clip-text text-transparent animate-fade-in [animation-delay:0.3s]">
            ASO Intelligence Platform
          </div>
          <div className="text-sm text-muted-foreground animate-fade-in [animation-delay:0.6s]">
            Analyzing your app's potential...
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center space-x-2 animate-fade-in [animation-delay:0.9s]">
            <div className="w-2 h-2 rounded-full bg-yodel-orange animate-pulse [animation-delay:0s]" />
            <div className="w-2 h-2 rounded-full bg-yodel-orange animate-pulse [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-yodel-orange animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
        
        {/* Subtle particle effects */}
        <div className="absolute -inset-4 pointer-events-none">
          <div className="absolute top-4 left-4 w-1 h-1 rounded-full bg-yodel-orange/40 animate-pulse [animation-delay:0.5s]" />
          <div className="absolute top-8 right-6 w-1 h-1 rounded-full bg-purple-500/40 animate-pulse [animation-delay:1s]" />
          <div className="absolute bottom-6 left-8 w-1 h-1 rounded-full bg-yodel-orange/40 animate-pulse [animation-delay:1.5s]" />
          <div className="absolute bottom-4 right-4 w-1 h-1 rounded-full bg-purple-500/40 animate-pulse [animation-delay:2s]" />
        </div>
      </div>
    </div>
  </div>
);

// Quick skeleton for specific UI components
export const ComponentSkeleton: React.FC<{
  type: 'button' | 'input' | 'select' | 'card' | 'text';
  className?: string;
}> = ({ type, className = '' }) => {
  switch (type) {
    case 'button':
      return <Skeleton className={`h-9 w-20 ${className}`} />;
    case 'input':
      return <Skeleton className={`h-9 w-full ${className}`} />;
    case 'select':
      return <Skeleton className={`h-9 w-32 ${className}`} />;
    case 'card':
      return (
        <Card className={className}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      );
    case 'text':
      return <Skeleton className={`h-4 w-48 ${className}`} />;
    default:
      return <Skeleton className={`h-4 w-24 ${className}`} />;
  }
};