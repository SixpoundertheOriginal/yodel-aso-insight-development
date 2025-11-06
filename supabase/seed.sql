-- ============================================
-- SEED SCRIPT: Yodel Mobile Organization & User
-- ============================================
-- Creates:
-- 1. Yodel Mobile organization
-- 2. User entry with ORG_ADMIN role
-- 3. Organization features (app_core_access, executive_dashboard, reviews, reporting_v2)
--
-- Run: supabase db reset (runs all migrations + this seed)
-- Or: psql -f supabase/seed.sql
-- ============================================

BEGIN;

-- Known user ID (you'll need to create auth user separately)
-- For now, we'll use a placeholder UUID that you'll replace
DO $$
DECLARE
  v_user_id uuid := '8920ac57-63da-4f8e-9970-719be1e2569c'; -- Replace with actual auth.users id
  v_org_id uuid;
  v_email text := 'cli@yodelmobile.com';
BEGIN
  RAISE NOTICE '🌱 Starting database seed...';
  RAISE NOTICE '';

  -- 1. Create organization
  RAISE NOTICE '📋 Step 1: Creating Yodel Mobile organization...';

  INSERT INTO organizations (name, slug, subscription_tier)
  VALUES ('Yodel Mobile', 'yodel-mobile', 'enterprise')
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    subscription_tier = EXCLUDED.subscription_tier
  RETURNING id INTO v_org_id;

  RAISE NOTICE '✅ Organization created/updated: Yodel Mobile (id: %)', v_org_id;
  RAISE NOTICE '';

  -- 2. Create profile (linked to auth.users)
  RAISE NOTICE '📋 Step 2: Creating user profile...';

  INSERT INTO profiles (id, email, first_name, last_name, organization_id)
  VALUES (v_user_id, v_email, 'CLI', 'Admin', v_org_id)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    organization_id = EXCLUDED.organization_id;

  RAISE NOTICE '✅ Profile created/updated: %', v_email;
  RAISE NOTICE '';

  -- 3. Create user_roles entry
  RAISE NOTICE '📋 Step 3: Creating user_roles entry...';

  INSERT INTO user_roles (user_id, email, role, organization_id)
  VALUES (v_user_id, v_email, 'ORG_ADMIN', v_org_id)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id;

  RAISE NOTICE '✅ User role created/updated: ORG_ADMIN for %', v_email;
  RAISE NOTICE '';

  -- 4. Create organization features
  RAISE NOTICE '📋 Step 4: Creating organization features...';

  INSERT INTO organization_features (organization_id, feature_key, is_enabled)
  VALUES
    (v_org_id, 'app_core_access', true),
    (v_org_id, 'executive_dashboard', true),
    (v_org_id, 'reviews', true),
    (v_org_id, 'reporting_v2', true)
  ON CONFLICT (organization_id, feature_key) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled;

  RAISE NOTICE '✅ Organization features created/updated:';
  RAISE NOTICE '   ✅ app_core_access';
  RAISE NOTICE '   ✅ executive_dashboard';
  RAISE NOTICE '   ✅ reviews';
  RAISE NOTICE '   ✅ reporting_v2';
  RAISE NOTICE '';

  -- 5. Verify setup
  RAISE NOTICE '📋 Step 5: Verifying setup...';
  RAISE NOTICE '';

  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ DATABASE SEEDED SUCCESSFULLY';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION:';
  RAISE NOTICE '   User ID: %', v_user_id;
  RAISE NOTICE '   Email: %', v_email;
  RAISE NOTICE '   Role: ORG_ADMIN';
  RAISE NOTICE '   Organization: Yodel Mobile (id: %)', v_org_id;
  RAISE NOTICE '   Features: 4 enabled';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Create auth.users entry separately:';
  RAISE NOTICE '   Email: cli@yodelmobile.com';
  RAISE NOTICE '   Password: (set your own)';
  RAISE NOTICE '   User ID must be: %', v_user_id;
  RAISE NOTICE '';
END $$;

COMMIT;

-- Display final state
SELECT
  '📊 FINAL STATE' as section,
  o.name as organization,
  o.slug,
  p.email as user_email,
  ur.role,
  COUNT(of.feature_key) as features_enabled
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN organization_features of ON of.organization_id = o.id AND of.is_enabled = true
WHERE o.slug = 'yodel-mobile'
GROUP BY o.name, o.slug, p.email, ur.role;
