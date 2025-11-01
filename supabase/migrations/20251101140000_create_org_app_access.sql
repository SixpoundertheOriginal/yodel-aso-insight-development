-- Create org_app_access table to map apps to organizations
-- This table defines which apps belong to which organizations

CREATE TABLE IF NOT EXISTS public.org_app_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure each app can only be attached to one org at a time
  UNIQUE(app_id, organization_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_app_access_app_id ON public.org_app_access(app_id);
CREATE INDEX IF NOT EXISTS idx_org_app_access_org_id ON public.org_app_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_app_access_active ON public.org_app_access(app_id, organization_id) WHERE detached_at IS NULL;

-- Enable RLS
ALTER TABLE public.org_app_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users see their org app access"
ON public.org_app_access
FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Insert actual client data from BigQuery
-- These are the actual client values from aso-reporting-1.client_reports.aso_all_apple
INSERT INTO public.org_app_access (app_id, organization_id, attached_at, detached_at) VALUES
  ('Client_One', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL),
  ('Client_Two', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL),
  ('Client_Three', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL),
  ('Client_Four', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL),
  ('Client_Five', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL),
  ('Client_Six', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL),
  ('Client_Seven', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', NOW(), NULL)
ON CONFLICT (app_id, organization_id) DO NOTHING;