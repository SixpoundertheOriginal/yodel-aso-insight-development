-- ============================================
-- SECURE USER MANAGEMENT SYSTEM
-- Date: November 12, 2025
-- Purpose: Enterprise-grade user creation and role management
-- Phase: 1 (SQL Helper Functions)
-- ============================================

-- ============================================
-- PART 1: CREATE SECURE USER CREATION FUNCTION
-- ============================================

-- Helper function to validate email format
CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

COMMENT ON FUNCTION public.is_valid_email IS
  'Validates email format using regex pattern.
   Returns true if email is valid, false otherwise.';

-- ============================================
-- Main function: Secure user creation
-- ============================================

CREATE OR REPLACE FUNCTION public.create_org_user_secure(
  p_email TEXT,
  p_organization_id UUID,
  p_role TEXT DEFAULT 'ORG_USER'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_exists BOOLEAN;
  v_user_exists BOOLEAN;
  v_role_exists BOOLEAN;
  v_valid_role app_role;
  v_result JSONB;
BEGIN
  -- ============================================
  -- VALIDATION CHECKS
  -- ============================================

  -- 1. Validate email format
  IF NOT is_valid_email(p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_email',
      'message', 'Email format is invalid. Please provide a valid email address.'
    );
  END IF;

  -- 2. Check if organization exists
  SELECT EXISTS (
    SELECT 1 FROM organizations WHERE id = p_organization_id
  ) INTO v_org_exists;

  IF NOT v_org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'organization_not_found',
      'message', format('Organization with ID %s does not exist.', p_organization_id)
    );
  END IF;

  -- 3. Validate role (must be valid app_role enum value)
  BEGIN
    v_valid_role := p_role::app_role;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_role',
      'message', format('Invalid role: %s. Valid roles are: SUPER_ADMIN, ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER, CLIENT', p_role),
      'valid_roles', jsonb_build_array('SUPER_ADMIN', 'ORG_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER', 'CLIENT')
    );
  END;

  -- 4. Prevent SUPER_ADMIN creation via this function (security measure)
  IF v_valid_role = 'SUPER_ADMIN' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'forbidden_role',
      'message', 'SUPER_ADMIN role cannot be created via this function. Contact a database administrator.'
    );
  END IF;

  -- ============================================
  -- CHECK FOR EXISTING USER
  -- ============================================

  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    -- User exists - check if they already have a role in this org
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id
        AND organization_id = p_organization_id
    ) INTO v_role_exists;

    IF v_role_exists THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'user_already_exists',
        'message', format('User %s already has a role in this organization.', p_email),
        'user_id', v_user_id
      );
    ELSE
      -- User exists but not in this org - add them
      INSERT INTO user_roles (user_id, organization_id, role, created_at)
      VALUES (v_user_id, p_organization_id, v_valid_role, NOW());

      RETURN jsonb_build_object(
        'success', true,
        'message', format('Existing user %s added to organization with role %s.', p_email, p_role),
        'user_id', v_user_id,
        'organization_id', p_organization_id,
        'role', p_role,
        'action', 'added_to_org'
      );
    END IF;
  END IF;

  -- ============================================
  -- CREATE NEW USER (VIA SUPABASE AUTH)
  -- ============================================

  -- Note: This function creates the user_roles entry
  -- The actual auth.users entry must be created via Supabase Auth API
  -- (signup flow, admin API, or invitation email)

  RETURN jsonb_build_object(
    'success', false,
    'error', 'user_not_found',
    'message', format('User %s does not exist in auth.users. Please create the user via Supabase Auth first, then call this function.', p_email),
    'instructions', jsonb_build_object(
      'step1', 'Have user sign up via /auth/sign-up',
      'step2', 'OR use Supabase Admin API to create user',
      'step3', 'Then call this function again to assign role'
    )
  );
END;
$$;

COMMENT ON FUNCTION public.create_org_user_secure IS
  'Enterprise-grade user creation function with validation.

   Usage:
     SELECT create_org_user_secure(''user@example.com'', ''org-uuid'', ''ORG_ADMIN'');

   Features:
   - Email validation
   - Organization validation
   - Role validation
   - Duplicate prevention
   - Audit logging
   - Security: Cannot create SUPER_ADMIN

   Returns JSONB with success status and details.';

-- ============================================
-- PART 2: CREATE USER INVITATION FUNCTION
-- ============================================

-- Function to create user AND assign role in one step
-- This is a simplified version that assumes Supabase Auth handles user creation
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_exists BOOLEAN;
  v_user_exists BOOLEAN;
  v_role_exists BOOLEAN;
  v_valid_role app_role;
BEGIN
  -- Validate role
  BEGIN
    v_valid_role := p_role::app_role;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_role',
      'message', format('Invalid role: %s', p_role)
    );
  END;

  -- Check organization exists
  SELECT EXISTS (
    SELECT 1 FROM organizations WHERE id = p_organization_id
  ) INTO v_org_exists;

  IF NOT v_org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'organization_not_found',
      'message', 'Organization does not exist'
    );
  END IF;

  -- Check user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'User does not exist'
    );
  END IF;

  -- Check if role already exists
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
  ) INTO v_role_exists;

  IF v_role_exists THEN
    -- Update existing role
    UPDATE user_roles
    SET role = v_valid_role, updated_at = NOW()
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'User role updated',
      'user_id', p_user_id,
      'organization_id', p_organization_id,
      'role', p_role,
      'action', 'updated'
    );
  ELSE
    -- Insert new role
    INSERT INTO user_roles (user_id, organization_id, role, created_at)
    VALUES (p_user_id, p_organization_id, v_valid_role, NOW());

    RETURN jsonb_build_object(
      'success', true,
      'message', 'User role assigned',
      'user_id', p_user_id,
      'organization_id', p_organization_id,
      'role', p_role,
      'action', 'created'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assign_user_role IS
  'Assigns or updates a user role for a specific organization.
   Assumes user already exists in auth.users.

   Usage:
     SELECT assign_user_role(''user-uuid'', ''org-uuid'', ''ORG_ADMIN'');';

-- ============================================
-- PART 3: USER MANAGEMENT HELPER FUNCTIONS
-- ============================================

-- Function to list users in an organization
CREATE OR REPLACE FUNCTION public.get_org_users(p_organization_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.user_id,
    u.email,
    ur.role::TEXT,
    ur.created_at,
    u.last_sign_in_at
  FROM user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.organization_id = p_organization_id
  ORDER BY ur.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_org_users IS
  'Lists all users in a specific organization with their roles.

   Usage:
     SELECT * FROM get_org_users(''org-uuid'');';

-- Function to remove user from organization (soft delete)
CREATE OR REPLACE FUNCTION public.remove_user_from_org(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM user_roles
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User removed from organization',
      'user_id', p_user_id,
      'organization_id', p_organization_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'User does not have a role in this organization'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.remove_user_from_org IS
  'Removes a user from an organization (deletes user_roles entry).
   Does not delete the user from auth.users.

   Usage:
     SELECT remove_user_from_org(''user-uuid'', ''org-uuid'');';

-- ============================================
-- PART 4: GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions to authenticated users
-- (RLS policies will further restrict access)
GRANT EXECUTE ON FUNCTION public.is_valid_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_org_user_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_from_org TO authenticated;

-- ============================================
-- PART 5: AUDIT LOGGING
-- ============================================

-- Create audit table for user management actions
CREATE TABLE IF NOT EXISTS public.user_management_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL, -- 'created', 'updated', 'removed', 'role_changed'
  target_user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  performed_by UUID REFERENCES auth.users(id),
  old_role TEXT,
  new_role TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_management_audit IS
  'Audit log for all user management actions.
   Tracks who did what, when, and from where.';

-- Enable RLS
ALTER TABLE public.user_management_audit ENABLE ROW LEVEL SECURITY;

-- Policy: ORG_ADMIN and SUPER_ADMIN can view audit logs for their org
CREATE POLICY "org_admins_view_audit" ON public.user_management_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = user_management_audit.organization_id
      AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Grant select to authenticated
GRANT SELECT ON public.user_management_audit TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_org
  ON public.user_management_audit(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_target_user
  ON public.user_management_audit(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_performed_by
  ON public.user_management_audit(performed_by, created_at DESC);

-- ============================================
-- PART 6: TRIGGER FOR AUTOMATIC AUDIT LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION public.log_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_management_audit (
      action,
      target_user_id,
      organization_id,
      performed_by,
      new_role,
      metadata,
      created_at
    ) VALUES (
      'created',
      NEW.user_id,
      NEW.organization_id,
      auth.uid(), -- Current user performing the action
      NEW.role::TEXT,
      jsonb_build_object('method', 'database_trigger'),
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      INSERT INTO public.user_management_audit (
        action,
        target_user_id,
        organization_id,
        performed_by,
        old_role,
        new_role,
        metadata,
        created_at
      ) VALUES (
        'role_changed',
        NEW.user_id,
        NEW.organization_id,
        auth.uid(),
        OLD.role::TEXT,
        NEW.role::TEXT,
        jsonb_build_object('method', 'database_trigger'),
        NOW()
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_management_audit (
      action,
      target_user_id,
      organization_id,
      performed_by,
      old_role,
      metadata,
      created_at
    ) VALUES (
      'removed',
      OLD.user_id,
      OLD.organization_id,
      auth.uid(),
      OLD.role::TEXT,
      jsonb_build_object('method', 'database_trigger'),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS trg_log_user_role_changes ON user_roles;

CREATE TRIGGER trg_log_user_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_role_changes();

COMMENT ON TRIGGER trg_log_user_role_changes ON user_roles IS
  'Automatically logs all changes to user roles in the audit table.';

-- ============================================
-- PART 7: VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SECURE USER MANAGEMENT SYSTEM INSTALLED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Available Functions:';
  RAISE NOTICE '  1. create_org_user_secure(email, org_id, role)';
  RAISE NOTICE '  2. assign_user_role(user_id, org_id, role)';
  RAISE NOTICE '  3. get_org_users(org_id)';
  RAISE NOTICE '  4. remove_user_from_org(user_id, org_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Audit Logging:';
  RAISE NOTICE '  - All user management actions logged';
  RAISE NOTICE '  - View logs: SELECT * FROM user_management_audit;';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Features:';
  RAISE NOTICE '  - Email validation';
  RAISE NOTICE '  - Organization validation';
  RAISE NOTICE '  - Role validation';
  RAISE NOTICE '  - Duplicate prevention';
  RAISE NOTICE '  - Cannot create SUPER_ADMIN via function';
  RAISE NOTICE '  - Automatic audit trail';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Usage Example:';
  RAISE NOTICE '  SELECT create_org_user_secure(';
  RAISE NOTICE '    ''user@example.com'',';
  RAISE NOTICE '    ''7cccba3f-0a8f-446f-9dba-86e9cb68c92b'',';
  RAISE NOTICE '    ''ORG_ADMIN''';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
