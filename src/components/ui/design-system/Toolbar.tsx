import React from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  dense?: boolean;
}

export const YodelToolbar: React.FC<ToolbarProps> = ({ children, dense = false, className, ...props }) => {
  return (
    <div
      className={cn(
        'w-full rounded-lg border border-zinc-800 bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/50',
        dense ? 'px-3 py-2' : 'px-4 py-3',
        'flex flex-wrap items-center gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const YodelToolbarSpacer: React.FC = () => <div className="flex-1" />;

interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const YodelToolbarGroup: React.FC<ToolbarGroupProps> = ({ children, className, ...props }) => (
  <div className={cn('flex items-center gap-2', className)} {...props}>
    {children}
  </div>
);

