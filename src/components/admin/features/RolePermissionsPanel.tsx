import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, Shield, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RolePermission {
  id: string;
  role: string;
  feature_key: string;
  is_allowed: boolean;
  feature_name?: string;
  category?: string;
  description?: string;
}

interface PlatformFeature {
  feature_key: string;
  feature_name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ASO_MANAGER' | 'ANALYST' | 'VIEWER' | 'CLIENT';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full platform access' },
  { value: 'ORG_ADMIN', label: 'Organization Admin', description: 'Organization management' },
  { value: 'ASO_MANAGER', label: 'ASO Manager', description: 'Core ASO tools' },
  { value: 'ANALYST', label: 'Analyst', description: 'Analytics-focused' },
  { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
  { value: 'CLIENT', label: 'Client', description: 'Minimal access' },
];

export function RolePermissionsPanel() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ASO_MANAGER');
  const [platformFeatures, setPlatformFeatures] = useState<PlatformFeature[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();

  // Load all platform features
  const loadPlatformFeatures = async () => {
    try {
      const { data: features, error } = await supabase
        .from('platform_features')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });

      if (error) throw error;

      setPlatformFeatures(features || []);
    } catch (error) {
      console.error('Error loading platform features:', error);
      toast({
        title: 'Error',
        description: 'Failed to load platform features',
        variant: 'destructive'
      });
    }
  };

  // Load role permissions for selected role
  const loadRolePermissions = async (role: UserRole) => {
    try {
      setLoading(true);

      const { data: permissions, error } = await supabase
        .from('role_feature_permissions')
        .select('feature_key, is_allowed')
        .eq('role', role);

      if (error) throw error;

      // Build map of feature_key -> is_allowed
      const permissionsMap = new Map<string, boolean>();
      permissions?.forEach(p => {
        permissionsMap.set(p.feature_key, p.is_allowed);
      });

      setRolePermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle role permission
  const toggleRolePermission = async (featureKey: string, enabled: boolean) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('role_feature_permissions')
        .upsert({
          role: selectedRole,
          feature_key: featureKey,
          is_allowed: enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'role,feature_key'
        });

      if (error) throw error;

      // Update local state
      setRolePermissions(prev => {
        const updated = new Map(prev);
        updated.set(featureKey, enabled);
        return updated;
      });

      toast({
        title: 'Success',
        description: `Permission ${enabled ? 'granted' : 'revoked'} for ${selectedRole}`
      });
    } catch (error) {
      console.error('Error toggling role permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role permission',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Group features by category
  const featuresByCategory = platformFeatures.reduce((acc, feature) => {
    const category = feature.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, PlatformFeature[]>);

  const categoryDisplayNames: Record<string, string> = {
    performance_intelligence: 'Performance Intelligence',
    ai_command_center: 'AI Command Center',
    growth_accelerators: 'Growth Accelerators',
    control_center: 'Control Center',
    account: 'Account',
    other: 'Other'
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadPlatformFeatures();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only super administrators can manage role permissions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const enabledCount = Array.from(rolePermissions.values()).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Global Role Permissions
          </CardTitle>
          <CardDescription>
            Define which features each role can access across all organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                These permissions apply globally to all organizations. Users can only access features if BOTH their organization has the feature enabled AND their role has permission.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="role-select">Select Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRole && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Badge variant="outline">
                  {enabledCount} / {platformFeatures.length} features allowed
                </Badge>
                <span className="text-sm text-muted-foreground">
                  for {ROLES.find(r => r.value === selectedRole)?.label}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {ROLES.find(r => r.value === selectedRole)?.label} Permissions
            </CardTitle>
            <CardDescription>
              Configure feature access for {selectedRole.toLowerCase()} role
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading role permissions...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
                  const categoryEnabledCount = categoryFeatures.filter(f =>
                    rolePermissions.get(f.feature_key) === true
                  ).length;

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">
                          {categoryDisplayNames[category as keyof typeof categoryDisplayNames] || category}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {categoryEnabledCount} / {categoryFeatures.length}
                        </Badge>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {categoryFeatures.map(feature => {
                          const isAllowed = rolePermissions.get(feature.feature_key) === true;
                          const isLocked = selectedRole === 'SUPER_ADMIN'; // Super admin always has all features

                          return (
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
                                  checked={isAllowed}
                                  onCheckedChange={(enabled) => toggleRolePermission(feature.feature_key, enabled)}
                                  disabled={saving || isLocked}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={isAllowed ? "default" : "secondary"} className="text-xs">
                                  {isAllowed ? 'Allowed' : 'Denied'}
                                </Badge>
                                {isLocked && (
                                  <Badge variant="outline" className="text-xs">
                                    Locked
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
