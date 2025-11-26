-- Migration: Add RLS policies for role_feature_permissions and user_role_permissions view
-- Purpose: Allow Edge Functions and users to query role permissions
-- Date: 2025-11-26

-- ============================================
-- STEP 1: Enable RLS on role_feature_permissions (if not already enabled)
-- ============================================
ALTER TABLE role_feature_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Add policy to allow anyone to read role permissions
-- ============================================
-- Role permissions are not sensitive - they define what each role CAN do
-- Anyone authenticated should be able to see what permissions exist for roles
CREATE POLICY "Allow authenticated users to read role permissions"
ON role_feature_permissions
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- STEP 3: Add policy to allow service role to manage role permissions
-- ============================================
CREATE POLICY "Allow service role to manage role permissions"
ON role_feature_permissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Note: Views inherit RLS from underlying tables
-- ============================================
-- The user_role_permissions view will automatically be accessible because:
-- 1. user_roles table already has RLS policies allowing users to see their own roles
-- 2. role_feature_permissions now has a policy allowing anyone to read it
-- 3. platform_features should have a similar policy (will add if needed)

-- ============================================
-- STEP 4: Ensure platform_features is readable
-- ============================================
ALTER TABLE platform_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read platform features"
ON platform_features
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow service role to manage platform features"
ON platform_features
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies added for role_feature_permissions and platform_features';
  RAISE NOTICE 'Edge Functions can now query role permissions with user JWT';
END $$;
