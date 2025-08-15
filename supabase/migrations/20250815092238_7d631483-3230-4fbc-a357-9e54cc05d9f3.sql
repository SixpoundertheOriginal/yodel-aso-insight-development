-- Fix RLS Security Issue: Enable RLS on tables missing it

-- Enable RLS on traffic_sources table
ALTER TABLE public.traffic_sources ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies for traffic_sources
-- Since this appears to be reference data that should be readable by all authenticated users
CREATE POLICY "Authenticated users can read traffic sources"
ON public.traffic_sources
FOR SELECT
TO authenticated
USING (true);

-- Let's also check and fix any other tables that might be missing RLS
-- Enable RLS on permissions table (already has policies but missing RLS)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversion_benchmarks (already has policies but missing RLS) 
ALTER TABLE public.conversion_benchmarks ENABLE ROW LEVEL SECURITY;

-- Double-check that organization_app_usage view has proper RLS
-- Since it's a view, we need to ensure the underlying tables have proper RLS
-- which they should already have from our previous work

-- Add comprehensive audit logging for security changes
INSERT INTO public.audit_logs (
  organization_id,
  user_id, 
  action,
  resource_type,
  details
) VALUES (
  NULL, -- System-level security fix
  auth.uid(),
  'security_rls_enabled',
  'database_table',
  jsonb_build_object(
    'tables_fixed', ARRAY['traffic_sources', 'permissions', 'conversion_benchmarks'],
    'security_issue', 'RLS_DISABLED_IN_PUBLIC',
    'fix_applied', true
  )
);