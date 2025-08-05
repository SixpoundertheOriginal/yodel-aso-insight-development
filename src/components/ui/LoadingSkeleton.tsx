import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingSkeletonProps {
  variant?: 'dashboard' | 'table' | 'card-grid' | 'sidebar' | 'page' | 'chart' | 'text' | 'card';
  className?: string;
  items?: number;
  staggered?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'page', 
  className = '',
  items = 5,
  staggered = true
}) => {
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getSkeletonClass = (index: number = 0) => {
    const baseClass = "animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded";
    const staggerDelay = staggered && !prefersReducedMotion ? `[animation-delay:${index * 0.1}s]` : '';
    const duration = prefersReducedMotion ? '' : '[animation-duration:2s]';
    return `${baseClass} ${staggerDelay} ${duration}`;
  };

  switch (variant) {
    case 'dashboard':
      return (
        <div className={`space-y-6 ${className}`}>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                {/* Shimmer overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent ${
                  prefersReducedMotion ? 'opacity-50' : 'animate-pulse'
                } [animation-delay:${i * 0.2}s]`} />
                <CardHeader className="pb-2">
                  <div className={`h-4 w-24 ${getSkeletonClass(i)}`} />
                </CardHeader>
                <CardContent>
                  <div className={`h-8 w-20 mb-2 ${getSkeletonClass(i + 1)}`} />
                  <div className={`h-3 w-16 ${getSkeletonClass(i + 2)}`} />
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

// Enhanced branded loading spinner with sophisticated animations and theme support
export const BrandedLoadingSpinner: React.FC<{ 
  className?: string;
  message?: string;
  description?: string;
}> = ({ 
  className = '',
  message = "ASO Intelligence Platform",
  description = "Analyzing your app's potential...",
}) => {
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect current theme
  const theme = typeof window !== 'undefined' ? 
    document.documentElement.classList.contains('dark') ? 'dark' : 'light' : 'dark';

  return (
    <div 
      className={`flex h-screen w-full items-center justify-center bg-gradient-to-br from-background via-muted to-accent ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div className="relative">
        {/* Theme-adaptive glow overlay */}
        <div className={`absolute inset-0 rounded-full ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-blue-400/30 to-purple-500/30' 
            : 'bg-gradient-to-br from-blue-200/20 to-purple-300/20'
        } blur-3xl ${prefersReducedMotion ? 'opacity-50' : 'animate-pulse'}`} />
        
        {/* Main loading content */}
        <div className="relative z-10 text-center space-y-8 animate-scale-in">
          {/* Enhanced multi-layer spinner */}
          <div className="relative mx-auto w-20 h-20">
            {/* Outer static ring */}
            <div className={`absolute inset-0 rounded-full border-4 ${
              theme === 'dark' ? 'border-blue-400/20' : 'border-blue-300/30'
            }`} />
            
            {/* Middle spinning ring */}
            <div className={`absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r ${
              theme === 'dark' 
                ? 'from-blue-400 via-blue-500 to-purple-500' 
                : 'from-blue-300 via-blue-400 to-purple-400'
            } bg-clip-border ${prefersReducedMotion ? 'animate-pulse' : 'animate-spin [animation-duration:2s]'}`}>
              <div className="absolute inset-1 rounded-full bg-background" />
            </div>
            
            {/* Inner pulsing core */}
            <div className={`absolute inset-6 rounded-full bg-gradient-to-r ${
              theme === 'dark' 
                ? 'from-blue-400 to-purple-500' 
                : 'from-blue-300 to-purple-400'
            } ${prefersReducedMotion ? 'opacity-75' : 'animate-pulse'}`} />
            
            {/* Floating particles around spinner */}
            {!prefersReducedMotion && (
              <div className="absolute inset-0">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className={`absolute w-0.5 h-0.5 rounded-full ${
                      theme === 'dark' ? 'bg-blue-400/60' : 'bg-blue-300/60'
                    } animate-ping`}
                    style={{
                      transform: `rotate(${i * 45}deg) translateY(-35px)`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '2s'
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Enhanced glow effect */}
            <div className={`absolute inset-0 rounded-full ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400/30 to-purple-500/30'
                : 'bg-gradient-to-r from-blue-200/20 to-purple-300/20'
            } blur-lg ${prefersReducedMotion ? 'opacity-50' : 'animate-pulse'}`} />
          </div>
          
          {/* Enhanced branded text with theme-adaptive styling */}
          <div className="space-y-3">
            <div className={`text-xl font-semibold ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent'
                : 'text-foreground'
            } animate-fade-in [animation-delay:0.3s]`}>
              {message}
            </div>
            <div className="text-sm text-muted-foreground animate-fade-in [animation-delay:0.6s]">
              {description}
            </div>
            
            {/* Progress dots with bounce animation */}
            <div className="flex justify-center space-x-2 animate-fade-in [animation-delay:0.9s]">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                  } ${prefersReducedMotion ? 'opacity-75' : 'animate-bounce'}`}
                  style={{ 
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Enhanced particle system floating around the component */}
          {!prefersReducedMotion && (
            <div className="absolute -inset-12 pointer-events-none">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full ${
                    i % 2 === 0 
                      ? (theme === 'dark' ? 'bg-blue-400/40' : 'bg-blue-300/40')
                      : (theme === 'dark' ? 'bg-purple-500/40' : 'bg-purple-400/40')
                  } animate-ping`}
                  style={{
                    top: `${Math.sin(i * Math.PI / 3) * 60 + 50}%`,
                    left: `${Math.cos(i * Math.PI / 3) * 60 + 50}%`,
                    animationDelay: `${i * 0.4}s`,
                    animationDuration: '3s'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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

// Enhanced progress bar with shimmer effects
export const EnhancedProgressBar: React.FC<{
  progress: number;
  className?: string;
  showPercentage?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'pulse';
}> = ({ 
  progress, 
  className = '', 
  showPercentage = true, 
  label,
  size = 'md',
  variant = 'gradient'
}) => {
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const getProgressBarClass = () => {
    const baseClass = `${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`;
    switch (variant) {
      case 'gradient':
        return `${baseClass} bg-gradient-to-r from-blue-400 to-purple-500`;
      case 'pulse':
        return `${baseClass} bg-primary ${prefersReducedMotion ? '' : 'animate-pulse'}`;
      default:
        return `${baseClass} bg-primary`;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{progress}%</span>
          )}
        </div>
      )}
      
      <div className={`relative w-full ${sizeClasses[size]} bg-muted rounded-full overflow-hidden`}>
        {/* Progress bar */}
        <div 
          className={getProgressBarClass()}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
        
        {/* Shimmer overlay */}
        {!prefersReducedMotion && variant === 'gradient' && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
            style={{ animationDuration: '2s' }}
          />
        )}
      </div>
    </div>
  );
};