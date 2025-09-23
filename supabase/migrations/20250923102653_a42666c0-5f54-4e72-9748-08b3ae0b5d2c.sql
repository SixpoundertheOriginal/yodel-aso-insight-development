-- Fix Creative Analysis Sessions RLS Policy for Production Auth Issues
-- This addresses the auth.uid() returning NULL issue in production

-- Update the existing RLS policy to handle super admin bypass and NULL auth context
DROP POLICY IF EXISTS "Users can manage sessions for their organization" ON creative_analysis_sessions;

-- Create improved RLS policy with super admin bypass and better error handling
CREATE POLICY "Users can manage creative sessions with auth fallback" 
ON creative_analysis_sessions 
FOR ALL 
USING (
  -- Allow if user is super admin (bypasses org requirement)
  is_super_admin(auth.uid()) OR 
  -- Allow if user belongs to the same organization
  (auth.uid() IS NOT NULL AND organization_id = get_current_user_organization_id()) OR
  -- Fallback: allow if organization_id matches user's profile org (direct lookup)
  (auth.uid() IS NOT NULL AND organization_id = (
    SELECT profiles.organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ))
)
WITH CHECK (
  -- Same conditions for INSERT/UPDATE
  is_super_admin(auth.uid()) OR 
  (auth.uid() IS NOT NULL AND organization_id = get_current_user_organization_id()) OR
  (auth.uid() IS NOT NULL AND organization_id = (
    SELECT profiles.organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ))
);

-- Add debugging function to help diagnose auth issues
CREATE OR REPLACE FUNCTION debug_creative_session_auth()
RETURNS TABLE(
  current_user_id uuid,
  auth_uid uuid,
  is_super_admin boolean,
  user_org_id uuid,
  profile_org_id uuid,
  has_profile boolean
) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT 
    current_setting('request.jwt.claims', true)::json->>'sub'::uuid as current_user_id,
    auth.uid() as auth_uid,
    is_super_admin(auth.uid()) as is_super_admin,
    get_current_user_organization_id() as user_org_id,
    (SELECT organization_id FROM profiles WHERE id = auth.uid()) as profile_org_id,
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()) as has_profile;
$$;