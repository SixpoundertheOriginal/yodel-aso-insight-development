-- =====================================================================
-- Migration: Fix Profiles Table and Auto-Creation Trigger
-- Purpose: Resolve "Database error creating new user" issue
-- Date: 2025-11-25
-- Issue: Supabase Auth fails to create users due to missing/broken profile trigger
-- Type: IDEMPOTENT - Safe to run multiple times
-- =====================================================================

-- ============================================
-- PART 1: Ensure profiles table exists with correct schema
-- ============================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
  'User profiles table. Automatically populated when auth.users record is created via trigger.
   Linked 1:1 with auth.users via id field.';

-- Add missing columns if they don't exist (idempotent)
DO $$
BEGIN
  -- Add email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT UNIQUE NOT NULL;
  END IF;

  -- Add first_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
  END IF;

  -- Add last_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
  END IF;

  -- Add organization_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- PART 2: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON public.profiles(organization_id);

-- ============================================
-- PART 3: Enable RLS and create policies
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Service role has full access (required for Edge Functions and triggers)
CREATE POLICY "Service role full access"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ============================================
-- PART 4: Create/Replace trigger function for auto-creating profiles
-- ============================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create trigger function that auto-creates profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new profile with data from auth.users
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    (NEW.raw_user_meta_data->>'organization_id')::uuid,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
    organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
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
   Uses ON CONFLICT to handle edge cases where profile might already exist.
   Wrapped in exception handler to prevent auth user creation failure.';

-- ============================================
-- PART 5: Create trigger on auth.users
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Note: Cannot add comment on auth.users trigger due to permissions
-- COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
--   'Automatically creates a profile in public.profiles when a new user is created in auth.users.';

-- ============================================
-- PART 6: Create updated_at trigger for profiles
-- ============================================

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- ============================================
-- PART 7: Backfill existing auth.users without profiles
-- ============================================

-- Create profiles for any existing auth.users that don't have one
INSERT INTO public.profiles (id, email, first_name, last_name, organization_id, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  (u.raw_user_meta_data->>'organization_id')::uuid,
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 8: Verification
-- ============================================

DO $$
DECLARE
  v_profiles_count INT;
  v_auth_users_count INT;
  v_trigger_exists BOOLEAN;
  v_missing_profiles INT;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;
  SELECT COUNT(*) INTO v_auth_users_count FROM auth.users;

  -- Check trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) INTO v_trigger_exists;

  -- Count auth users without profiles
  SELECT COUNT(*) INTO v_missing_profiles
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  );

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ PROFILES TABLE AND TRIGGER MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Auth users: %', v_auth_users_count;
  RAISE NOTICE '   - Profiles: %', v_profiles_count;
  RAISE NOTICE '   - Missing profiles: %', v_missing_profiles;
  RAISE NOTICE '';

  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger "on_auth_user_created" exists and is active';
  ELSE
    RAISE NOTICE '❌ WARNING: Trigger "on_auth_user_created" not found!';
  END IF;

  IF v_missing_profiles = 0 THEN
    RAISE NOTICE '✅ All auth.users have corresponding profiles';
  ELSE
    RAISE NOTICE '⚠️  WARNING: % auth.users missing profiles', v_missing_profiles;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Try creating a new user via admin-users Edge Function';
  RAISE NOTICE '   2. Check Supabase Dashboard → Authentication → Users';
  RAISE NOTICE '   3. Verify profile was created in profiles table';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- To rollback this migration, run:
--
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- DROP FUNCTION IF EXISTS public.update_profiles_updated_at() CASCADE;
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
