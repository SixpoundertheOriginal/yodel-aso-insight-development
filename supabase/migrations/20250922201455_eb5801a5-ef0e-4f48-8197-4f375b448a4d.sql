-- Allow NULL organization_id for super admin in creative analysis related tables
ALTER TABLE screenshot_analyses 
  ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE pattern_analyses 
  ALTER COLUMN organization_id DROP NOT NULL;