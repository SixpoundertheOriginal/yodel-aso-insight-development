-- Fix RPC signature mismatch and enforce least privilege
DROP FUNCTION IF EXISTS public.get_pending_app_discoveries();

CREATE OR REPLACE FUNCTION public.get_pending_app_discoveries(
  p_organization_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Resolve org context from parameter or current user
  org_id := COALESCE(p_organization_id, get_current_user_organization_id());

  IF org_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Return empty array for now
  -- This would be populated by a separate discovery service/edge function
  RETURN '[]'::jsonb;
END;
$$;

-- Apply enterprise-grade permissions
REVOKE EXECUTE ON FUNCTION public.get_pending_app_discoveries(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_pending_app_discoveries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_app_discoveries(UUID) TO service_role;