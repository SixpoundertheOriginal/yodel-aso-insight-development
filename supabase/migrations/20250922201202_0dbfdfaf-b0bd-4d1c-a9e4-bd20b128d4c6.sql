-- Allow NULL organization_id for super admin in creative analysis tables
ALTER TABLE creative_analysis_sessions 
  ALTER COLUMN organization_id DROP NOT NULL;

-- Add a check constraint to ensure either organization_id is provided OR user is super admin
-- This will be enforced at the application level since we can't check user roles in a constraint