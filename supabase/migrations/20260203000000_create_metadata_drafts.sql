-- ====================================================================
-- Migration: Create Metadata Drafts System
-- Description: Implements draft persistence for Optimization Lab
--              Supports Keywords, Single-Locale, and Multi-Locale drafts
--              Hybrid storage: LocalStorage (auto-save) + Database (manual)
-- Date: 2025-12-03
-- ====================================================================

-- ============================================================
-- TABLE: metadata_drafts
-- ============================================================
-- Purpose: Stores user metadata drafts for pause/resume workflows
-- Scope: User-scoped, app-specific, supports multiple named drafts
-- Storage: JSONB for flexible draft data structure

CREATE TABLE IF NOT EXISTS metadata_drafts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership (scoped by user + organization + app)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL, -- AppStore ID (e.g., "1234567890")

  -- Draft Identification
  draft_type TEXT NOT NULL CHECK (draft_type IN ('keywords', 'single-locale', 'multi-locale')),
  draft_label TEXT DEFAULT NULL, -- User-provided name (e.g., "Holiday Campaign", "Q4 Test")

  -- Draft Content (flexible JSONB storage)
  draft_data JSONB NOT NULL,
  -- Structure varies by draft_type:
  -- ┌─────────────────────────────────────────────────────────────────┐
  -- │ 'keywords':                                                      │
  -- │   {                                                              │
  -- │     "keywords": "keyword1,keyword2,keyword3",                   │
  -- │     "confirmedKeywords": "keyword1,keyword2"                    │
  -- │   }                                                              │
  -- ├─────────────────────────────────────────────────────────────────┤
  -- │ 'single-locale':                                                 │
  -- │   {                                                              │
  -- │     "title": "New App Title",                                   │
  -- │     "subtitle": "New Subtitle",                                 │
  -- │     "keywords": "keyword1,keyword2",                            │
  -- │     "auditResult": { ... },      // Optional: full audit result │
  -- │     "deltas": { ... },            // Optional: comparison data  │
  -- │     "textDiff": { ... }           // Optional: diff view        │
  -- │   }                                                              │
  -- ├─────────────────────────────────────────────────────────────────┤
  -- │ 'multi-locale':                                                  │
  -- │   {                                                              │
  -- │     "locales": [                  // Array of LocaleMetadata    │
  -- │       {                                                          │
  -- │         "locale": "EN_US",                                      │
  -- │         "title": "...",                                         │
  -- │         "subtitle": "...",                                      │
  -- │         "keywords": "..."                                       │
  -- │       },                                                         │
  -- │       ...                                                        │
  -- │     ],                                                           │
  -- │     "multiLocaleResult": { ... }  // Optional: full audit       │
  -- │   }                                                              │
  -- └─────────────────────────────────────────────────────────────────┘

  -- Timestamps (for conflict resolution)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uniqueness Constraint
  -- One draft per (user, app, type, label) combination
  -- NULL labels are treated as distinct (allows multiple unlabeled drafts if needed)
  CONSTRAINT unique_user_app_draft UNIQUE NULLS NOT DISTINCT (user_id, app_id, draft_type, draft_label)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Index for fetching all drafts for a user + app combination
CREATE INDEX idx_metadata_drafts_user_app
  ON metadata_drafts(user_id, app_id);

-- Index for fetching drafts by organization (for admin views)
CREATE INDEX idx_metadata_drafts_organization
  ON metadata_drafts(organization_id);

-- Index for sorting by most recently updated (for "Recent Drafts" views)
CREATE INDEX idx_metadata_drafts_updated
  ON metadata_drafts(updated_at DESC);

-- GIN Index for JSONB draft_data (enables efficient querying within draft content)
CREATE INDEX idx_metadata_drafts_data
  ON metadata_drafts USING GIN (draft_data);

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_metadata_drafts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp if draft_data actually changed
  IF OLD.draft_data IS DISTINCT FROM NEW.draft_data THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_metadata_drafts_updated_at
  BEFORE UPDATE ON metadata_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_metadata_drafts_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on the table
ALTER TABLE metadata_drafts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own drafts
CREATE POLICY "Users can view their own drafts"
  ON metadata_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own drafts
CREATE POLICY "Users can create their own drafts"
  ON metadata_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
  ON metadata_drafts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
  ON metadata_drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 5: Super Admins can view all drafts (for debugging/support)
CREATE POLICY "Super Admins can view all drafts"
  ON metadata_drafts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'SUPER_ADMIN'
    )
  );

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: Get all drafts for a specific app (current user only)
CREATE OR REPLACE FUNCTION get_user_drafts_for_app(p_app_id TEXT)
RETURNS TABLE (
  id UUID,
  draft_type TEXT,
  draft_label TEXT,
  draft_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    md.id,
    md.draft_type,
    md.draft_label,
    md.draft_data,
    md.created_at,
    md.updated_at
  FROM metadata_drafts md
  WHERE md.user_id = auth.uid()
    AND md.app_id = p_app_id
  ORDER BY md.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has any unsaved drafts for an app
CREATE OR REPLACE FUNCTION has_unsaved_drafts(p_app_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM metadata_drafts
    WHERE user_id = auth.uid()
      AND app_id = p_app_id
      AND updated_at > NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- COMMENTS (for documentation)
-- ============================================================

COMMENT ON TABLE metadata_drafts IS
  'Stores user metadata drafts for Optimization Lab. Supports pause/resume workflows with hybrid LocalStorage + Database persistence.';

COMMENT ON COLUMN metadata_drafts.draft_type IS
  'Type of draft: keywords (basic), single-locale (full optimization), multi-locale (10-locale indexation)';

COMMENT ON COLUMN metadata_drafts.draft_label IS
  'User-provided name for draft (e.g., "Holiday Campaign"). NULL for default/unlabeled drafts.';

COMMENT ON COLUMN metadata_drafts.draft_data IS
  'Flexible JSONB storage for draft content. Structure varies by draft_type. Can include audit results for historical comparison.';

COMMENT ON COLUMN metadata_drafts.updated_at IS
  'Auto-updated on draft_data changes. Used for conflict resolution in hybrid storage.';

-- ============================================================
-- EXAMPLE QUERIES
-- ============================================================

-- Example 1: Fetch all drafts for current user + app
-- SELECT * FROM get_user_drafts_for_app('1234567890');

-- Example 2: Check if user has recent drafts
-- SELECT has_unsaved_drafts('1234567890');

-- Example 3: Get most recent draft of each type for an app
-- SELECT DISTINCT ON (draft_type) *
-- FROM metadata_drafts
-- WHERE user_id = auth.uid() AND app_id = '1234567890'
-- ORDER BY draft_type, updated_at DESC;

-- Example 4: Find all labeled drafts for an app
-- SELECT draft_label, draft_type, updated_at
-- FROM metadata_drafts
-- WHERE user_id = auth.uid()
--   AND app_id = '1234567890'
--   AND draft_label IS NOT NULL
-- ORDER BY updated_at DESC;
