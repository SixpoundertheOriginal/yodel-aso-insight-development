/**
 * Intent Keyword Examples - Vertical-Specific Recommendations
 *
 * This table stores example keyword phrases that should be recommended to users
 * based on their app's vertical/category. Used in SearchIntentCoverageCard and
 * other UI components to provide relevant, vertical-specific suggestions.
 *
 * Examples:
 * - Education app → "learn spanish", "language lessons", "study guide"
 * - Gaming app → "multiplayer games", "free to play", "battle royale"
 * - Finance app → "invest money", "stock trading", "budget tracker"
 *
 * Admin-editable via intent registry pages.
 */

-- ============================================================================
-- Intent Keyword Examples Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS aso_intent_keyword_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  intent_type text NOT NULL CHECK (intent_type IN ('informational', 'commercial', 'navigational', 'transactional')),
  vertical text NOT NULL, -- e.g., 'Education', 'Games', 'Finance', 'Health', 'Productivity'

  -- Example phrase
  example_phrase text NOT NULL,
  display_order integer DEFAULT 0, -- Order to display examples (lower = first)

  -- Scope (for future expansion)
  market text, -- Optional market-specific examples (e.g., 'us', 'gb', 'de')
  language text DEFAULT 'en', -- Language of the example

  -- Status
  is_active boolean DEFAULT true,

  -- Metadata
  usage_context text, -- Where this example should be shown (e.g., 'no_intent_found', 'low_coverage')
  admin_notes text,

  -- Multi-tenant
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = platform-wide

  -- Audit fields
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Uniqueness: one example phrase per vertical + intent + market
  UNIQUE NULLS NOT DISTINCT (example_phrase, intent_type, vertical, market, organization_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_intent_examples_vertical ON aso_intent_keyword_examples(vertical);
CREATE INDEX idx_intent_examples_intent_type ON aso_intent_keyword_examples(intent_type);
CREATE INDEX idx_intent_examples_active ON aso_intent_keyword_examples(is_active) WHERE is_active = true;
CREATE INDEX idx_intent_examples_market ON aso_intent_keyword_examples(market) WHERE market IS NOT NULL;
CREATE INDEX idx_intent_examples_organization ON aso_intent_keyword_examples(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_intent_examples_display_order ON aso_intent_keyword_examples(display_order);

-- Full-text search
CREATE INDEX idx_intent_examples_phrase_search ON aso_intent_keyword_examples USING gin(to_tsvector('english', example_phrase));

COMMENT ON TABLE aso_intent_keyword_examples IS 'Vertical-specific keyword examples for UI recommendations';
COMMENT ON COLUMN aso_intent_keyword_examples.intent_type IS 'Search intent category the example demonstrates';
COMMENT ON COLUMN aso_intent_keyword_examples.vertical IS 'App vertical/category (Education, Games, Finance, etc.)';
COMMENT ON COLUMN aso_intent_keyword_examples.example_phrase IS 'Example keyword phrase to show users';
COMMENT ON COLUMN aso_intent_keyword_examples.display_order IS 'Order to display (lower = first)';
COMMENT ON COLUMN aso_intent_keyword_examples.usage_context IS 'UI context where example should appear';

-- ============================================================================
-- Seed Data: Platform-Wide Examples (Common Verticals)
-- ============================================================================

-- Education Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Education', 'learn spanish', 1, 'no_intent_found'),
('informational', 'Education', 'language lessons', 2, 'no_intent_found'),
('informational', 'Education', 'study guide', 3, 'no_intent_found'),
('informational', 'Education', 'how to learn', 4, 'low_coverage'),
('commercial', 'Education', 'best language app', 1, 'no_intent_found'),
('commercial', 'Education', 'top learning app', 2, 'no_intent_found'),
('transactional', 'Education', 'free lessons', 1, 'low_coverage'),
('transactional', 'Education', 'download courses', 2, 'low_coverage');

-- Gaming Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Games', 'how to play', 1, 'no_intent_found'),
('informational', 'Games', 'game guide', 2, 'no_intent_found'),
('informational', 'Games', 'gameplay tips', 3, 'no_intent_found'),
('commercial', 'Games', 'best games', 1, 'no_intent_found'),
('commercial', 'Games', 'top rated games', 2, 'no_intent_found'),
('commercial', 'Games', 'multiplayer games', 3, 'no_intent_found'),
('transactional', 'Games', 'free to play', 1, 'low_coverage'),
('transactional', 'Games', 'download game', 2, 'low_coverage');

-- Finance Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Finance', 'how to invest', 1, 'no_intent_found'),
('informational', 'Finance', 'stock trading guide', 2, 'no_intent_found'),
('informational', 'Finance', 'learn investing', 3, 'no_intent_found'),
('commercial', 'Finance', 'best investing app', 1, 'no_intent_found'),
('commercial', 'Finance', 'top trading platform', 2, 'no_intent_found'),
('commercial', 'Finance', 'recommended stocks', 3, 'no_intent_found'),
('transactional', 'Finance', 'invest money', 1, 'low_coverage'),
('transactional', 'Finance', 'buy stocks', 2, 'low_coverage');

-- Health & Fitness Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Health', 'how to lose weight', 1, 'no_intent_found'),
('informational', 'Health', 'workout guide', 2, 'no_intent_found'),
('informational', 'Health', 'fitness tips', 3, 'no_intent_found'),
('commercial', 'Health', 'best fitness app', 1, 'no_intent_found'),
('commercial', 'Health', 'top workout app', 2, 'no_intent_found'),
('transactional', 'Health', 'free workouts', 1, 'low_coverage'),
('transactional', 'Health', 'track calories', 2, 'low_coverage');

-- Productivity Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Productivity', 'how to organize', 1, 'no_intent_found'),
('informational', 'Productivity', 'task management tips', 2, 'no_intent_found'),
('informational', 'Productivity', 'time management guide', 3, 'no_intent_found'),
('commercial', 'Productivity', 'best task manager', 1, 'no_intent_found'),
('commercial', 'Productivity', 'top productivity app', 2, 'no_intent_found'),
('transactional', 'Productivity', 'create tasks', 1, 'low_coverage'),
('transactional', 'Productivity', 'track projects', 2, 'low_coverage');

-- Social Networking Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Social', 'how to connect', 1, 'no_intent_found'),
('informational', 'Social', 'social media guide', 2, 'no_intent_found'),
('commercial', 'Social', 'best social app', 1, 'no_intent_found'),
('commercial', 'Social', 'top chat app', 2, 'no_intent_found'),
('transactional', 'Social', 'chat with friends', 1, 'low_coverage'),
('transactional', 'Social', 'share photos', 2, 'low_coverage');

-- Shopping Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Shopping', 'how to shop online', 1, 'no_intent_found'),
('informational', 'Shopping', 'shopping tips', 2, 'no_intent_found'),
('commercial', 'Shopping', 'best deals', 1, 'no_intent_found'),
('commercial', 'Shopping', 'top shopping app', 2, 'no_intent_found'),
('commercial', 'Shopping', 'discount store', 3, 'no_intent_found'),
('transactional', 'Shopping', 'buy online', 1, 'low_coverage'),
('transactional', 'Shopping', 'free shipping', 2, 'low_coverage');

-- Travel Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Travel', 'how to book flights', 1, 'no_intent_found'),
('informational', 'Travel', 'travel guide', 2, 'no_intent_found'),
('informational', 'Travel', 'trip planning tips', 3, 'no_intent_found'),
('commercial', 'Travel', 'best travel app', 1, 'no_intent_found'),
('commercial', 'Travel', 'cheap flights', 2, 'no_intent_found'),
('transactional', 'Travel', 'book hotel', 1, 'low_coverage'),
('transactional', 'Travel', 'find flights', 2, 'low_coverage');

-- Entertainment & Music Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Entertainment', 'how to stream', 1, 'no_intent_found'),
('informational', 'Entertainment', 'music guide', 2, 'no_intent_found'),
('commercial', 'Entertainment', 'best music app', 1, 'no_intent_found'),
('commercial', 'Entertainment', 'top streaming app', 2, 'no_intent_found'),
('transactional', 'Entertainment', 'listen music', 1, 'low_coverage'),
('transactional', 'Entertainment', 'watch movies', 2, 'low_coverage');

-- Food & Drink Vertical
INSERT INTO aso_intent_keyword_examples (intent_type, vertical, example_phrase, display_order, usage_context) VALUES
('informational', 'Food', 'how to cook', 1, 'no_intent_found'),
('informational', 'Food', 'recipe guide', 2, 'no_intent_found'),
('informational', 'Food', 'cooking tips', 3, 'no_intent_found'),
('commercial', 'Food', 'best recipe app', 1, 'no_intent_found'),
('commercial', 'Food', 'top food delivery', 2, 'no_intent_found'),
('transactional', 'Food', 'order food', 1, 'low_coverage'),
('transactional', 'Food', 'delivery near me', 2, 'low_coverage');

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE aso_intent_keyword_examples ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all examples
CREATE POLICY "Super admins can manage all intent keyword examples"
  ON aso_intent_keyword_examples
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('SUPER_ADMIN', 'super_admin')
    )
  );

-- Organization admins can manage their organization's examples
CREATE POLICY "Organization admins can manage their intent keyword examples"
  ON aso_intent_keyword_examples
  FOR ALL
  USING (
    organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('ORG_ADMIN', 'org_admin', 'SUPER_ADMIN', 'super_admin')
    )
  );

-- All authenticated users can READ platform-wide examples (organization_id IS NULL)
CREATE POLICY "All users can read platform-wide intent keyword examples"
  ON aso_intent_keyword_examples
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IS NULL
  );

-- All authenticated users can READ their organization's examples
CREATE POLICY "Users can read their organization's intent keyword examples"
  ON aso_intent_keyword_examples
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Update Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_intent_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_intent_examples_updated_at
  BEFORE UPDATE ON aso_intent_keyword_examples
  FOR EACH ROW
  EXECUTE FUNCTION update_intent_examples_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE aso_intent_keyword_examples IS 'Phase 21: Vertical-specific keyword examples for UI recommendations - Admin editable';
