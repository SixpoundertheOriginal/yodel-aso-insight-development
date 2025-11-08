// @ts-nocheck - Tables referenced in this file don't exist in current database schema
import { supabase } from '@/integrations/supabase/client';
import { PlatformFeature } from '@/constants/features';

interface PlatformFeatureData {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string;
  category: string;
  is_active: boolean;
}

interface UserFeatureAccess {
  feature_key: string;
  org_enabled: boolean;
  user_override?: boolean;
  has_access: boolean;
}

export class FeatureAccessService {
  // Get organization's enabled features (legacy method for backward compatibility)
  async getOrgFeatures(organizationId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('organization_features')
        .select('feature_key')
        .eq('organization_id', organizationId)
        .eq('is_enabled', true);
      
      if (error) {
        console.error('Error fetching organization features:', error);
        // If table doesn't exist or RLS blocks access, return empty array to trigger fallback
        throw error;
      }
      
      return data?.map(f => f.feature_key) || [];
    } catch (error) {
      console.error('Feature access service error:', error);
      throw error;
    }
  }

  // Get all platform features with organization and user access status
  async getUserFeatureAccess(userId: string, organizationId: string): Promise<UserFeatureAccess[]> {
    try {
      // Get all platform features with org entitlements and user overrides
      const { data, error } = await supabase
        .from('platform_features')
        .select(`
          feature_key,
          feature_name,
          category,
          is_active,
          organization_features!left(is_enabled),
          user_feature_overrides!left(is_enabled, expires_at)
        `)
        .eq('organization_features.organization_id', organizationId)
        .eq('user_feature_overrides.user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user feature access:', error);
        return [];
      }

      return data?.map((feature: any) => {
        const orgAccess = feature.organization_features as any[] || [];
        const userOverrides = feature.user_feature_overrides as any[] || [];
        
        const orgEnabled = orgAccess.length > 0 ? orgAccess[0].is_enabled : false;
        const userOverride = userOverrides.length > 0 ? userOverrides[0] : null;
        const hasValidOverride = userOverride && (!userOverride.expires_at || new Date(userOverride.expires_at) > new Date());
        
        return {
          feature_key: feature.feature_key,
          org_enabled: orgEnabled,
          user_override: hasValidOverride ? userOverride.is_enabled : undefined,
          has_access: hasValidOverride ? userOverride.is_enabled : orgEnabled
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching user feature access:', error);
      return [];
    }
  }

  // Check if user has access to a specific feature
  async hasFeatureAccess(userId: string, organizationId: string, featureKey: string): Promise<boolean> {
    try {
      // First check for user override
      const { data: userOverride } = await supabase
        .from('user_feature_overrides')
        .select('is_enabled, expires_at')
        .eq('user_id', userId)
        .eq('feature_key', featureKey)
        .single();

      // If user has valid override, use that
      if (userOverride && (!userOverride.expires_at || new Date(userOverride.expires_at) > new Date())) {
        return userOverride.is_enabled;
      }

      // Otherwise check organization entitlement
      const { data: orgAccess } = await supabase
        .from('organization_features')
        .select('is_enabled')
        .eq('organization_id', organizationId)
        .eq('feature_key', featureKey)
        .single();

      return orgAccess?.is_enabled || false;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  // Log feature usage for analytics
  async logFeatureUsage(featureKey: string, usageType: string = 'access', metadata: any = {}) {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.data.user.id)
        .single();

      if (!profile?.organization_id) return;

      await supabase
        .from('feature_usage_logs')
        .insert({
          user_id: user.data.user.id,
          organization_id: profile.organization_id,
          feature_key: featureKey,
          usage_type: usageType,
          metadata
        });
    } catch (error) {
      console.error('Error logging feature usage:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  async checkFeatureAccess(organizationId: string, featureKey: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('organization_features')
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
      .from('organization_features')
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
      .from('organization_features')
      .upsert(updates);
    
    if (error) {
      console.error('Error bulk updating features:', error);
      throw error;
    }
  }

  async getOrganizationFeatures(organizationId: string): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .from('organization_features')
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