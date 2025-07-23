import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'elevated' | 'glow' | 'interactive' | 'gradient';
  intensity?: 'subtle' | 'medium' | 'strong';
  glowColor?: 'orange' | 'blue' | 'success' | 'none';
  animated?: boolean;
  children: React.ReactNode;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  variant = 'glass',
  intensity = 'medium',
  glowColor = 'none',
  animated = true,
  children,
  className,
  ...props
}) => {
  const baseClasses = "rounded-xl transition-all duration-300 ease-out backdrop-blur-sm";
  
  const variants = {
    glass: {
      subtle: "bg-white/5 border border-white/10 shadow-lg hover:bg-white/8 hover:border-white/20",
      medium: "bg-white/10 border border-white/20 shadow-xl hover:bg-white/15 hover:border-white/30",
      strong: "bg-white/15 border border-white/30 shadow-2xl hover:bg-white/20 hover:border-white/40"
    },
    elevated: {
      subtle: "bg-zinc-900/80 border border-zinc-800/60 shadow-lg hover:shadow-xl transform hover:-translate-y-1",
      medium: "bg-zinc-900/90 border border-zinc-800/80 shadow-xl hover:shadow-2xl transform hover:-translate-y-2",
      strong: "bg-zinc-900 border border-zinc-700 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transform hover:-translate-y-3"
    },
    glow: {
      subtle: "bg-zinc-900/80 border border-zinc-800/60 shadow-lg hover:shadow-glow/50",
      medium: "bg-zinc-900/90 border border-zinc-800/80 shadow-xl hover:shadow-glow",
      strong: "bg-zinc-900 border border-zinc-700 shadow-2xl hover:shadow-glow hover:shadow-2xl"
    },
    interactive: {
      subtle: "bg-zinc-900/80 border border-zinc-800/60 cursor-pointer hover:bg-zinc-800/80 hover:border-zinc-700/80 hover:scale-[1.02]",
      medium: "bg-zinc-900/90 border border-zinc-800/80 cursor-pointer hover:bg-zinc-800/90 hover:border-zinc-700/90 hover:scale-[1.02] hover:shadow-xl",
      strong: "bg-zinc-900 border border-zinc-700 cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 hover:scale-[1.03] hover:shadow-2xl"
    },
    gradient: {
      subtle: "bg-gradient-to-br from-zinc-900/80 via-zinc-800/40 to-zinc-900/80 border border-zinc-700/50 shadow-lg hover:from-zinc-800/80 hover:to-zinc-900/90",
      medium: "bg-gradient-to-br from-zinc-900 via-zinc-800/60 to-zinc-900 border border-zinc-700/80 shadow-xl hover:from-zinc-800 hover:to-zinc-900",
      strong: "bg-gradient-to-br from-zinc-800 via-zinc-700/80 to-zinc-900 border border-zinc-600 shadow-2xl hover:from-zinc-700 hover:to-zinc-800"
    }
  };

  const glowClasses = {
    orange: "hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:border-orange-500/30",
    blue: "hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-500/30",
    success: "hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-500/30",
    none: ""
  };

  const animatedClasses = animated ? "animate-fade-in" : "";

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant][intensity],
        glowColor !== 'none' && glowClasses[glowColor],
        animatedClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface PremiumCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PremiumCardHeader: React.FC<PremiumCardHeaderProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("p-6 pb-4", className)} {...props}>
    {children}
  </div>
);

interface PremiumCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PremiumCardContent: React.FC<PremiumCardContentProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("px-6 pb-6", className)} {...props}>
    {children}
  </div>
);

interface PremiumCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PremiumCardFooter: React.FC<PremiumCardFooterProps> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn("px-6 pb-6 pt-4 border-t border-zinc-800/50", className)} {...props}>
    {children}
  </div>
);