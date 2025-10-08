-- Fix security definer view issue
-- Replace the SECURITY DEFINER view with a simple view

DROP VIEW IF EXISTS chatgpt_visibility_scores_unified;

-- Create simple view without SECURITY DEFINER
CREATE VIEW chatgpt_visibility_scores_unified AS
SELECT 
  *,
  COALESCE(avg_position, average_position) as position
FROM chatgpt_visibility_scores;

-- Add search_path to functions that are missing it
ALTER FUNCTION sync_app_store_id() SET search_path = public;