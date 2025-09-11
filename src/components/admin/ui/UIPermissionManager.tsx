import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUIPermissions } from '@/hooks/useUIPermissions';
import { uiPermissionService } from '@/services/uiPermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface UIPermission {
  role: string;
  permission_key: string;
  is_granted: boolean;
  context: any;
}

const PERMISSION_CATEGORIES = {
  'Debug Tools': [
    'ui.debug.show_test_buttons',
    'ui.debug.show_metadata',
    'ui.debug.show_live_badges',
    'ui.debug.show_performance_metrics'
  ],
  'Admin Features': [
    'ui.admin.show_user_management',
    'ui.admin.show_system_info'
  ],
  'Application Features': [
    'features.aso_ai_audit',
    'features.growth_accelerators',
    'features.metadata_generator',
    'features.keyword_intelligence',
    'features.creative_intelligence',
    'features.competitive_analysis',
    'features.advanced_analytics'
  ]
};

const ROLE_HIERARCHY = [
  'SUPER_ADMIN',
  'ORGANIZATION_ADMIN', 
  'ASO_MANAGER',
  'ANALYST',
  'VIEWER',
  'CLIENT'
];

export const UIPermissionManager: React.FC = () => {
  const { profile } = useUserProfile();
  const orgId = profile?.organization_id;
  const { roleBaseline, orgDefaults, refreshPermissions } = useUIPermissions(orgId);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({});
  const { toast } = useToast();

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ui_permissions')
        .select('role, permission_key, is_granted');

      if (error) throw error;

      // Organize permissions by role
      const organized: Record<string, Record<string, boolean>> = {};
      data?.forEach((perm: UIPermission) => {
        if (!organized[perm.role]) {
          organized[perm.role] = {};
        }
        organized[perm.role][perm.permission_key] = perm.is_granted;
      });

      setPermissions(organized);
      setChanges({});
    } catch (error) {
      console.error('Failed to load UI permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load UI permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const togglePermission = (role: string, permission: string, enabled: boolean) => {
    setChanges(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: enabled
      }
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const updates = [];
      
      for (const [role, roleChanges] of Object.entries(changes)) {
        for (const [permission, enabled] of Object.entries(roleChanges)) {
          updates.push({
            role,
            permission_key: permission,
            is_granted: enabled,
            updated_at: new Date().toISOString()
          });
        }
      }

      if (updates.length === 0) {
        toast({
          title: 'No Changes',
          description: 'No permission changes to save'
        });
        return;
      }

      const { error } = await supabase
        .from('ui_permissions')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated ${updates.length} permission(s)`
      });

      // Reload to reflect changes
      await loadPermissions();
    } catch (error) {
      console.error('Failed to save UI permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save permission changes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getEffectiveValue = (role: string, permission: string): boolean => {
    const change = changes[role]?.[permission];
    if (change !== undefined) return change;
    return permissions[role]?.[permission] ?? false;
  };

  const hasChanges = Object.keys(changes).length > 0 && 
    Object.values(changes).some(roleChanges => Object.keys(roleChanges).length > 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>UI Permission Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            UI Permission Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Control which UI elements are visible to different user roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadPermissions}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {hasChanges && (
            <Button 
              size="sm" 
              onClick={saveChanges}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {orgId && (import.meta as any).env?.VITE_UI_PERMISSIONS_ORG_DEFAULTS_ENABLED === 'true' && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-4 text-foreground">Org Defaults (current org)</h3>
            <div className="grid gap-4">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, keys]) => (
                <div key={`org-${category}`} className="space-y-2">
                  <h4 className="text-sm text-muted-foreground">{category}</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {keys.map((permission) => {
                      const current = orgDefaults?.[permission] ?? roleBaseline?.[permission] ?? false;
                      return (
                        <div key={`org-${permission}`} className="flex items-center justify-between">
                          <div className="text-sm">{permission}</div>
                          <Switch
                            checked={!!current}
                            onCheckedChange={async (checked) => {
                              if (!orgId) return;
                              try {
                                await uiPermissionService.updateOrgPermissions(orgId, { [permission]: checked });
                                await refreshPermissions();
                              } catch (e) {
                                toast({ title: 'Update failed', description: String(e), variant: 'destructive' });
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => (
          <div key={category}>
            <h3 className="font-semibold text-lg mb-4 text-foreground">{category}</h3>
            <div className="grid gap-4">
              {categoryPermissions.map(permission => (
                <div key={permission} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-medium">{permission.replace(/^ui\./, '').replace(/\./g, ' › ')}</h4>
                      <p className="text-sm text-muted-foreground">{permission}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {ROLE_HIERARCHY.map(role => (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <Label htmlFor={`${permission}-${role}`} className="text-xs font-medium">
                            {role.replace('_', ' ')}
                          </Label>
                          {changes[role]?.[permission] !== undefined && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Modified
                            </Badge>
                          )}
                        </div>
                        <Switch
                          id={`${permission}-${role}`}
                          checked={getEffectiveValue(role, permission)}
                          onCheckedChange={(checked) => togglePermission(role, permission, checked)}
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {hasChanges && (
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Unsaved Changes</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              You have unsaved permission changes. Click "Save Changes" to apply them.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
