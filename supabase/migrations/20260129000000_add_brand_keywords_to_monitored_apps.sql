-- Migration: Add brand_keywords column to monitored_apps
-- Purpose: Store user-defined brand keywords for filtering branded combos in competitive analysis
-- Phase 1.1 of ASO Audit Combo Calculation Enhancement

-- Add brand_keywords column
ALTER TABLE monitored_apps
ADD COLUMN IF NOT EXISTS brand_keywords TEXT[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN monitored_apps.brand_keywords IS
'User-defined brand keywords for filtering branded combos. Overrides auto-detection. Used in ranking potential analysis to exclude brand-specific combinations and focus on generic keyword opportunities.';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_monitored_apps_brand_keywords
ON monitored_apps USING GIN (brand_keywords);

COMMENT ON INDEX idx_monitored_apps_brand_keywords IS
'GIN index for efficient brand keyword searches in monitored apps.';
