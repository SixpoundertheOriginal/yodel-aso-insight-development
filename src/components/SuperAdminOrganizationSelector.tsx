import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIPermissions } from '@/hooks/useUIPermissions';
import { SuperAdminBadge } from '@/components/SuperAdminBadge';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminOrganizationSelectorProps {
  selectedOrg?: string | null;
  onOrgChange: (orgId: string | null) => void;
  allowAllOrgs?: boolean;
  className?: string;
}

interface Organization {
  id: string;
  name: string;
  slug?: string;
}

export const SuperAdminOrganizationSelector: React.FC<SuperAdminOrganizationSelectorProps> = ({
  selectedOrg,
  onOrgChange,
  allowAllOrgs = true,
  className
}) => {
  const { canAccessAllOrganizations } = useUIPermissions();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canAccessAllOrganizations) {
      setLoading(true);
      
      const fetchOrganizations = async () => {
        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .order('name');

          if (error) {
            console.error('Error fetching organizations:', error);
            return;
          }

          setOrganizations(data || []);
        } catch (error) {
          console.error('Failed to fetch organizations:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchOrganizations();
    }
  }, [canAccessAllOrganizations]);

  if (!canAccessAllOrganizations) return null;

  return (
    <Card className={`border-blue-200 bg-blue-50/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Crown className="h-5 w-5" />
          Platform Administrator Mode
          <SuperAdminBadge />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <label className="text-sm font-medium text-blue-600">
            Select Organization Context:
          </label>
          <Select 
            value={selectedOrg || ''} 
            onValueChange={(value) => onOrgChange(value || null)}
            disabled={loading}
          >
            <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
              <SelectValue 
                placeholder={loading ? "Loading organizations..." : "Select organization"} 
              />
            </SelectTrigger>
            <SelectContent>
              {allowAllOrgs && (
                <SelectItem value="">
                  <span className="font-medium text-blue-600">All Organizations (Platform View)</span>
                </SelectItem>
              )}
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{org.name}</span>
                    {org.slug && (
                      <span className="text-xs text-gray-500">({org.slug})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-blue-600">
            When an organization is selected, you'll see data specific to that organization. 
            When "All Organizations" is selected, you'll see platform-wide aggregated data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};