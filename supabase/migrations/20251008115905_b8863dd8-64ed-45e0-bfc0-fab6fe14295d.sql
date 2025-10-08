-- Fix RLS policy on user_roles to allow super admin role detection
-- This fixes the issue where NULL organization_id blocks super admins from seeing their roles

-- Drop the broken policy that blocks super admins
DROP POLICY IF EXISTS "view_own_roles" ON user_roles;

-- Create correct policy that allows users to see their own roles
-- regardless of organization_id value (including NULL for super admins)
CREATE POLICY "view_own_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'SUPER_ADMIN'
    )
  );