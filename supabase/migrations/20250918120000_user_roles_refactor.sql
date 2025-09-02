-- Rework roles into user_roles table and add role permissions

-- 1. Recreate user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, organization_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);

-- 2. Migrate existing profile roles into user_roles
INSERT INTO public.user_roles (user_id, organization_id, role, granted_by, granted_at, is_active)
SELECT id, organization_id, upper(role), id, now(), true
FROM public.profiles
WHERE role IS NOT NULL;

-- 3. Drop role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 4. Role permissions table with JSONB definitions
DROP TABLE IF EXISTS public.role_permissions;
CREATE TABLE public.role_permissions (
    role TEXT PRIMARY KEY,
    permissions JSONB NOT NULL
);
INSERT INTO public.role_permissions(role, permissions) VALUES
    ('SUPER_ADMIN', '{"access": "all"}'),
    ('ORG_ADMIN', '{"manage_org": true, "manage_users": true}'),
    ('ASO_MANAGER', '{"keyword": "manage", "metadata": "edit"}'),
    ('ANALYST', '{"analytics": "view"}'),
    ('VIEWER', '{"read_only": true}'),
    ('CLIENT', '{"limited": true}');

-- 5. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID, org_uuid UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = user_uuid
    AND is_active
    AND (expires_at IS NULL OR expires_at > now())
    AND (organization_id = org_uuid OR organization_id IS NULL)
  ORDER BY organization_id NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
      AND role = 'SUPER_ADMIN'
      AND is_active
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 6. Updated RLS policies using user_roles and super-admin bypass
-- Profiles
DROP POLICY IF EXISTS "Super admin bypass for profiles" ON public.profiles;
CREATE POLICY "Super admin bypass for profiles"
ON public.profiles
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR id = auth.uid()
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = profiles.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR id = auth.uid()
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = profiles.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);

-- Organizations
DROP POLICY IF EXISTS "Super admin access to all organizations" ON public.organizations;
CREATE POLICY "Super admin access to all organizations"
ON public.organizations
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = organizations.id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = organizations.id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);

-- Apps
DROP POLICY IF EXISTS "Super admin can manage all apps" ON public.apps;
CREATE POLICY "Super admin can manage all apps"
ON public.apps
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = apps.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = apps.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);

-- Audit Logs
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can view all audit logs"
ON public.audit_logs
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = audit_logs.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);

-- Keyword Ranking History
DROP POLICY IF EXISTS "Super admin bypass keyword_ranking_history" ON public.keyword_ranking_history;
CREATE POLICY "Super admin bypass keyword_ranking_history"
ON public.keyword_ranking_history
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = keyword_ranking_history.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = keyword_ranking_history.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);

-- Competitor Keywords
DROP POLICY IF EXISTS "Super admin bypass competitor_keywords" ON public.competitor_keywords;
CREATE POLICY "Super admin bypass competitor_keywords"
ON public.competitor_keywords
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = competitor_keywords.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = competitor_keywords.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);

-- AI Insights
DROP POLICY IF EXISTS "Super admin bypass ai_insights" ON public.ai_insights;
CREATE POLICY "Super admin bypass ai_insights"
ON public.ai_insights
FOR ALL TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = ai_insights.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = ai_insights.organization_id
          AND ur.is_active
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
     )
);
