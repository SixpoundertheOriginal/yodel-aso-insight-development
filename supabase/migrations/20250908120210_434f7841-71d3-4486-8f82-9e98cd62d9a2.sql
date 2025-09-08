-- Create feature access control table for organizations
CREATE TABLE public.org_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(organization_id, feature_key)
);

-- Enable RLS for tenant isolation
ALTER TABLE public.org_feature_access ENABLE ROW LEVEL SECURITY;

-- Create policies for feature access control
CREATE POLICY "Users can view their organization's feature access" 
  ON public.org_feature_access 
  FOR SELECT 
  USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Super admins can manage all feature access" 
  ON public.org_feature_access 
  FOR ALL 
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Organization admins can view their org features" 
  ON public.org_feature_access 
  FOR SELECT 
  USING (
    organization_id = get_current_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'ORGANIZATION_ADMIN' 
      AND organization_id = org_feature_access.organization_id
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_org_feature_access_updated_at
  BEFORE UPDATE ON public.org_feature_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Define platform features and seed data for "Next" organization
INSERT INTO public.org_feature_access (organization_id, feature_key, is_enabled) 
SELECT 
  o.id,
  feature.key,
  CASE 
    WHEN o.name ILIKE 'next' AND feature.key IN ('performance_intelligence', 'executive_dashboard', 'analytics', 'conversion_intelligence') 
    THEN true 
    ELSE false 
  END as is_enabled
FROM public.organizations o
CROSS JOIN (VALUES 
  ('performance_intelligence'),
  ('executive_dashboard'), 
  ('analytics'),
  ('conversion_intelligence'),
  ('keyword_intelligence'),
  ('metadata_generator'),
  ('creative_review'),
  ('aso_chat'),
  ('competitive_intelligence'),
  ('app_discovery')
) AS feature(key)
ON CONFLICT (organization_id, feature_key) DO NOTHING;