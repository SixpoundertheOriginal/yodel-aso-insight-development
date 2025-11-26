-- ============================================================================
-- Phase 2A: Category-Based RuleSet Assignment - Schema Creation
-- Migration: Create aso_ruleset_category table
-- Date: 2025-01-25
-- ============================================================================

-- Create category ruleset table
CREATE TABLE IF NOT EXISTS aso_ruleset_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  genre_id INTEGER UNIQUE,
  vertical_template_meta JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  parent_categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE aso_ruleset_category IS 'Phase 2A: Category-based ruleset templates (deterministic App Store category mapping)';
COMMENT ON COLUMN aso_ruleset_category.category_id IS 'Unique category identifier (e.g., category_entertainment)';
COMMENT ON COLUMN aso_ruleset_category.category_name IS 'Human-readable category name (e.g., Entertainment)';
COMMENT ON COLUMN aso_ruleset_category.genre_id IS 'iOS App Store primaryGenreId for deterministic mapping';
COMMENT ON COLUMN aso_ruleset_category.vertical_template_meta IS 'Template metadata using same schema as aso_ruleset_vertical (Phase 21)';
COMMENT ON COLUMN aso_ruleset_category.parent_categories IS 'Hierarchical parent categories for future sub-category support';

-- Create index for fast genre_id lookups
CREATE INDEX IF NOT EXISTS idx_category_genre_id ON aso_ruleset_category(genre_id);
CREATE INDEX IF NOT EXISTS idx_category_id ON aso_ruleset_category(category_id);

-- Insert 14 core iOS App Store categories
INSERT INTO aso_ruleset_category (category_id, category_name, genre_id, description, parent_categories) VALUES
  ('category_games', 'Games', 6014, 'Gaming apps, casual games, and interactive entertainment', '{}'),
  ('category_education', 'Education', 6017, 'Educational apps, learning platforms, and study tools', '{}'),
  ('category_entertainment', 'Entertainment', 6016, 'Media streaming, video content, and entertainment apps', '{}'),
  ('category_lifestyle', 'Lifestyle', 6012, 'Lifestyle apps, daily living tools, and personal interest apps', '{}'),
  ('category_utilities', 'Utilities', 6002, 'System tools, utility apps, and productivity helpers', '{}'),
  ('category_social_networking', 'Social Networking', 6005, 'Social media platforms and communication apps', '{}'),
  ('category_productivity', 'Productivity', 6007, 'Work tools, task management, and productivity apps', '{}'),
  ('category_health_fitness', 'Health & Fitness', 6013, 'Health tracking, fitness apps, and wellness tools', '{}'),
  ('category_finance', 'Finance', 6015, 'Banking apps, investment platforms, and financial tools', '{}'),
  ('category_travel', 'Travel', 6003, 'Travel planning, navigation, and trip management apps', '{}'),
  ('category_shopping', 'Shopping', 6024, 'E-commerce apps, online shopping platforms, and retail apps', '{}'),
  ('category_photo_video', 'Photo & Video', 6008, 'Photo editing, video creation, and media production apps', '{}'),
  ('category_music', 'Music', 6011, 'Music streaming, audio players, and music creation apps', '{}'),
  ('category_news', 'News', 6009, 'News apps, magazines, and content aggregators', '{}')
ON CONFLICT (category_id) DO NOTHING;

-- Create diagnostics table for category detection logging
CREATE TABLE IF NOT EXISTS aso_engine_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  audit_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Category detection
  detected_category_id TEXT,
  detected_category_name TEXT,
  category_confidence TEXT, -- 'high', 'medium', 'low'
  category_source TEXT, -- 'genre_id', 'genre_name', 'fallback'
  primary_genre_id INTEGER,
  primary_genre_name TEXT,

  -- Vertical detection (for comparison)
  detected_vertical_id TEXT,
  vertical_confidence NUMERIC,

  -- Mismatch detection
  has_category_vertical_mismatch BOOLEAN DEFAULT false,
  mismatch_reason TEXT,

  -- Template loading
  category_template_loaded BOOLEAN DEFAULT false,
  vertical_template_loaded BOOLEAN DEFAULT false,

  -- Performance metrics
  detection_time_ms INTEGER,
  template_load_time_ms INTEGER,

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE aso_engine_diagnostics IS 'Phase 2A: Diagnostics and logging for category detection and template loading';
COMMENT ON COLUMN aso_engine_diagnostics.has_category_vertical_mismatch IS 'True if category and vertical suggest different templates (e.g., Finance category but Gaming keywords)';

-- Create indexes for diagnostics queries
CREATE INDEX IF NOT EXISTS idx_diagnostics_app_id ON aso_engine_diagnostics(app_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_timestamp ON aso_engine_diagnostics(audit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostics_category ON aso_engine_diagnostics(detected_category_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_mismatch ON aso_engine_diagnostics(has_category_vertical_mismatch) WHERE has_category_vertical_mismatch = true;

-- Add RLS policies (internal Yodel staff only)
ALTER TABLE aso_ruleset_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_engine_diagnostics ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to category rulesets" ON aso_ruleset_category
  FOR SELECT TO authenticated
  USING (true);

-- Allow read access to diagnostics
CREATE POLICY "Allow read access to diagnostics" ON aso_engine_diagnostics
  FOR SELECT TO authenticated
  USING (true);

-- Allow insert for service role (backend only)
CREATE POLICY "Allow service role to insert diagnostics" ON aso_engine_diagnostics
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Verification query
SELECT category_id, category_name, genre_id, description
FROM aso_ruleset_category
ORDER BY category_name;
