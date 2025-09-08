import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useAsoData } from '@/context/AsoDataContext';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';

const GlobalDemoIndicator: React.FC = () => {
  const { isDemo } = useAsoData();
  const { isDemoOrg } = useDemoOrgDetection();
  const isDemoMode = isDemo || isDemoOrg;

  if (!isDemoMode) return null;

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700"
    >
      <AlertTriangle className="h-3 w-3" />
      Demo Mode
    </Badge>
  );
};

export default GlobalDemoIndicator;
