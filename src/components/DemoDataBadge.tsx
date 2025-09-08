import React from 'react';
import { Database } from 'lucide-react';

interface DemoDataBadgeProps {
  isDemo: boolean;
  message?: string;
  className?: string;
}

export const DemoDataBadge: React.FC<DemoDataBadgeProps> = ({
  isDemo,
  message = "Demo Data - Evaluation Mode",
  className = "",
}) => {
  if (!isDemo) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30
                     text-orange-800 dark:text-orange-200 rounded-lg border border-orange-200
                     dark:border-orange-800 ${className}`}
    >
      <Database className="h-4 w-4" />
      <span className="text-sm font-medium">{message}</span>
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
    </div>
  );
};

