
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { MiddlewareFunction, ApiRequest, ApiResponse } from './types';

export const withAuth: MiddlewareFunction = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const authHeaderValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    
    if (!authHeaderValue?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_MISSING'
      });
      return;
    }

    const token = authHeaderValue.substring(7);
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID'
      });
      return;
    }

    // Get user profile and organization/role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, user_roles(role, organization_id)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
      return;
    }

    const userRoles = (profile.user_roles || []) as Tables<'user_roles'>[];
    const isSuperAdmin = userRoles.some(
      (r) => r.role?.toLowerCase() === 'super_admin' && r.organization_id === null
    );

    if (!isSuperAdmin && !profile.organization_id) {
      res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_REQUIRED'
      });
      return;
    }

    // Attach user data to request
    req.user = user;
    req.organizationId = profile.organization_id || null;
    req.isSuperAdmin = isSuperAdmin;

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication verification failed',
      code: 'AUTH_ERROR'
    });
  }
};
