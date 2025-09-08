import { supabase } from "@/integrations/supabase/client";

export interface SecurityAuditLog {
  event_type: 'app_approval' | 'app_revocation' | 'unauthorized_access' | 'data_query' | 'demo_data_access';
  user_id: string;
  organization_id: string;
  resource_id?: string;
  action_details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export class SecurityAuditService {
  static async logSecurityEvent(event: SecurityAuditLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: event.event_type,
          resource_type: 'security_event',
          resource_id: event.resource_id,
          organization_id: event.organization_id,
          user_id: event.user_id,
          details: {
            severity: event.severity,
            ...event.action_details
          },
          ip_address: event.ip_address || null,
          user_agent: event.user_agent || null
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security audit logging failed:', error);
    }
  }

  static async logUnauthorizedAccess(
    userId: string,
    organizationId: string,
    attemptedResource: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'unauthorized_access',
      user_id: userId,
      organization_id: organizationId,
      resource_id: attemptedResource,
      action_details: details,
      severity: 'CRITICAL'
    });
  }

  static async logAppApproval(
    userId: string,
    organizationId: string,
    appId: string,
    approved: boolean
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: approved ? 'app_approval' : 'app_revocation',
      user_id: userId,
      organization_id: organizationId,
      resource_id: appId,
      action_details: { approved },
      severity: 'INFO'
    });
  }

  static async logDemoDataAccess(
    userId: string,
    organizationId: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'demo_data_access',
      user_id: userId,
      organization_id: organizationId,
      action_details: details,
      severity: 'INFO'
    });
  }
}