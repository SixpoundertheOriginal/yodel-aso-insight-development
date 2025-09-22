-- SECURITY FIXES - Phase 1B: Fix scrape_cache table security

-- Drop existing overly permissive cache policies
DROP POLICY IF EXISTS "Allow public read access to scrape_cache" ON public.scrape_cache;
DROP POLICY IF EXISTS "Users can access cache for their organization" ON public.scrape_cache;

-- Create secure cache policies
CREATE POLICY "cache_organization_access" ON public.scrape_cache
FOR ALL TO authenticated
USING (
  -- Super admins can access all cache
  is_super_admin(auth.uid()) 
  OR 
  -- Organization members can only access their organization's cache (NOT NULL org_id)
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization_id())
);

-- Create organization_features table if missing (referenced in docs)
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
DROP POLICY IF EXISTS "org_features_read" ON public.organization_features;
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

DROP POLICY IF EXISTS "org_features_admin_write" ON public.organization_features;
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

DROP POLICY IF EXISTS "org_features_admin_update" ON public.organization_features;
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

DROP POLICY IF EXISTS "org_features_admin_delete" ON public.organization_features;
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