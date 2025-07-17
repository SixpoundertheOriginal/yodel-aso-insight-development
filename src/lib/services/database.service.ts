import { supabase } from '@/integrations/supabase/client';

interface DatabaseQueryOptions {
  organizationId?: string;
  userId?: string;
  bypassRLS?: boolean;
}

/**
 * Enhanced database service that provides explicit organization filtering
 * as a fallback when RLS policies fail due to authentication context issues
 */
export class DatabaseService {
  /**
   * Queries chatgpt_queries with explicit organization filtering
   */
  static getChatGPTQueries(
    auditRunId: string,
    options: DatabaseQueryOptions = {}
  ) {
    const { organizationId } = options;
    
    let query = supabase
      .from('chatgpt_queries')
      .select('*')
      .eq('audit_run_id', auditRunId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    return query;
  }

  /**
   * Updates chatgpt_audit_runs with explicit organization filtering
   */
  static updateAuditRun(
    auditRunId: string,
    updates: any,
    options: DatabaseQueryOptions = {}
  ) {
    const { organizationId } = options;
    
    let query = supabase
      .from('chatgpt_audit_runs')
      .update(updates)
      .eq('id', auditRunId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    return query;
  }

  /**
   * Updates chatgpt_queries with explicit organization filtering
   */
  static updateChatGPTQuery(
    queryId: string,
    updates: any,
    options: DatabaseQueryOptions = {}
  ) {
    const { organizationId } = options;
    
    let query = supabase
      .from('chatgpt_queries')
      .update(updates)
      .eq('id', queryId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    return query;
  }

  /**
   * Test authentication context by checking if we can get user info
   */
  static async testAuthContext(): Promise<{
    hasAuth: boolean;
    userId?: string;
    organizationId?: string;
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          hasAuth: false,
          error: userError?.message || 'No user found'
        };
      }

      // Try to get organization ID from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      return {
        hasAuth: true,
        userId: user.id,
        organizationId: profile?.organization_id || undefined,
        error: profileError?.message
      };
    } catch (error) {
      return {
        hasAuth: false,
        error: error.message
      };
    }
  }

  /**
   * Store processing state in the database for recovery
   */
  static async saveProcessingState(
    auditRunId: string,
    processingState: {
      currentQueryIndex: number;
      logs: string[];
      processingStats: any;
    },
    options: DatabaseQueryOptions = {}
  ) {
    const { organizationId } = options;
    
    let query = supabase
      .from('chatgpt_audit_runs')
      .update({
        processing_metadata: {
          ...processingState,
          lastUpdated: new Date().toISOString()
        }
      })
      .eq('id', auditRunId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    return query;
  }

  /**
   * Retrieve processing state from the database
   */
  static async getProcessingState(auditRunId: string, options: DatabaseQueryOptions = {}) {
    const { organizationId } = options;
    
    let query = supabase
      .from('chatgpt_audit_runs')
      .select('processing_metadata')
      .eq('id', auditRunId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query.single();
    return { data: data?.processing_metadata || null, error };
  }
}