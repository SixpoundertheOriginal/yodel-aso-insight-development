-- ============================================
-- Add Lowercase Enum Values to app_role
-- Date: November 8, 2025
-- Purpose: Add org_admin and super_admin enum values
-- ============================================

-- This migration ONLY adds enum values, nothing else
-- Must be in a separate file because ALTER TYPE ADD VALUE cannot run in a transaction

-- Add org_admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'org_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'org_admin';
    RAISE NOTICE '✅ Added org_admin to app_role enum';
  ELSE
    RAISE NOTICE '⚠️  org_admin already exists';
  END IF;
END $$;

-- Add super_admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
    RAISE NOTICE '✅ Added super_admin to app_role enum';
  ELSE
    RAISE NOTICE '⚠️  super_admin already exists';
  END IF;
END $$;

-- Verify
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'org_admin' AND enumtypid = 'app_role'::regtype) AND
     EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'app_role'::regtype) THEN
    RAISE NOTICE '✅ Both enum values exist';
  ELSE
    RAISE EXCEPTION '❌ Enum values not added correctly';
  END IF;
END $$;
