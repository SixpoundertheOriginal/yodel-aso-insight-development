-- Phase 1: Database Consolidation - Migrate org_feature_access to org_feature_entitlements

-- Create the new unified org_feature_entitlements table
CREATE TABLE IF NOT EXISTS org_feature_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);

-- Enable RLS on the new table
ALTER TABLE org_feature_entitlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for org_feature_entitlements
CREATE POLICY "org_entitlements_super_admin_full" ON org_feature_entitlements
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "org_entitlements_org_access" ON org_feature_entitlements
  FOR SELECT USING (organization_id = get_current_user_organization_id());

-- Migrate existing data from org_feature_access to org_feature_entitlements
INSERT INTO org_feature_entitlements (organization_id, feature_key, is_enabled, created_at, updated_at)
SELECT 
  organization_id,
  feature_key,
  is_enabled,
  created_at,
  updated_at
FROM org_feature_access
ON CONFLICT (organization_id, feature_key) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_entitlements_org_id ON org_feature_entitlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_entitlements_feature_key ON org_feature_entitlements(feature_key);

-- Add updated_at trigger
CREATE TRIGGER update_org_entitlements_updated_at
  BEFORE UPDATE ON org_feature_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE org_feature_entitlements IS 'Organization-level feature entitlements for the unified permission system';