-- Reintroduce organization_apps table and get_approved_apps function
-- Create table for managing organization app approvals
CREATE TABLE IF NOT EXISTS public.organization_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_identifier VARCHAR(255) NOT NULL,
  app_name VARCHAR(255),
  data_source VARCHAR(50) DEFAULT 'bigquery',
  approval_status VARCHAR(50) DEFAULT 'approved',
  approved_by UUID REFERENCES public.profiles(id),
  approved_date TIMESTAMP WITH TIME ZONE,
  discovered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  app_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, app_identifier, data_source)
);

-- Enable RLS and basic policies
ALTER TABLE public.organization_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view apps for their organization" ON public.organization_apps
FOR SELECT USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage apps for their organization" ON public.organization_apps
FOR ALL USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Super admins can manage all organization apps" ON public.organization_apps
FOR ALL USING (is_super_admin(auth.uid()));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_organization_apps_org_status ON public.organization_apps(organization_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_organization_apps_identifier ON public.organization_apps(app_identifier);

-- Function to fetch approved BigQuery apps for an organization
CREATE OR REPLACE FUNCTION public.get_approved_apps(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  app_identifier VARCHAR(255),
  app_name VARCHAR(255),
  data_source VARCHAR(50),
  approval_status VARCHAR(50),
  app_metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT id, app_identifier, app_name, data_source, approval_status, app_metadata
    FROM public.organization_apps
    WHERE organization_id = p_organization_id
      AND approval_status = 'approved'
      AND data_source = 'bigquery';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approved_apps(UUID) TO authenticated;
