-- Create UI permissions table for granular interface control
CREATE TABLE public.ui_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  is_granted BOOLEAN DEFAULT false,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(role, permission_key)
);

-- Enable RLS for security
ALTER TABLE public.ui_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for UI permissions
CREATE POLICY "Super admins can manage UI permissions" ON public.ui_permissions
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view UI permissions for their role" ON public.ui_permissions
  FOR SELECT TO authenticated
  USING (
    role IN (
      SELECT ur.role::text 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

-- Seed enterprise UI permissions
INSERT INTO public.ui_permissions (role, permission_key, is_granted) VALUES
-- Super Admin - Full Debug Access
('SUPER_ADMIN', 'ui.debug.show_test_buttons', true),
('SUPER_ADMIN', 'ui.debug.show_live_badges', true),
('SUPER_ADMIN', 'ui.debug.show_metadata', true),
('SUPER_ADMIN', 'ui.debug.show_performance_metrics', true),
('SUPER_ADMIN', 'ui.admin.show_user_management', true),
('SUPER_ADMIN', 'ui.admin.show_system_info', true),

-- Org Admin - Limited Debug Access
('ORGANIZATION_ADMIN', 'ui.debug.show_live_badges', true),
('ORGANIZATION_ADMIN', 'ui.debug.show_performance_metrics', true),
('ORGANIZATION_ADMIN', 'ui.admin.show_user_management', true),
('ORGANIZATION_ADMIN', 'ui.debug.show_test_buttons', false),

-- Business Users - Clean Interface
('ASO_MANAGER', 'ui.debug.show_live_badges', false),
('ASO_MANAGER', 'ui.debug.show_test_buttons', false),
('ASO_MANAGER', 'ui.debug.show_metadata', false),

('ANALYST', 'ui.debug.show_live_badges', false),
('ANALYST', 'ui.debug.show_test_buttons', false),
('ANALYST', 'ui.debug.show_metadata', false),

('VIEWER', 'ui.debug.show_live_badges', false),
('VIEWER', 'ui.debug.show_test_buttons', false),
('VIEWER', 'ui.debug.show_metadata', false),

('CLIENT', 'ui.debug.show_live_badges', false),
('CLIENT', 'ui.debug.show_test_buttons', false),
('CLIENT', 'ui.debug.show_metadata', false);

-- Create UI access audit logging table
CREATE TABLE public.ui_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  permission_key VARCHAR(100) NOT NULL,
  access_granted BOOLEAN NOT NULL,
  context JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit logs
ALTER TABLE public.ui_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy for audit logs
CREATE POLICY "Super admins can view all UI access logs" ON public.ui_access_logs
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own UI access logs" ON public.ui_access_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert UI access logs" ON public.ui_access_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_ui_permissions_role ON public.ui_permissions(role);
CREATE INDEX idx_ui_permissions_key ON public.ui_permissions(permission_key);
CREATE INDEX idx_ui_access_logs_user_date ON public.ui_access_logs(user_id, created_at);
CREATE INDEX idx_ui_access_logs_permission ON public.ui_access_logs(permission_key, created_at);

-- Create function to get user UI permissions
CREATE OR REPLACE FUNCTION public.get_user_ui_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(permission_key VARCHAR, is_granted BOOLEAN, context JSONB)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.permission_key,
    up.is_granted,
    up.context
  FROM public.ui_permissions up
  WHERE up.role IN (
    SELECT ur.role::text 
    FROM public.user_roles ur 
    WHERE ur.user_id = p_user_id
  )
  AND up.is_granted = true;
END;
$$;