import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrganizationSelector } from '@/components/Organization/OrganizationSelector';
import { Building2, Globe } from 'lucide-react';
import { useSuperAdmin } from '@/context/SuperAdminContext';

interface SuperAdminOrganizationSelectorProps {
  className?: string;
}

export const SuperAdminOrganizationSelector: React.FC<SuperAdminOrganizationSelectorProps> = ({
  className = ""
}) => {
  const { selectedOrganizationId, setSelectedOrganizationId, isSuperAdmin } = useSuperAdmin();

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="bg-background/50 border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Select Organization Context
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose an organization to view its ASO insights and analytics.
            </p>
            
            <OrganizationSelector
              selectedOrganizationId={selectedOrganizationId}
              onOrganizationChange={setSelectedOrganizationId}
              isSuperAdmin={isSuperAdmin}
            />

            {!selectedOrganizationId && (
              <div className="text-center py-6">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">Platform-Wide View</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select an organization above to view specific ASO insights and metrics.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};