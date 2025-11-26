-- =====================================================================
-- DEBUG SCRIPT: User Creation Issue Investigation
-- Purpose: Identify why Supabase Auth is failing with "Database error"
-- Date: 2025-11-25
-- =====================================================================

-- ============================================
-- STEP 1: Check if user already exists
-- ============================================
DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_user_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Check if user already exists';
  RAISE NOTICE '========================================';

  -- Check in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'Stephen@yodelmobile.com';

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE '❌ User ALREADY EXISTS in auth.users';
    RAISE NOTICE '   User ID: %', v_user_id;
    RAISE NOTICE '   Email: Stephen@yodelmobile.com';
    RAISE NOTICE '';
    RAISE NOTICE '   This is likely the cause of the error!';
    RAISE NOTICE '   Solution: Delete this user or use a different email';
  ELSE
    RAISE NOTICE '✅ User does NOT exist in auth.users';
    RAISE NOTICE '   Email: Stephen@yodelmobile.com';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 2: Check if profiles table exists
-- ============================================
DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Check if profiles table exists';
  RAISE NOTICE '========================================';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    RAISE NOTICE '✅ profiles table EXISTS';
  ELSE
    RAISE NOTICE '❌ profiles table DOES NOT EXIST';
    RAISE NOTICE '   This may cause issues when querying user data';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 3: Check for triggers on auth.users
-- ============================================
DO $$
DECLARE
  v_trigger_count INT;
  v_trigger_name TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Check for triggers on auth.users';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth'
    AND c.relname = 'users'
    AND NOT t.tgisinternal;

  IF v_trigger_count > 0 THEN
    RAISE NOTICE '✅ Found % trigger(s) on auth.users:', v_trigger_count;

    FOR v_trigger_name IN
      SELECT tgname
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'auth'
        AND c.relname = 'users'
        AND NOT t.tgisinternal
    LOOP
      RAISE NOTICE '   - %', v_trigger_name;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️  No custom triggers found on auth.users';
    RAISE NOTICE '   This is normal if no auto-profile creation is configured';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 4: Check organization exists
-- ============================================
DO $$
DECLARE
  v_org_exists BOOLEAN;
  v_org_name TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: Check organization exists';
  RAISE NOTICE '========================================';

  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  IF v_org_name IS NOT NULL THEN
    RAISE NOTICE '✅ Organization EXISTS: %', v_org_name;
  ELSE
    RAISE NOTICE '❌ Organization NOT FOUND';
    RAISE NOTICE '   ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 5: Check user_roles table and constraints
-- ============================================
DO $$
DECLARE
  v_constraint_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: Check user_roles table';
  RAISE NOTICE '========================================';

  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    RAISE NOTICE '✅ user_roles table EXISTS';

    -- Check constraints
    SELECT COUNT(*) INTO v_constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND constraint_type = 'FOREIGN KEY';

    RAISE NOTICE '   Foreign key constraints: %', v_constraint_count;
  ELSE
    RAISE NOTICE '❌ user_roles table DOES NOT EXIST';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- STEP 6: List all existing users (for context)
-- ============================================
DO $$
DECLARE
  v_user_count INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 6: List existing users in auth.users';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_user_count FROM auth.users;
  RAISE NOTICE 'Total users in auth.users: %', v_user_count;
  RAISE NOTICE '';

  -- List all users
  RAISE NOTICE 'Existing users:';
  FOR v_user_count IN 1..10 LOOP
    PERFORM 1; -- Just to make the loop valid
  END LOOP;
END $$;

-- Show actual users
SELECT
  id,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 7: Check Supabase Auth configuration
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 7: Recommendations';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Based on the checks above:';
  RAISE NOTICE '';
  RAISE NOTICE '1. If Stephen@yodelmobile.com exists:';
  RAISE NOTICE '   → Delete the user from auth.users';
  RAISE NOTICE '   → OR use a different email address';
  RAISE NOTICE '';
  RAISE NOTICE '2. If profiles table does not exist:';
  RAISE NOTICE '   → Create profiles table with trigger';
  RAISE NOTICE '   → OR modify Edge Function to not query profiles';
  RAISE NOTICE '';
  RAISE NOTICE '3. If organization not found:';
  RAISE NOTICE '   → Check organization UUID is correct';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
