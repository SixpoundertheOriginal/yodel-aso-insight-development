
import { supabase } from '@/integrations/supabase/client';
import { MiddlewareFunction } from './types';

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

    // Check super admin status
    const { data: isSuperAdminData, error: superAdminError } = await supabase.rpc(
      'is_super_admin',
      { check_user_id: user.id }
    );

    const isSuperAdmin = Boolean(isSuperAdminData) && !superAdminError;
    let organizationId: string | null = null;

    if (!isSuperAdmin) {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id);

      if (rolesError || !roles || roles.length === 0 || !roles[0].organization_id) {
        res.status(403).json({
          error: 'Organization context required',
          code: 'ORG_REQUIRED'
        });
        return;
      }

      organizationId = roles[0].organization_id;
    }

    // Attach user data to request
    req.user = user;
    req.organizationId = organizationId;
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
