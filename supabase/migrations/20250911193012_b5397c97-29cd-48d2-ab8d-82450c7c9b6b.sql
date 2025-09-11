-- Add Application Feature Permissions to existing ui_permissions table
INSERT INTO public.ui_permissions (role, permission_key, is_granted, context, updated_at)
SELECT 
  role_name,
  permission_key,
  CASE 
    WHEN role_name = 'SUPER_ADMIN' THEN true
    WHEN role_name = 'ORGANIZATION_ADMIN' THEN true  
    WHEN role_name = 'ASO_MANAGER' AND permission_key IN ('features.aso_ai_audit', 'features.metadata_generator', 'features.keyword_intelligence', 'features.competitive_analysis') THEN true
    WHEN role_name = 'ANALYST' AND permission_key IN ('features.advanced_analytics', 'features.competitive_analysis') THEN true
    ELSE false
  END as is_granted,
  '{}' as context,
  NOW() as updated_at
FROM (
  SELECT unnest(ARRAY['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'ASO_MANAGER', 'ANALYST', 'VIEWER', 'CLIENT']) as role_name
) roles
CROSS JOIN (
  VALUES 
    ('features.aso_ai_audit'),
    ('features.growth_accelerators'),
    ('features.metadata_generator'),
    ('features.keyword_intelligence'),
    ('features.creative_intelligence'),
    ('features.competitive_analysis'),
    ('features.advanced_analytics')
) features(permission_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ui_permissions up 
  WHERE up.role = role_name 
  AND up.permission_key = features.permission_key
);