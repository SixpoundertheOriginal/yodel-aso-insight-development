-- SECURITY FIXES - Phase 2: Fix Function Search Path Issues (Critical Security)

-- Fix search_path for critical security functions
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = $1 
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL  -- TRUE Platform super admin
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_permission(permission_to_check text, target_organization_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  has_permission BOOLEAN := FALSE;
BEGIN
  -- Check for permission through platform-wide roles (organization_id IS NULL in user_roles)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = v_user_id
      AND ur.organization_id IS NULL -- Platform-wide role
      AND rp.permission_name = permission_to_check
  ) INTO has_permission;

  IF has_permission THEN
    RETURN TRUE;
  END IF;

  -- If target_organization_id is provided, check for permission through roles specific to that organization
  IF target_organization_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = v_user_id
        AND ur.organization_id = target_organization_id -- Role specific to this organization
        AND rp.permission_name = permission_to_check
    ) INTO has_permission;
  END IF;

  RETURN has_permission;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_organization_id_enhanced()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN public.is_super_admin(auth.uid()) THEN 
        -- For super admin, return first available organization for frontend
        (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
      ELSE 
        -- Regular users get their organization
        (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_frontend_permissions()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN public.is_super_admin(auth.uid()) THEN 
        jsonb_build_object(
          'is_super_admin', true,
          'can_see_all_orgs', true,
          'organization_id', (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1),
          'role', 'super_admin',
          'access_level', 'platform',
          'permissions', jsonb_build_object(
            'platform', '*',
            'organizations', '*', 
            'users', '*',
            'billing', '*'
          )
        )
      ELSE 
        jsonb_build_object(
          'is_super_admin', false,
          'can_see_all_orgs', false,
          'organization_id', (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
          'role', (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
          'access_level', 'organization',
          'permissions', jsonb_build_object(
            'organization', 'read_write',
            'apps', 'read_write'
          )
        )
    END;
$$;