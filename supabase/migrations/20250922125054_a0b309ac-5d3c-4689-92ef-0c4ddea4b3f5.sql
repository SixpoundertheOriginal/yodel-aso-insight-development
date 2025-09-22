-- SECURITY FIXES - Phase 1A: Drop and recreate audit_logs policies safely

-- Drop all existing audit_logs policies first
DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs for their organization" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can access their organization audit logs" ON public.audit_logs;

-- Create secure audit_logs policies
CREATE POLICY "audit_logs_select_secure" ON public.audit_logs
FOR SELECT TO authenticated
USING (
  -- Super admins can see all audit logs (including platform-wide with NULL org_id)
  is_super_admin(auth.uid())
  OR
  -- Regular users can only see their organization's logs (NOT NULL org_id)
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization_id())
);

CREATE POLICY "audit_logs_insert_secure" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  -- Super admins can insert logs for any organization
  is_super_admin(auth.uid())
  OR
  -- Regular users can only insert logs for their organization
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization_id())
);

CREATE POLICY "audit_logs_update_super_admin" ON public.audit_logs
FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "audit_logs_delete_super_admin" ON public.audit_logs
FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));