-- Migration: Create organization_apps table for discovery workflow
-- Date: 2025-10-27
-- Description: Adds pending app discoveries table to support discovery → approval → confirmed workflow
-- 🔧 Local Development Stub
-- This block ensures `public.organizations` exists locally so foreign key creation succeeds.
-- In production, this table already exists and this block is safely skipped.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'organizations'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT
    );
    RAISE NOTICE 'Created local stub for public.organizations';
  END IF;

  BEGIN
    INSERT INTO public.organizations (id, name)
    VALUES ('dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', 'YodelMobile')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Skipped seed insert for public.organizations: %', SQLERRM;
  END;
END $$;

-- Table definition ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_identifier TEXT NOT NULL,
  app_name TEXT NOT NULL,
  app_icon_url TEXT,
  data_source TEXT NOT NULL CHECK (data_source IN ('app_store_connect', 'manual', 'bigquery', 'api')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, app_identifier, data_source)
);

COMMENT ON TABLE public.organization_apps IS 'Pending app discoveries awaiting approval before being added to apps table';

-- Indexes ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organization_apps_org_id
  ON public.organization_apps (organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_apps_status
  ON public.organization_apps (status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_organization_apps_created_at
  ON public.organization_apps (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_apps_org_status
  ON public.organization_apps (organization_id, status);
-- 🔧 Local Development Stub: user_roles
-- Creates a minimal stub for public.user_roles if missing, so RLS policies can compile locally.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.user_roles (
      user_id UUID,
      organization_id UUID,
      role TEXT
    );
    RAISE NOTICE 'Created local stub for public.user_roles';
  END IF;
END $$;

-- Row Level Security -------------------------------------------------------
ALTER TABLE public.organization_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org pending apps"
ON public.organization_apps
FOR SELECT
USING (
  organization_id IN (
    SELECT ur.organization_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

CREATE POLICY "Admins and Edge Functions insert discoveries"
ON public.organization_apps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
  OR auth.jwt()->>'role' = 'service_role'
);

CREATE POLICY "Admins update pending app status"
ON public.organization_apps
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

CREATE POLICY "Admins delete/reject discoveries"
ON public.organization_apps
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = organization_apps.organization_id
      AND ur.role IN ('ORG_ADMIN', 'SUPER_ADMIN')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'SUPER_ADMIN'
      AND ur.organization_id IS NULL
  )
);

-- Trigger to maintain updated_at -------------------------------------------
CREATE OR REPLACE FUNCTION public.update_organization_apps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_apps_updated_at ON public.organization_apps;
CREATE TRIGGER organization_apps_updated_at
  BEFORE UPDATE ON public.organization_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_apps_updated_at();

-- Rollback instructions (manual):
-- DROP TRIGGER IF EXISTS organization_apps_updated_at ON public.organization_apps;
-- DROP FUNCTION IF EXISTS public.update_organization_apps_updated_at();
-- DROP TABLE IF EXISTS public.organization_apps CASCADE;
