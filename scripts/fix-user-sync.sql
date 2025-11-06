-- ============================================
-- FIX: Sync Existing Auth Users to Database
-- ============================================
-- This script properly syncs the 4 existing auth.users
-- to the database with correct column names
--
-- Run via: psql or Supabase SQL Editor
-- ============================================

BEGIN;

-- Variables for the 4 users
DO $$
DECLARE
  v_org_id uuid;
  v_user1_id uuid := '8920ac57-63da-4f8e-9970-719be1e2569c'; -- cli@yodelmobile.com
  v_user2_id uuid := '813ca44d-86ea-4e23-9319-d5d6f45f73eb'; -- igorblnv@gmail.com
  v_user3_id uuid := '2951a917-2086-476a-9b2e-915821a9ff0c'; -- kasia@yodelmobile.com
  v_user4_id uuid := '9487fa9d-f0cc-427c-900b-98871c19498a'; -- igor@yodelmobile.com
BEGIN
  RAISE NOTICE '🔄 Syncing existing auth users to database...';
  RAISE NOTICE '';

  -- Get or create Yodel Mobile organization
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'yodel-mobile';

  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, slug, subscription_tier)
    VALUES ('Yodel Mobile', 'yodel-mobile', 'enterprise')
    RETURNING id INTO v_org_id;
    RAISE NOTICE '✅ Created organization: Yodel Mobile (%)', v_org_id;
  ELSE
    RAISE NOTICE '✅ Using existing organization: Yodel Mobile (%)', v_org_id;
  END IF;
  RAISE NOTICE '';

  -- Create/update profiles
  RAISE NOTICE '📋 Creating profiles...';

  INSERT INTO profiles (id, email, first_name, last_name, org_id)
  VALUES
    (v_user1_id, 'cli@yodelmobile.com', 'CLI', 'Admin', v_org_id),
    (v_user2_id, 'igorblnv@gmail.com', 'Igor', 'Blinov', v_org_id),
    (v_user3_id, 'kasia@yodelmobile.com', 'Kasia', 'Yodel', v_org_id),
    (v_user4_id, 'igor@yodelmobile.com', 'Igor', 'Yodel', v_org_id)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    org_id = EXCLUDED.org_id;

  RAISE NOTICE '✅ Created/updated 4 profiles';
  RAISE NOTICE '';

  -- Create/update user_roles
  RAISE NOTICE '📋 Creating user_roles...';

  -- Delete any existing roles first (to handle the unique constraint issue)
  DELETE FROM user_roles WHERE user_id IN (v_user1_id, v_user2_id, v_user3_id, v_user4_id);

  INSERT INTO user_roles (user_id, role, organization_id)
  VALUES
    (v_user1_id, 'ORG_ADMIN', v_org_id),
    (v_user2_id, 'ORG_ADMIN', v_org_id),
    (v_user3_id, 'ORG_ADMIN', v_org_id),
    (v_user4_id, 'ORG_ADMIN', v_org_id);

  RAISE NOTICE '✅ Created 4 user_roles';
  RAISE NOTICE '';

  -- Create organization features
  RAISE NOTICE '📋 Creating organization features...';

  INSERT INTO organization_features (organization_id, feature_key, is_enabled)
  VALUES
    (v_org_id, 'app_core_access', true),
    (v_org_id, 'executive_dashboard', true),
    (v_org_id, 'reviews', true),
    (v_org_id, 'reporting_v2', true)
  ON CONFLICT (organization_id, feature_key) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled;

  RAISE NOTICE '✅ Created/updated 4 features';
  RAISE NOTICE '';

  -- Verify
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ SYNC COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION:';
  RAISE NOTICE '   Organization: Yodel Mobile (%)', v_org_id;
  RAISE NOTICE '   Profiles: 4';
  RAISE NOTICE '   User_roles: 4 (all ORG_ADMIN)';
  RAISE NOTICE '   Features: 4 (all enabled)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

COMMIT;

-- Display final state
SELECT
  'USERS' as type,
  p.email,
  ur.role,
  o.name as organization
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
JOIN organizations o ON o.id = ur.organization_id
WHERE o.slug = 'yodel-mobile'
ORDER BY p.email;

SELECT
  'FEATURES' as type,
  of.feature_key,
  of.is_enabled
FROM organization_features of
JOIN organizations o ON o.id = of.organization_id
WHERE o.slug = 'yodel-mobile'
ORDER BY of.feature_key;
