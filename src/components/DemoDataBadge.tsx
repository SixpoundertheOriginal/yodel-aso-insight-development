import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, Eye } from 'lucide-react';

interface DemoDataBadgeProps {
  isDemo: boolean;
  message?: string;
  className?: string;
}

export const DemoDataBadge: React.FC<DemoDataBadgeProps> = ({ 
  isDemo, 
  message = "Demo Data - Evaluation Mode",
  className = ""
}) => {
  if (!isDemo) return null;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 
                     text-orange-800 dark:text-orange-200 rounded-lg border border-orange-200 
                     dark:border-orange-800 ${className}`}>
      <Database className="h-4 w-4" />
      <span className="text-sm font-medium">{message}</span>
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
    </div>
  );
};

// Alternative inline badge version
export const DemoDataInlineBadge: React.FC<{ isDemo: boolean }> = ({ isDemo }) => {
  if (!isDemo) return null;
  
  return (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700">
      <Eye className="h-3 w-3 mr-1" />
      Demo Data
    </Badge>
  );
};

// Full-width demo banner for important pages
export const DemoDataBanner: React.FC<{ 
  isDemo: boolean; 
  onDismiss?: () => void;
}> = ({ isDemo, onDismiss }) => {
  if (!isDemo) return null;
  
  return (
    <div className="w-full bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 
                    border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-full">
            <Database className="h-5 w-5 text-orange-700 dark:text-orange-200" />
          </div>
          <div>
            <h4 className="font-semibold text-orange-900 dark:text-orange-100">
              Demo Mode Active
            </h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              You're viewing synthetic demonstration data for platform evaluation. 
              No real client data is exposed.
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};