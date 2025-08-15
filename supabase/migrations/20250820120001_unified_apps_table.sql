-- Align apps table as single source of truth and remove organization_apps join table
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS app_identifier VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bigquery_client_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS auto_discovered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS first_seen DATE,
  ADD COLUMN IF NOT EXISTS last_seen DATE;

ALTER TABLE public.apps
  ADD CONSTRAINT apps_unique_org_identifier_platform
  UNIQUE (organization_id, app_identifier, platform);

DROP TABLE IF EXISTS public.organization_apps;
