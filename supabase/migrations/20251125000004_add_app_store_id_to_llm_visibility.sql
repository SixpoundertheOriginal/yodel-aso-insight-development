/**
 * Add App Store ID Support to LLM Visibility Analysis
 *
 * Issue: LLM visibility analysis should work for ANY app from public App Store data,
 * not just monitored apps. Current schema requires monitored_app_id (uuid), but
 * when analyzing ad-hoc apps, we only have the App Store ID (string like "6443828422").
 *
 * Solution:
 * 1. Add app_store_id varchar column for public app lookups
 * 2. Make monitored_app_id nullable (only set when app is actually monitored)
 * 3. Add composite unique constraint on (app_store_id, description_hash, rules_version)
 * 4. Update RLS to allow analysis of any app (public data, no org restriction needed)
 */

-- Step 1: Add app_store_id column
ALTER TABLE llm_visibility_analysis
  ADD COLUMN IF NOT EXISTS app_store_id varchar(50);

-- Step 2: Make monitored_app_id nullable (it's only set for monitored apps)
ALTER TABLE llm_visibility_analysis
  ALTER COLUMN monitored_app_id DROP NOT NULL;

-- Step 3: Create index on app_store_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_llm_analysis_app_store_id
  ON llm_visibility_analysis(app_store_id, created_at DESC);

-- Step 4: Add composite unique constraint for cache lookups by App Store ID
-- Drop old constraint first
ALTER TABLE llm_visibility_analysis
  DROP CONSTRAINT IF EXISTS unique_analysis_per_description_version;

-- Add new constraint that works with both monitored and non-monitored apps
ALTER TABLE llm_visibility_analysis
  ADD CONSTRAINT unique_analysis_per_app_description_version
    UNIQUE NULLS NOT DISTINCT (
      app_store_id,
      monitored_app_id,
      description_hash,
      rules_version
    );

-- Step 5: Update RLS policies for public access
-- LLM visibility analysis is for PUBLIC App Store data, any user can analyze any app
DROP POLICY IF EXISTS llm_analysis_org_isolation ON llm_visibility_analysis;

-- New policy: Allow authenticated users to read any analysis (public data)
CREATE POLICY llm_analysis_public_read ON llm_visibility_analysis
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- New policy: Allow authenticated users to insert their own analyses
-- (but they must provide their organization_id for billing/tracking)
CREATE POLICY llm_analysis_authenticated_insert ON llm_visibility_analysis
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    organization_id IS NOT NULL
  );

-- Step 6: Update comments
COMMENT ON COLUMN llm_visibility_analysis.app_store_id IS
  'Apple/Google App Store ID (e.g., "6443828422"). Used for analyzing non-monitored apps.';

COMMENT ON COLUMN llm_visibility_analysis.monitored_app_id IS
  'UUID of monitored app (nullable). Only set when analyzing an app in monitored_apps table.';

COMMENT ON TABLE llm_visibility_analysis IS
  'LLM discoverability analysis for app descriptions. Supports both monitored apps (via monitored_app_id) and ad-hoc App Store lookups (via app_store_id). Public data - any authenticated user can analyze any app.';
