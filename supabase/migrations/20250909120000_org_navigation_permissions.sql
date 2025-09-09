-- Organization-level navigation permissions and user overrides
-- Tables
CREATE TABLE IF NOT EXISTS public.org_navigation_permissions (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (organization_id, route)
);

CREATE TABLE IF NOT EXISTS public.user_navigation_overrides (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, organization_id, route)
);

CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  route TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enable
ALTER TABLE public.org_navigation_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_navigation_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: read within org; super admin bypass
DROP POLICY IF EXISTS "Org members can read org nav perms" ON public.org_navigation_permissions;
CREATE POLICY "Org members can read org nav perms" ON public.org_navigation_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = org_navigation_permissions.organization_id
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Manage org nav perms (admins)" ON public.org_navigation_permissions;
CREATE POLICY "Manage org nav perms (admins)" ON public.org_navigation_permissions
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = org_navigation_permissions.organization_id
        AND ur.role IN ('ORG_ADMIN','SUPER_ADMIN')
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = org_navigation_permissions.organization_id
        AND ur.role IN ('ORG_ADMIN','SUPER_ADMIN')
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Read user overrides (org members + self)" ON public.user_navigation_overrides;
CREATE POLICY "Read user overrides (org members + self)" ON public.user_navigation_overrides
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = user_navigation_overrides.organization_id
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Manage user overrides (admins)" ON public.user_navigation_overrides;
CREATE POLICY "Manage user overrides (admins)" ON public.user_navigation_overrides
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = user_navigation_overrides.organization_id
        AND ur.role IN ('ORG_ADMIN','SUPER_ADMIN')
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = user_navigation_overrides.organization_id
        AND ur.role IN ('ORG_ADMIN','SUPER_ADMIN')
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- Audit logs policies: super admin all; org members read their org
DROP POLICY IF EXISTS "Super admins can view all permission audits" ON public.permission_audit_logs;
CREATE POLICY "Super admins can view all permission audits" ON public.permission_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Org members can view their permission audits" ON public.permission_audit_logs;
CREATE POLICY "Org members can view their permission audits" ON public.permission_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = permission_audit_logs.organization_id
        AND ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- Helper: resolve effective nav allowed (override -> org -> NULL)
CREATE OR REPLACE FUNCTION public.get_effective_nav_allowed(p_org UUID, p_user UUID, p_route TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH u AS (
    SELECT allowed FROM public.user_navigation_overrides
    WHERE user_id = p_user AND organization_id = p_org AND route = p_route
  ), o AS (
    SELECT allowed FROM public.org_navigation_permissions
    WHERE organization_id = p_org AND route = p_route
  )
  SELECT COALESCE((SELECT allowed FROM u), (SELECT allowed FROM o))::BOOLEAN;
$$;

