import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { featureAccessService } from '@/services/featureAccess';
import { PLATFORM_FEATURES, FEATURE_LABELS } from '@/constants/features';
import { Loader2, Save } from 'lucide-react';

interface OrganizationFeatureManagerProps {
  organizationId: string;
  organizationName?: string;
}

export const OrganizationFeatureManager: React.FC<OrganizationFeatureManagerProps> = ({
  organizationId,
  organizationName
}) => {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setLoading(true);
        const orgFeatures = await featureAccessService.getOrganizationFeatures(organizationId);
        setFeatures(orgFeatures);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to fetch organization features:', error);
        toast({
          title: 'Error',
          description: 'Failed to load feature settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchFeatures();
    }
  }, [organizationId, toast]);

  const toggleFeature = (featureKey: string, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [featureKey]: enabled }));
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      await featureAccessService.bulkUpdateFeatures(organizationId, features);
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Feature access updated successfully',
      });
    } catch (error) {
      console.error('Failed to update feature access:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature access',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Access Control</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Feature Access Control</CardTitle>
          {organizationName && (
            <p className="text-sm text-muted-foreground mt-1">
              Managing features for {organizationName}
            </p>
          )}
        </div>
        {hasChanges && (
          <Button onClick={saveChanges} disabled={saving} size="sm">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {Object.entries(PLATFORM_FEATURES).map(([key, featureKey]) => (
            <div key={featureKey} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor={featureKey} className="text-sm font-medium">
                  {FEATURE_LABELS[featureKey]}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {featureKey.replace(/_/g, ' ')}
                </p>
              </div>
              <Switch
                id={featureKey}
                checked={features[featureKey] || false}
                onCheckedChange={(checked) => toggleFeature(featureKey, checked)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
        
        {hasChanges && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              You have unsaved changes. Make sure to save before navigating away.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};