import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, Settings, Users } from 'lucide-react';
import { organizationsApi, featuresApi, type PlatformFeature } from '@/lib/admin-api';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface FeatureManagementPanelProps {
  organizationId?: string;
}

export function FeatureManagementPanel({ organizationId }: FeatureManagementPanelProps) {
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizationId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();

  // Load organizations list
  const loadOrganizations = async () => {
    try {
      const orgs = await organizationsApi.list();
      const safeOrgs = orgs || [];
      setOrganizations(safeOrgs);

      if (!organizationId && safeOrgs.length > 0) {
        setSelectedOrgId(safeOrgs[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations',
        variant: 'destructive'
      });
    }
  };

  // Load platform features
  const loadPlatformFeatures = async () => {
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-features`, {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch platform features');
      }

      const data = await response.json();
      if (data.success) {
        setFeatures(data.data.features);
      }
    } catch (error) {
      console.error('Error loading platform features:', error);
      toast({
        title: 'Error',
        description: 'Failed to load platform features',
        variant: 'destructive'
      });
    }
  };

  // Load organization features
  const loadOrganizationFeatures = async (orgId: string) => {
    if (!orgId) return;

    try {
      setLoading(true);
      const { features: orgFeatures } = await featuresApi.listOrganization(orgId);
      setFeatures(orgFeatures || []);
    } catch (error) {
      console.error('Error loading organization features:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization features',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle organization feature
  const toggleOrganizationFeature = async (featureKey: string, enabled: boolean) => {
    if (!selectedOrgId) return;

    try {
      setSaving(true);
      await featuresApi.toggleOrganization(selectedOrgId, featureKey, enabled);

      setFeatures(prev => prev.map(f =>
        f.feature_key === featureKey ? { ...f, is_enabled: enabled } : f
      ));

      toast({
        title: 'Success',
        description: `Feature ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle feature',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    const category = feature.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, PlatformFeature[]>);

  const categoryDisplayNames = {
    performance_intelligence: 'Performance Intelligence',
    ai_command_center: 'AI Command Center',
    growth_accelerators: 'Growth Accelerators',
    control_center: 'Control Center',
    account: 'Account',
    other: 'Other'
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadOrganizations();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrganizationFeatures(selectedOrgId);
    }
  }, [selectedOrgId]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only super administrators can manage platform features.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Management
          </CardTitle>
          <CardDescription>
            Manage platform features and organization entitlements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="organization-select">Select Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedOrgId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Features
            </CardTitle>
            <CardDescription>
              Configure feature access for the selected organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading features...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {categoryDisplayNames[category as keyof typeof categoryDisplayNames] || category}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {categoryFeatures.map(feature => (
                        <Card key={feature.feature_key} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{feature.feature_name}</h4>
                              {feature.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {feature.description}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={feature.is_enabled || false}
                              onCheckedChange={(enabled) => toggleOrganizationFeature(feature.feature_key, enabled)}
                              disabled={saving}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={feature.is_enabled ? "default" : "secondary"} className="text-xs">
                              {feature.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {feature.feature_key}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
