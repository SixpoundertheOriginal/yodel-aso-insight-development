-- Create organization branding table for partnership-style messaging
CREATE TABLE public.organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branding_template VARCHAR(300) DEFAULT '{org_name} & Yodel Mobile - Performance Intelligence Partnership',
  custom_message TEXT,
  position VARCHAR(20) DEFAULT 'footer',
  logo_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  style_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, position)
);

-- Enable RLS for tenant isolation
ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;

-- RLS policy for organization branding
CREATE POLICY "Users can manage branding for their organization" ON public.organization_branding
  FOR ALL TO authenticated
  USING (
    organization_id = get_current_user_organization_id()
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    organization_id = get_current_user_organization_id()
    OR is_super_admin(auth.uid())
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_organization_branding_updated_at
  BEFORE UPDATE ON public.organization_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default branding templates for existing organizations
INSERT INTO public.organization_branding (organization_id, branding_template, position) 
SELECT 
  id,
  CASE 
    WHEN LOWER(name) = 'next' THEN '{org_name} & Yodel Mobile - ASO Intelligence Partnership'
    WHEN LOWER(name) = 'yodelmobile' THEN 'Enterprise analytics powered by {org_name}'
    ELSE '{org_name} × Yodel Mobile: Strategic Performance Insights'
  END,
  'footer'
FROM public.organizations
ON CONFLICT (organization_id, position) DO NOTHING;