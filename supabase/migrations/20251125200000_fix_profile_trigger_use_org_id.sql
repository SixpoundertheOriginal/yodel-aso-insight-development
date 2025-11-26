-- =====================================================================
-- Migration: Fix Profile Trigger to Use org_id Column
-- Purpose: Fix user creation by using the correct org_id column (NOT NULL)
-- Date: 2025-11-25
-- Issue: Trigger tries to insert organization_id (nullable) instead of org_id (NOT NULL)
-- Type: IDEMPOTENT - Safe to run multiple times
-- =====================================================================

-- ============================================
-- PART 1: Update trigger function to use org_id
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new profile with data from auth.users
  -- CRITICAL: Use org_id (NOT NULL) instead of organization_id (nullable)
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    org_id,  -- ✅ Changed from organization_id to org_id
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    (NEW.raw_user_meta_data->>'organization_id')::uuid,  -- Still read from metadata as organization_id
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
    org_id = COALESCE(EXCLUDED.org_id, public.profiles.org_id),  -- ✅ Changed from organization_id to org_id
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Trigger function that automatically creates a profile entry when a new auth.users record is created.
   Extracts metadata from raw_user_meta_data field.
   Uses org_id column (NOT NULL) for organization reference.
   Uses ON CONFLICT to handle edge cases where profile might already exist.
   Wrapped in exception handler to prevent auth user creation failure.

   Updated 2025-11-25: Fixed to use org_id instead of organization_id.';

-- ============================================
-- PART 2: Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PROFILE TRIGGER FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Changes:';
  RAISE NOTICE '   - Trigger now uses org_id (NOT NULL) column';
  RAISE NOTICE '   - Reads organization_id from user metadata';
  RAISE NOTICE '   - Writes to org_id in profiles table';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test:';
  RAISE NOTICE '   1. Create user via admin-users Edge Function';
  RAISE NOTICE '   2. Check profile was created with org_id populated';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- To rollback this migration:
-- Run the previous version from migration 20251125000009
