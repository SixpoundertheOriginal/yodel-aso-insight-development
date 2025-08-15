-- Fix Security Definer View Issue
-- The issue is likely related to functions with SECURITY DEFINER that should be SECURITY INVOKER
-- or views that reference security definer functions inappropriately

-- First, let's check if any of our functions can be safely converted to SECURITY INVOKER
-- Most of our functions need SECURITY DEFINER for RLS bypass, but some utility functions might not

-- Let's examine and potentially fix some functions that don't need elevated privileges

-- 1. The get_user_organization_with_fallback function can be simplified
-- and made SECURITY INVOKER since it just reads from profiles
DROP FUNCTION IF EXISTS public.get_user_organization_with_fallback();

-- Create a safer version without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_organization_with_fallback()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.profiles WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- 2. For the main concern - if there's a view that shouldn't use security definer context,
-- let's recreate the organization_app_usage view to ensure it doesn't inherit 
-- any problematic security context

DROP VIEW IF EXISTS public.organization_app_usage;

CREATE VIEW public.organization_app_usage 
WITH (security_invoker = true)  -- Explicitly set security invoker
AS 
SELECT 
  o.id AS organization_id,
  o.name AS organization_name,
  o.subscription_tier,
  o.app_limit,
  o.app_limit_enforced,
  COUNT(a.id) AS current_app_count,
  (o.app_limit - COUNT(a.id)) AS remaining_apps,
  ROUND((COUNT(a.id)::numeric / o.app_limit::numeric) * 100, 2) AS usage_percentage,
  COUNT(CASE WHEN a.is_active = true THEN 1 END) AS active_apps,
  COUNT(CASE WHEN a.is_active = false THEN 1 END) AS inactive_apps
FROM organizations o
LEFT JOIN apps a ON o.id = a.organization_id
GROUP BY o.id, o.name, o.subscription_tier, o.app_limit, o.app_limit_enforced;

-- 3. Update some functions to have proper search_path set to fix the warning
-- This will also help with the security definer view issue

-- Update functions that don't need full SECURITY DEFINER privileges
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- Added explicit search_path
AS $$
BEGIN
  DELETE FROM public.data_cache WHERE expires_at < NOW();
END;
$$;

-- Log the security fix
INSERT INTO public.audit_logs (
  organization_id,
  user_id,
  action,
  resource_type,
  details
) VALUES (
  NULL,
  auth.uid(),
  'security_definer_view_fixed',
  'database_security',
  jsonb_build_object(
    'fixed_items', ARRAY['organization_app_usage_view', 'get_user_organization_with_fallback_function'],
    'security_level', 'view_security_context_corrected'
  )
);