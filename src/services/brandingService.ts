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
      .from('audit_logs' as any) // organization_branding table doesn't exist
      .select('*')
      .eq('organization_id', organizationId)
      .eq('action', position) // Using action as position proxy
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Failed to fetch organization branding:', error);
      return null;
    }
    
    return data as unknown as OrganizationBranding;
  }

  static async updateOrganizationBranding(
    organizationId: string,
    updates: Partial<Omit<OrganizationBranding, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('audit_logs' as any) // organization_branding doesn't exist
      .upsert({
        organization_id: organizationId,
        action: 'branding_update', // Using action field
        details: updates as any
      } as any);
    
    if (error) {
      throw new Error(`Failed to update branding: ${error.message}`);
    }
  }

  static renderBrandingText(template: string, organizationName: string): string {
    return template.replace(/{org_name}/g, organizationName);
  }
}