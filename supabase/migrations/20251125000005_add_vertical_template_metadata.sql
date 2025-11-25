-- ============================================================================
-- Vertical Intelligence Layer - Database Schema
-- Migration: Add vertical_template_meta JSONB columns
-- Phase: 1 - Database Foundation
-- Date: 2025-01-25
-- ============================================================================

-- Add vertical_template_meta column to aso_ruleset_vertical
ALTER TABLE aso_ruleset_vertical
ADD COLUMN IF NOT EXISTS vertical_template_meta JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN aso_ruleset_vertical.vertical_template_meta IS
'Vertical Intelligence Layer metadata: overview, benchmarks, keyword clusters, conversion drivers, and KPI modifiers (Schema version 1.0.0)';

-- Add market_template_meta column to aso_ruleset_market
ALTER TABLE aso_ruleset_market
ADD COLUMN IF NOT EXISTS market_template_meta JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN aso_ruleset_market.market_template_meta IS
'Market-specific template metadata (benchmarks only, not KPI modifiers)';

-- Add client_template_meta column to aso_ruleset_client
ALTER TABLE aso_ruleset_client
ADD COLUMN IF NOT EXISTS client_template_meta JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN aso_ruleset_client.client_template_meta IS
'Client-specific template metadata (full override capability for enterprise clients)';

-- Populate existing rows with empty JSONB to ensure consistency
UPDATE aso_ruleset_vertical
SET vertical_template_meta = '{}'::jsonb
WHERE vertical_template_meta IS NULL;

UPDATE aso_ruleset_market
SET market_template_meta = '{}'::jsonb
WHERE market_template_meta IS NULL;

UPDATE aso_ruleset_client
SET client_template_meta = '{}'::jsonb
WHERE client_template_meta IS NULL;

-- Create index on vertical_template_meta for faster queries (optional)
-- Note: JSONB GIN indexes are beneficial for large datasets
-- Commenting out for now - can be added if query performance becomes an issue
-- CREATE INDEX IF NOT EXISTS idx_vertical_template_meta_gin
-- ON aso_ruleset_vertical USING gin (vertical_template_meta);

-- Verification query (run manually to verify migration)
-- SELECT vertical, vertical_template_meta FROM aso_ruleset_vertical LIMIT 5;
-- SELECT market, market_template_meta FROM aso_ruleset_market LIMIT 5;
-- SELECT organization_id, client_template_meta FROM aso_ruleset_client LIMIT 5;
