-- Custom Keywords Table
-- Allows users to manually add keywords to analyze in the Keyword Combo Workbench

CREATE TABLE IF NOT EXISTS custom_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  keyword TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicates per app
  UNIQUE(app_id, platform, keyword)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_keywords_app ON custom_keywords(app_id, platform);
CREATE INDEX IF NOT EXISTS idx_custom_keywords_added_by ON custom_keywords(added_by);

-- RLS Policies
ALTER TABLE custom_keywords ENABLE ROW LEVEL SECURITY;

-- Users can read custom keywords for apps they have access to
DROP POLICY IF EXISTS "Users can read custom keywords for their apps" ON custom_keywords;
CREATE POLICY "Users can read custom keywords for their apps"
  ON custom_keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monitored_apps
      WHERE monitored_apps.app_id = custom_keywords.app_id
      AND monitored_apps.platform = custom_keywords.platform
    )
  );

-- Users can insert custom keywords for apps they manage
DROP POLICY IF EXISTS "Users can add custom keywords to their apps" ON custom_keywords;
CREATE POLICY "Users can add custom keywords to their apps"
  ON custom_keywords FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monitored_apps ma
      JOIN user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ma.app_id = custom_keywords.app_id
      AND ma.platform = custom_keywords.platform
      AND ur.user_id = auth.uid()
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
    )
  );

-- Users can delete custom keywords
DROP POLICY IF EXISTS "Users can delete custom keywords from their apps" ON custom_keywords;
CREATE POLICY "Users can delete custom keywords from their apps"
  ON custom_keywords FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM monitored_apps ma
      JOIN user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ma.app_id = custom_keywords.app_id
      AND ma.platform = custom_keywords.platform
      AND ur.user_id = auth.uid()
      AND ur.role IN ('ORG_ADMIN', 'ASO_MANAGER', 'ANALYST')
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_custom_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_keywords_updated_at ON custom_keywords;
CREATE TRIGGER custom_keywords_updated_at
  BEFORE UPDATE ON custom_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_keywords_updated_at();
