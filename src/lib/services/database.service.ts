
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
      .from('chatgpt_queries' as any)
      .select('*')
      .eq('audit_run_id', auditRunId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id' as string, organizationId) as any;
    }
    
    return query as any;
  }

  /**
   * Updates chatgpt_audit_runs with explicit organization filtering
   */
  static async updateAuditRun(
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
    
    const { data, error } = await query.select();
    return { data, error };
  }

  /**
   * Updates chatgpt_queries with explicit organization filtering
   */
  static async updateChatGPTQuery(
    queryId: string,
    updates: any,
    options: DatabaseQueryOptions = {}
  ) {
    const { organizationId } = options;
    
    let query = supabase
      .from('chatgpt_queries' as any)
      .update(updates)
      .eq('id', queryId);
    
    // Add explicit organization filter if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query.select();
    return { data, error };
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
      isProcessing?: boolean;
    },
    options: DatabaseQueryOptions = {}
  ) {
    const { organizationId } = options;
    
    // DISABLED: processing_metadata column does not exist in chatgpt_audit_runs
    // Mock implementation until column is added
    console.log(`[MOCK] Update processing state for audit ${auditRunId} - BYPASSED (column does not exist)`);
    return { data: null, error: null };
  }

  /**
   * Retrieve processing state from the database
   * DISABLED: processing_metadata column does not exist
   */
  static async getProcessingState(auditRunId: string, options: DatabaseQueryOptions = {}) {
    // MOCK: Return null until processing_metadata column is added
    console.log(`[MOCK] Get processing state for audit ${auditRunId} - BYPASSED (column does not exist)`);
    return { data: null, error: null };
  }
}
