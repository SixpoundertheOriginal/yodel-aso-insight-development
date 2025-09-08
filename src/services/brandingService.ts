import { supabase } from '@/integrations/supabase/client';

export interface OrganizationBranding {
  id: string;
  organization_id: string;
  branding_template: string;
  custom_message?: string;
  position: 'footer' | 'header' | 'sidebar';
  logo_url?: string;
  is_enabled: boolean;
  style_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class BrandingService {
  static async getOrganizationBranding(
    organizationId: string, 
    position: string = 'footer'
  ): Promise<OrganizationBranding | null> {
    const { data, error } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('position', position)
      .eq('is_enabled', true)
      .maybeSingle();
    
    if (error) {
      console.error('Failed to fetch organization branding:', error);
      return null;
    }
    
    return data as OrganizationBranding;
  }

  static async updateOrganizationBranding(
    organizationId: string,
    updates: Partial<Omit<OrganizationBranding, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('organization_branding')
      .upsert({
        organization_id: organizationId,
        position: 'footer',
        ...updates,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Failed to update branding: ${error.message}`);
    }
  }

  static renderBrandingText(template: string, organizationName: string): string {
    return template.replace(/{org_name}/g, organizationName);
  }
}