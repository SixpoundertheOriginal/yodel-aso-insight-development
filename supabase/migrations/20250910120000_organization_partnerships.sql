-- Organization partnerships and invitations system

-- 1. Organization Partnerships Table
CREATE TABLE public.organization_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partnership_type VARCHAR(50) NOT NULL,
  partnership_status VARCHAR(20) DEFAULT 'pending',
  permissions JSONB NOT NULL DEFAULT '{}',
  data_access_level VARCHAR(20) DEFAULT 'read_only',
  expires_at TIMESTAMP,
  access_start_date TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP,
  created_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  partnership_description TEXT,
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(primary_org_id, partner_org_id),
  CHECK (primary_org_id <> partner_org_id),
  CHECK (partnership_type IN ('agency_client','collaboration','multi_brand','data_sharing')),
  CHECK (partnership_status IN ('pending','active','suspended','expired','rejected')),
  CHECK (data_access_level IN ('read_only','read_write','export_allowed'))
);

-- 2. Partnership Invitations Table
CREATE TABLE public.partnership_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  invitation_message TEXT,
  proposed_permissions JSONB NOT NULL,
  proposed_partnership_type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  status VARCHAR(20) DEFAULT 'sent',
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMP,
  response_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_org_id, to_org_id, status) WHERE status = 'sent'
);

-- 3. Partnership Permission Templates
CREATE TABLE public.partnership_permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  partnership_type VARCHAR(50) NOT NULL,
  permissions JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_name, partnership_type)
);

INSERT INTO partnership_permission_templates (template_name, partnership_type, permissions, is_default, description) VALUES 
('Agency Basic Access', 'agency_client', '{
  "data_access": {
    "aso_metrics": "read",
    "keyword_rankings": "read",
    "competitor_analysis": "none",
    "insights": "read_basic",
    "reports": "read"
  },
  "features": {
    "export_data": false,
    "api_access": false,
    "white_label": false,
    "custom_reports": false
  },
  "temporal": {
    "date_range_limit_days": 90,
    "real_time_access": false,
    "historical_data_months": 6
  },
  "restrictions": {
    "ip_whitelist": [],
    "time_based_access": false,
    "session_timeout_minutes": 120
  }
}', true, 'Basic read-only access for agency-client relationships'),
('Client Collaboration', 'collaboration', '{
  "data_access": {
    "aso_metrics": "read_aggregated",
    "keyword_rankings": "read_filtered",
    "competitor_analysis": "read_shared_only",
    "insights": "read_basic",
    "reports": "read"
  },
  "features": {
    "export_data": true,
    "api_access": false,
    "white_label": false,
    "custom_reports": true
  },
  "temporal": {
    "date_range_limit_days": 30,
    "real_time_access": true,
    "historical_data_months": 3
  }
}', true, 'Controlled collaboration between client organizations'),
('Full Partnership', 'multi_brand', '{
  "data_access": {
    "aso_metrics": "read_write",
    "keyword_rankings": "read_write", 
    "competitor_analysis": "read",
    "insights": "read_advanced",
    "reports": "read_write"
  },
  "features": {
    "export_data": true,
    "api_access": true,
    "white_label": true,
    "custom_reports": true
  },
  "temporal": {
    "date_range_limit_days": 365,
    "real_time_access": true,
    "historical_data_months": 24
  }
}', true, 'Full access for multi-brand organizations or strategic partnerships');

-- 4. Enhanced RLS for Partnership Access
CREATE OR REPLACE FUNCTION public.has_partnership_access(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
  has_access BOOLEAN := FALSE;
BEGIN
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = auth.uid();
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM organization_partnerships
    WHERE partnership_status = 'active'
      AND ((primary_org_id = user_org_id AND partner_org_id = target_org_id)
           OR (primary_org_id = target_org_id AND partner_org_id = user_org_id))
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO has_access;
  RETURN has_access;
END;
$$;

DROP POLICY IF EXISTS aso_metrics_tenant_isolation ON aso_metrics;
CREATE POLICY aso_metrics_partnership_access ON aso_metrics
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR has_partnership_access(organization_id)
  );

DROP POLICY IF EXISTS keyword_rankings_tenant_isolation ON keyword_rankings;
CREATE POLICY keyword_rankings_partnership_access ON keyword_rankings
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR has_partnership_access(organization_id)
  );

ALTER TABLE organization_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_permission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY partnership_org_access ON organization_partnerships
  FOR ALL TO authenticated
  USING (
    primary_org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
    partner_org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
    is_super_admin()
  );

CREATE POLICY invitation_org_access ON partnership_invitations
  FOR ALL TO authenticated
  USING (
    from_org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
    to_org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
    is_super_admin()
  );

-- 5. Partnership Management Functions
CREATE OR REPLACE FUNCTION public.create_partnership_invitation(
  target_org_id UUID,
  partnership_type TEXT,
  permissions_template TEXT DEFAULT 'Agency Basic Access',
  custom_message TEXT DEFAULT NULL,
  expires_days INTEGER DEFAULT 7
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
  invitation_id UUID;
  template_permissions JSONB;
BEGIN
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = auth.uid();
  IF NOT (is_org_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Insufficient permissions to create partnerships';
  END IF;
  IF user_org_id = target_org_id THEN
    RAISE EXCEPTION 'Cannot create partnership with own organization';
  END IF;
  IF EXISTS (
    SELECT 1 FROM organization_partnerships
    WHERE partnership_status = 'active'
      AND ((primary_org_id = user_org_id AND partner_org_id = target_org_id) OR
           (primary_org_id = target_org_id AND partner_org_id = user_org_id))
  ) THEN
    RAISE EXCEPTION 'Active partnership already exists with this organization';
  END IF;
  SELECT permissions INTO template_permissions
  FROM partnership_permission_templates
  WHERE template_name = permissions_template
    AND partnership_type = create_partnership_invitation.partnership_type;
  IF template_permissions IS NULL THEN
    RAISE EXCEPTION 'Invalid permissions template: %', permissions_template;
  END IF;
  INSERT INTO partnership_invitations (
    from_org_id, to_org_id, invited_by, invitation_message,
    proposed_permissions, proposed_partnership_type, expires_at
  ) VALUES (
    user_org_id, target_org_id, auth.uid(), custom_message,
    template_permissions, partnership_type,
    NOW() + (expires_days || ' days')::INTERVAL
  ) RETURNING id INTO invitation_id;
  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (user_org_id, auth.uid(), 'CREATE_PARTNERSHIP_INVITATION', 'partnership_invitation', invitation_id::TEXT,
          jsonb_build_object('target_org_id', target_org_id, 'partnership_type', partnership_type));
  RETURN invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_partnership_invitation(
  invitation_id UUID,
  response_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  partnership_id UUID;
  user_org_id UUID;
BEGIN
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = auth.uid();
  IF NOT (is_org_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Insufficient permissions to accept partnerships';
  END IF;
  SELECT * INTO invitation_record
  FROM partnership_invitations
  WHERE id = invitation_id AND to_org_id = user_org_id AND status = 'sent';
  IF invitation_record IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  IF invitation_record.expires_at < NOW() THEN
    UPDATE partnership_invitations SET status = 'expired' WHERE id = invitation_id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;
  INSERT INTO organization_partnerships (
    primary_org_id, partner_org_id, partnership_type, partnership_status,
    permissions, created_by, approved_by, approved_at, partnership_description
  ) VALUES (
    invitation_record.from_org_id, invitation_record.to_org_id,
    invitation_record.proposed_partnership_type, 'active',
    invitation_record.proposed_permissions, invitation_record.invited_by,
    auth.uid(), NOW(), 'Partnership created via invitation acceptance'
  ) RETURNING id INTO partnership_id;
  UPDATE partnership_invitations
  SET status = 'accepted', responded_by = auth.uid(), responded_at = NOW(), response_message = accept_partnership_invitation.response_message
  WHERE id = invitation_id;
  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (user_org_id, auth.uid(), 'ACCEPT_PARTNERSHIP_INVITATION', 'organization_partnership', partnership_id::TEXT,
          jsonb_build_object('invitation_id', invitation_id, 'from_org_id', invitation_record.from_org_id));
  RETURN partnership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_partnerships()
RETURNS TABLE (
  partnership_id UUID,
  partner_organization JSONB,
  partnership_type TEXT,
  partnership_status TEXT,
  permissions JSONB,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  SELECT organization_id INTO user_org_id FROM profiles WHERE id = auth.uid();
  RETURN QUERY
  SELECT 
    op.id,
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'domain', o.domain
    ),
    op.partnership_type,
    op.partnership_status,
    op.permissions,
    op.created_at,
    op.expires_at,
    (op.primary_org_id = user_org_id) as is_primary
  FROM organization_partnerships op
  JOIN organizations o ON (
    CASE 
      WHEN op.primary_org_id = user_org_id THEN o.id = op.partner_org_id
      ELSE o.id = op.primary_org_id
    END
  )
  WHERE (op.primary_org_id = user_org_id OR op.partner_org_id = user_org_id)
    AND op.partnership_status IN ('active', 'pending')
  ORDER BY op.created_at DESC;
END;
$$;
