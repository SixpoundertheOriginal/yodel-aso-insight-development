import { supabase } from '@/integrations/supabase/client';

interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

// Boot-time environment logging (runs once)
let envLogged = false;
function logAdminEnvOnce() {
  if (envLogged) return;
  envLogged = true;
  console.info('[ADMIN_BOOT] Using Supabase Edge Functions for admin API calls');
}

// Content-type guard for responses
function assertJsonResponse(contentType: string | null, body: string): void {
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(
      `AdminNonJson: Expected JSON, got "${contentType}" → ${body.slice(0, 120)}...`
    );
  }
}

// Get current organization ID for RLS context
async function getCurrentOrgId(): Promise<string | null> {
  // Try localStorage first
  const storedOrgId = localStorage.getItem('currentOrgId');
  if (storedOrgId) return storedOrgId;
  
  // Fallback disabled due to TypeScript complexity - admin operations should provide explicit orgId
  return null;
}

// Core admin function invocation with logging and guards
export async function invokeAdminFunction<T = any>(
  functionName: string,
  payload: any = {},
  orgId?: string
): Promise<T> {
  logAdminEnvOnce();

  try {
    // Get auth session
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session?.access_token) {
      throw new AdminApiError('No valid session found', 401);
    }

    // Get org context if not provided
    const resolvedOrgId = orgId || await getCurrentOrgId();
    
    // Add org context to payload if available
    const finalPayload = resolvedOrgId 
      ? { ...payload, organizationId: resolvedOrgId }
      : payload;

    // Log request details (masking sensitive info)
    console.log(`🔧 [AdminClient] Invoking ${functionName}`, {
      hasAuth: !!session.session.access_token,
      authPreview: session.session.access_token?.slice(0, 12) + '...',
      orgId: resolvedOrgId,
      payloadKeys: Object.keys(finalPayload)
    });

    // Invoke Supabase Edge Function
    const { data, error, status } = await supabase.functions.invoke(functionName, {
      body: finalPayload,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      }
    });

    // Check for function invocation error
    if (error) {
      const context = (error as any)?.context;
      let bodyPreview: string | undefined;

      if (context && typeof context.text === 'function') {
        try {
          const raw = await context.text();
          bodyPreview = raw;

          try {
            const parsed = JSON.parse(raw);
            if (parsed?.error?.details) {
              console.error(`🔧 [AdminClient] ${functionName} error details:`, parsed.error.details);
            }
          } catch (_jsonError) {
            // Ignore JSON parse errors, keep raw body
          }
        } catch (readError) {
          console.warn(`🔧 [AdminClient] Failed to read error body for ${functionName}:`, readError);
        }
      }

      console.error(`🔧 [AdminClient] Function ${functionName} invocation error:`, {
        name: error.name,
        message: error.message,
        status: context?.status,
        body: bodyPreview,
        payloadKeys: Object.keys(finalPayload)
      });
      throw new AdminApiError(
        error.message || `Function ${functionName} failed`,
        500,
        error
      );
    }

    // The response from Edge Functions is already parsed JSON
    // But we still need to check the response structure
    if (data && typeof data === 'object') {
      // Check if it's an error response
      if (!data.success && data.error) {
        console.error(`🔧 [AdminClient] Function ${functionName} returned error`, {
          statusCode: data.status ?? status ?? 'unknown',
          error: data.error,
          payloadKeys: Object.keys(finalPayload),
        });
        throw new AdminApiError(
          data.error,
          data.status || 400,
          data
        );
      }
      
      // Check if it's a successful response
      if (data.success) {
        return data.data as T;
      }
    }

    // If we get here, return the data as-is (for edge functions that don't follow the standard format)
    console.warn(`🔧 [AdminClient] Non-standard response format from ${functionName}:`, data);
    return data as T;

  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }
    
    console.error(`🔧 [AdminClient] Error calling ${functionName}:`, error);
    throw new AdminApiError(
      error instanceof Error ? error.message : 'Unknown admin API error',
      500
    );
  }
}

// Specialized functions for different admin operations
export const adminClient = {
  // Generic function invocation
  invoke: invokeAdminFunction,

  // Convenience methods for common operations
  get: <T>(functionName: string, payload?: any, orgId?: string) => 
    invokeAdminFunction<T>(functionName, payload, orgId),

  post: <T>(functionName: string, data: any, orgId?: string) => 
    invokeAdminFunction<T>(functionName, { ...data, method: 'POST' }, orgId),

  put: <T>(functionName: string, id: string, data: any, orgId?: string) => 
    invokeAdminFunction<T>(functionName, { ...data, id, method: 'PUT' }, orgId),

  delete: <T>(functionName: string, id: string, orgId?: string) => 
    invokeAdminFunction<T>(functionName, { id, method: 'DELETE' }, orgId),
};
