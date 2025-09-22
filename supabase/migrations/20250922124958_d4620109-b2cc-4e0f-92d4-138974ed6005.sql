-- CRITICAL SECURITY FIXES - Phase 1: Database Security

-- Fix 1: Secure scrape_cache table - remove public access policy
-- Drop the existing policy that allows access when organization_id IS NULL
DROP POLICY IF EXISTS "Allow public read access to scrape_cache" ON public.scrape_cache;

-- Create secure scrape_cache policies
CREATE POLICY "Users can access cache for their organization"
ON public.scrape_cache
FOR ALL
TO authenticated
USING (
  -- Allow super admins to access all cache
  is_super_admin(auth.uid()) 
  OR 
  -- Organization members can only access their organization's cache
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization_id())
);

-- Fix 2: Secure audit_logs table - restrict NULL organization_id access
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can access their organization audit logs" ON public.audit_logs;

-- Create secure audit_logs policies
CREATE POLICY "Users can view audit logs for their organization"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  -- Super admins can see all audit logs (including platform-wide with NULL org_id)
  is_super_admin(auth.uid())
  OR
  -- Regular users can only see their organization's logs
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization_id())
);

CREATE POLICY "Users can insert audit logs for their organization"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins can insert logs for any organization
  is_super_admin(auth.uid())
  OR
  -- Regular users can only insert logs for their organization
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization_id())
);

-- Fix 3: Add missing UPDATE/DELETE policies for audit_logs
CREATE POLICY "Super admins can update audit logs"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete audit logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Fix 4: Complete RLS coverage for organization_features table
-- (Referenced in docs but may be missing)
CREATE TABLE IF NOT EXISTS public.organization_features (
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (organization_id, feature_key)
);

ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;

-- Policies for organization_features
CREATE POLICY "org_features_read" ON public.organization_features
FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_features.organization_id
  )
);

CREATE POLICY "org_features_admin_write" ON public.organization_features
FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_features.organization_id
      AND ur.role IN ('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
  )
);

CREATE POLICY "org_features_admin_update" ON public.organization_features
FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_features.organization_id
      AND ur.role IN ('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
  )
);

CREATE POLICY "org_features_admin_delete" ON public.organization_features
FOR DELETE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_features.organization_id
      AND ur.role IN ('ORGANIZATION_ADMIN', 'SUPER_ADMIN')
  )
);