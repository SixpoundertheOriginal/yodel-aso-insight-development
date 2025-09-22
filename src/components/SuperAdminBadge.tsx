import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';

export const SuperAdminBadge: React.FC = () => {
  const { isSuperAdmin } = usePermissions();

  if (!isSuperAdmin) return null;

  return (
    <Badge variant="destructive" className="ml-2" aria-label="Platform Administrator">
      Platform Admin
    </Badge>
  );
};