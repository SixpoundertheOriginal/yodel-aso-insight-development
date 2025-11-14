import React from 'react';
import { Separator } from '@/components/ui/separator';
import { LucideIcon } from 'lucide-react';

interface SectionWrapperProps {
  icon: LucideIcon;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  icon: Icon,
  title,
  iconColor,
  children
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Icon className={`h-6 w-6 ${iconColor}`} />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      <Separator className="bg-zinc-800" />
      <div>{children}</div>
    </div>
  );
};
