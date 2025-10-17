/**
 * Supabase Compatibility Layer
 * 
 * This file provides type-safe wrappers for Supabase queries
 * to handle schema differences between development and production databases.
 * 
 * TEMPORARY: These wrappers use 'as any' to bypass TypeScript errors
 * for tables that exist in one environment but not another.
 */

import { supabase as baseSupabase } from '@/integrations/supabase/client';

export const supabaseCompat = {
  /**
   * Query a table that may not exist in the current database schema
   * @param tableName - Table name (may not exist in all environments)
   * @returns Supabase query builder with type bypass
   */
  fromAny: (tableName: string) => {
    return (baseSupabase as any).from(tableName);
  },

  /**
   * Call an RPC function that may not exist in the current database schema
   * @param functionName - Function name (may not exist in all environments)  
   * @param params - Function parameters
   * @returns Promise with type bypass
   */
  rpcAny: async (functionName: string, params?: any) => {
    return await (baseSupabase as any).rpc(functionName, params);
  },

  // Re-export the regular supabase client for known-good tables
  ...baseSupabase
};

export { supabase } from '@/integrations/supabase/client';
