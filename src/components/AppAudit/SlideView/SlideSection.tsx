import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SlideSectionProps {
  icon: LucideIcon;
  title: string;
  iconColor?: string;
  children?: React.ReactNode;
}

export const SlideSection: React.FC<SlideSectionProps> = ({
  icon: Icon,
  title,
  iconColor = 'text-yodel-orange',
  children
}) => {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center space-x-3">
        <Icon className={`h-6 w-6 ${iconColor}`} />
        <h2 className="text-xl font-bold text-foreground tracking-wide uppercase">
          {title}
        </h2>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-zinc-700 via-zinc-600 to-transparent" />

      {/* Content */}
      {children && (
        <div className="pl-9">
          {children}
        </div>
      )}
    </div>
  );
};
