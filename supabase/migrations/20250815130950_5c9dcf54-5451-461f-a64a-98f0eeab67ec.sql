-- Create YodelMobile master organization
INSERT INTO public.organizations (name, slug, subscription_tier, app_limit, app_limit_enforced, created_at)
VALUES (
  'YodelMobile',
  'yodelmobile', 
  'enterprise',
  1000,
  false,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Create table to manage which organizations can access which BigQuery clients
CREATE TABLE IF NOT EXISTS public.organization_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bigquery_client_name VARCHAR(255) NOT NULL,
  access_level VARCHAR(50) DEFAULT 'full',
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, bigquery_client_name)
);

-- Enable RLS on the new table
ALTER TABLE public.organization_client_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization_client_access
CREATE POLICY "Users can view client access for their organization" 
ON public.organization_client_access 
FOR SELECT 
USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Super admins can manage all client access" 
ON public.organization_client_access 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Update Igor's profile to belong to YodelMobile org (assuming igor@yodelmobile.com exists)
UPDATE public.profiles 
SET organization_id = (SELECT id FROM organizations WHERE slug = 'yodelmobile')
WHERE email = 'igor@yodelmobile.com';

-- Grant YodelMobile organization access to Mixbook BigQuery client
INSERT INTO public.organization_client_access (organization_id, bigquery_client_name, access_level, granted_by)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'yodelmobile'),
  'Mixbook',
  'full',
  (SELECT id FROM profiles WHERE email = 'igor@yodelmobile.com')
) ON CONFLICT (organization_id, bigquery_client_name) DO NOTHING;

-- Create enhanced organization apps table for BigQuery client management
CREATE TABLE IF NOT EXISTS public.organization_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_identifier VARCHAR(255) NOT NULL,
  app_name VARCHAR(255),
  platform VARCHAR(50) DEFAULT 'ios',
  data_source VARCHAR(50) DEFAULT 'bigquery',
  approval_status VARCHAR(50) DEFAULT 'approved',
  approved_by UUID REFERENCES profiles(id),
  approved_date TIMESTAMP WITH TIME ZONE,
  discovered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  app_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, app_identifier, data_source)
);

-- Enable RLS on organization_apps
ALTER TABLE public.organization_apps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization_apps
CREATE POLICY "Users can view apps for their organization" 
ON public.organization_apps 
FOR SELECT 
USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage apps for their organization" 
ON public.organization_apps 
FOR ALL 
USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Super admins can manage all organization apps" 
ON public.organization_apps 
FOR ALL 
USING (is_super_admin(auth.uid()));

-- Add Mixbook app to YodelMobile organization
INSERT INTO public.organization_apps (
  organization_id, 
  app_identifier, 
  app_name, 
  platform, 
  data_source, 
  approval_status,
  approved_by,
  approved_date,
  app_metadata
) VALUES (
  (SELECT id FROM organizations WHERE slug = 'yodelmobile'),
  'Mixbook',
  'Mixbook',
  'ios',
  'bigquery',
  'approved',
  (SELECT id FROM profiles WHERE email = 'igor@yodelmobile.com'),
  NOW(),
  '{"client_name": "Mixbook", "data_available": true}'
) ON CONFLICT (organization_id, app_identifier, data_source) DO NOTHING;