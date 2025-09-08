import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useUIPermissions } from '@/hooks/useUIPermissions';

export const SuperAdminBadge: React.FC = () => {
  const { canManagePlatform } = useUIPermissions();

  if (!canManagePlatform) return null;

  return (
    <Badge variant="destructive" className="ml-2" aria-label="Platform Administrator">
      Platform Admin
    </Badge>
  );
};