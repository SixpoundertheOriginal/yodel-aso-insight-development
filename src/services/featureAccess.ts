import { supabase } from '@/integrations/supabase/client';
import { PlatformFeature } from '@/constants/features';

export class FeatureAccessService {
  async getOrgFeatures(organizationId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('org_feature_access')
      .select('feature_key')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true);
    
    if (error) {
      console.error('Error fetching organization features:', error);
      throw error;
    }
    
    return data?.map(f => f.feature_key) || [];
  }

  async checkFeatureAccess(organizationId: string, featureKey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('org_feature_access')
      .select('is_enabled')
      .eq('organization_id', organizationId)
      .eq('feature_key', featureKey)
      .single();
    
    if (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
    
    return data?.is_enabled || false;
  }

  async updateFeatureAccess(organizationId: string, featureKey: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('org_feature_access')
      .upsert({
        organization_id: organizationId,
        feature_key: featureKey,
        is_enabled: enabled,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error updating feature access:', error);
      throw error;
    }
  }

  async bulkUpdateFeatures(organizationId: string, features: Record<string, boolean>): Promise<void> {
    const updates = Object.entries(features).map(([featureKey, enabled]) => ({
      organization_id: organizationId,
      feature_key: featureKey,
      is_enabled: enabled,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('org_feature_access')
      .upsert(updates);
    
    if (error) {
      console.error('Error bulk updating features:', error);
      throw error;
    }
  }

  async getOrganizationFeatures(organizationId: string): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .from('org_feature_access')
      .select('feature_key, is_enabled')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('Error fetching organization features:', error);
      throw error;
    }
    
    const features: Record<string, boolean> = {};
    data?.forEach(item => {
      features[item.feature_key] = item.is_enabled;
    });
    
    return features;
  }
}

export const featureAccessService = new FeatureAccessService();