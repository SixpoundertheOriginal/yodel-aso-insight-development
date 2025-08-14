-- Enhanced RBAC Database Functions and Policies

-- 1. Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = $1 
      AND role = 'SUPER_ADMIN'
      AND organization_id IS NULL  -- Super admin is platform-wide
  );
$$;

-- 2. Enhanced organization ID getter with super admin bypass
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id_enhanced()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  -- If user is super admin, they can access any organization's data
  -- For now, return their profile org_id or null to allow access
  SELECT 
    CASE 
      WHEN public.is_super_admin(auth.uid()) THEN 
        -- Super admins can see all data, return their profile org or allow null
        COALESCE(
          (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
          '00000000-0000-0000-0000-000000000000'::uuid
        )
      ELSE 
        (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    END;
$$;

-- 3. Role assignment function with security checks
CREATE OR REPLACE FUNCTION public.assign_role(
  target_user_id UUID,
  new_role TEXT,
  target_organization_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  is_current_super_admin BOOLEAN;
  is_current_org_admin BOOLEAN;
BEGIN
  -- Security checks
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if current user is super admin
  SELECT public.is_super_admin(current_user_id) INTO is_current_super_admin;
  
  -- Check if current user is org admin for the target organization
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = current_user_id 
      AND role = 'ORGANIZATION_ADMIN' 
      AND organization_id = target_organization_id
  ) INTO is_current_org_admin;

  -- Permission checks
  IF new_role = 'SUPER_ADMIN' AND NOT is_current_super_admin THEN
    RAISE EXCEPTION 'Only super admins can assign super admin role';
  END IF;

  IF NOT is_current_super_admin AND NOT is_current_org_admin THEN
    RAISE EXCEPTION 'Insufficient permissions to assign roles';
  END IF;

  -- Remove existing role for this user/org combination
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id 
    AND (organization_id = target_organization_id OR (organization_id IS NULL AND target_organization_id IS NULL));

  -- Insert new role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (target_user_id, target_organization_id, new_role::USER-DEFINED);

  -- Update audit log
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    details
  ) VALUES (
    target_organization_id,
    current_user_id,
    'role_assigned',
    'user',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'role', new_role,
      'organization_id', target_organization_id
    )
  );

  RETURN TRUE;
END;
$$;

-- 4. Trigger to enforce profile organization rules
CREATE OR REPLACE FUNCTION public.enforce_profile_org()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Super admins can have NULL organization_id
  IF NEW.organization_id IS NULL THEN
    -- Check if user has super admin role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.id 
        AND role = 'SUPER_ADMIN' 
        AND organization_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Only super admins can have NULL organization_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_profile_org_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_org_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_org();

-- 5. Update RLS policies to allow super admin bypass across all org-scoped tables

-- Update profiles RLS
DROP POLICY IF EXISTS "Super admin bypass for profiles" ON public.profiles;
CREATE POLICY "Super admin bypass for profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (public.is_super_admin() OR id = auth.uid() OR organization_id = get_current_user_organization_id());

-- Update organizations RLS  
DROP POLICY IF EXISTS "Super admin access to all organizations" ON public.organizations;
CREATE POLICY "Super admin access to all organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Update apps RLS
DROP POLICY IF EXISTS "Super admin can manage all apps" ON public.apps;
CREATE POLICY "Super admin can manage all apps"
ON public.apps
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Update audit_logs RLS
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can view all audit logs"
ON public.audit_logs
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Apply super admin bypass to all other org-scoped tables
DROP POLICY IF EXISTS "Super admin bypass keyword_ranking_history" ON public.keyword_ranking_history;
CREATE POLICY "Super admin bypass keyword_ranking_history"
ON public.keyword_ranking_history
FOR ALL
TO authenticated
USING (public.is_super_admin() OR organization_id = get_current_user_organization_id());

DROP POLICY IF EXISTS "Super admin bypass competitor_keywords" ON public.competitor_keywords;
CREATE POLICY "Super admin bypass competitor_keywords"
ON public.competitor_keywords
FOR ALL
TO authenticated
USING (public.is_super_admin() OR organization_id = get_current_user_organization_id());

DROP POLICY IF EXISTS "Super admin bypass ai_insights" ON public.ai_insights;
CREATE POLICY "Super admin bypass ai_insights"
ON public.ai_insights
FOR ALL
TO authenticated
USING (public.is_super_admin() OR organization_id = get_current_user_organization_id());

-- 6. Create function to securely create organizations (super admin only)
CREATE OR REPLACE FUNCTION public.create_organization_secure(
  org_name TEXT,
  org_slug TEXT,
  admin_user_id UUID,
  subscription_tier TEXT DEFAULT 'free'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Only super admins can create organizations
  IF NOT public.is_super_admin(current_user_id) THEN
    RAISE EXCEPTION 'Only super admins can create organizations';
  END IF;

  -- Create organization
  INSERT INTO public.organizations (name, slug, subscription_tier)
  VALUES (org_name, org_slug, subscription_tier)
  RETURNING id INTO new_org_id;

  -- Assign the admin user to the organization
  UPDATE public.profiles 
  SET organization_id = new_org_id 
  WHERE id = admin_user_id;

  -- Give them organization admin role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (admin_user_id, new_org_id, 'ORGANIZATION_ADMIN');

  -- Log the action
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    details
  ) VALUES (
    new_org_id,
    current_user_id,
    'organization_created',
    'organization',
    jsonb_build_object(
      'organization_name', org_name,
      'admin_user_id', admin_user_id,
      'subscription_tier', subscription_tier
    )
  );

  RETURN new_org_id;
END;
$$;