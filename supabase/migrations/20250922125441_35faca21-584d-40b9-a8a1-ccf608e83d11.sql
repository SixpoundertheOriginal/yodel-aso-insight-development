-- SECURITY FIXES - Phase 2B: Continue fixing remaining functions

-- Fix more critical functions with search_path
CREATE OR REPLACE FUNCTION public.assign_super_admin_role(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Ensure target_user_id exists in profiles table
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User with ID % not found in profiles. Cannot assign SUPER_ADMIN role.', target_user_id;
  END IF;

  -- Remove any existing SUPER_ADMIN roles for this user to prevent duplicates and ensure idempotency
  DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = 'SUPER_ADMIN';

  -- Assign SUPER_ADMIN role (platform-wide, so organization_id is NULL)
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (target_user_id, NULL, 'SUPER_ADMIN');

  RAISE NOTICE 'SUPER_ADMIN role assigned to user %', target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization_and_assign_admin(org_name text, org_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_id uuid;
  calling_user_id uuid := auth.uid();
BEGIN
  -- Step 1: Create the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Step 2: Update the profile of the user who called this function
  -- to assign them to the new organization.
  UPDATE public.profiles
  SET organization_id = new_org_id
  WHERE id = calling_user_id;

  -- Step 3: Assign the 'ORGANIZATION_ADMIN' role to the user for the new organization.
  -- This ensures the creator has full control over their new organization.
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (calling_user_id, new_org_id, 'ORGANIZATION_ADMIN');

  -- Return the ID of the newly created organization
  RETURN new_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_with_fallback()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_ui_permissions(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(permission_key character varying, is_granted boolean, context jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.permission_key,
    up.is_granted,
    up.context
  FROM public.ui_permissions up
  WHERE up.role IN (
    SELECT ur.role::text 
    FROM public.user_roles ur 
    WHERE ur.user_id = p_user_id
  )
  AND up.is_granted = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_scraper_request(p_organization_id uuid, p_search_term text, p_user_agent text DEFAULT ''::text, p_ip_address inet DEFAULT NULL::inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log the request for rate limiting
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_organization_id,
    auth.uid(),
    'app_store_scraper_request',
    'api_request',
    jsonb_build_object('search_term', p_search_term),
    p_ip_address,
    p_user_agent
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail if logging fails
    RETURN false;
END;
$$;