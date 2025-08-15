import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronDown, Globe } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Organization {
  id: string;
  name: string;
  subscription_tier: string;
}

interface OrganizationSelectorProps {
  selectedOrganizationId: string | null;
  onOrganizationChange: (orgId: string | null) => void;
  isSuperAdmin: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  selectedOrganizationId,
  onOrganizationChange,
  isSuperAdmin
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, subscription_tier')
          .order('name');

        if (error) {
          console.error('Error fetching organizations:', error);
          return;
        }

        setOrganizations(data || []);
      } catch (err) {
        console.error('Error in fetchOrganizations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return null;
  }

  const selectedOrg = organizations.find(org => org.id === selectedOrganizationId);

  return (
    <Card className="bg-background/50 border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Organization Context
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            Platform Admin
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Select
            value={selectedOrganizationId || "platform-wide"}
            onValueChange={(value) => onOrganizationChange(value === "platform-wide" ? null : value)}
            disabled={loading}
          >
            <SelectTrigger className="w-full bg-background border-border/50">
              <SelectValue placeholder="Select organization context" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="platform-wide" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Platform-Wide View</span>
                </div>
              </SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{org.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {org.subscription_tier}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedOrganizationId && selectedOrg && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded border">
              <div className="flex items-center justify-between">
                <span>Current: <strong>{selectedOrg.name}</strong></span>
                <Badge variant="secondary" className="text-xs">
                  {selectedOrg.subscription_tier}
                </Badge>
              </div>
            </div>
          )}

          {!selectedOrganizationId && (
            <div className="text-sm text-primary bg-primary/10 p-2 rounded border border-primary/20">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span>Viewing platform-wide data</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};