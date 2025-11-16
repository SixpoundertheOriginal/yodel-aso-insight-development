-- ============================================
-- Add Dashboard AI Chat Feature Flag
-- Date: 2025-11-16
-- Purpose: Enable dashboard_ai_chat feature for organizations
-- ============================================

-- Add feature flag for Yodel Mobile (testing org)
INSERT INTO public.organization_features (organization_id, feature_key)
SELECT id, 'dashboard_ai_chat'
FROM public.organizations
WHERE name = 'Yodel Mobile'
ON CONFLICT (organization_id, feature_key) DO NOTHING;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ dashboard_ai_chat feature flag added for Yodel Mobile';
  RAISE NOTICE '';
  RAISE NOTICE 'To enable for all organizations, run:';
  RAISE NOTICE '  INSERT INTO public.organization_features (organization_id, feature_key)';
  RAISE NOTICE '  SELECT id, ''dashboard_ai_chat'' FROM public.organizations';
  RAISE NOTICE '  ON CONFLICT DO NOTHING;';
END $$;
