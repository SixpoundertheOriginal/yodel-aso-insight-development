-- SECURITY FIXES - Phase 2D: Fix remaining function security issues

-- Complete the remaining functions with missing search_path
CREATE OR REPLACE FUNCTION public.get_keyword_volume_trends(p_organization_id uuid, p_keyword text, p_days_back integer DEFAULT 30)
RETURNS TABLE(recorded_date date, search_volume integer, popularity_score numeric, trend_direction text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kvh.recorded_date,
    kvh.search_volume,
    kvh.popularity_score,
    kvh.search_volume_trend
  FROM public.keyword_volume_history kvh
  WHERE kvh.organization_id = p_organization_id
    AND kvh.keyword = p_keyword
    AND kvh.recorded_date >= CURRENT_DATE - p_days_back
  ORDER BY kvh.recorded_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_keyword_gap_analysis(p_organization_id uuid, p_target_app_id text, p_limit integer DEFAULT 50)
RETURNS TABLE(keyword text, target_rank integer, best_competitor_rank integer, gap_opportunity text, search_volume integer, difficulty_score numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ck.keyword,
    ck.target_rank,
    MIN(ck.competitor_rank) as best_competitor_rank,
    ck.gap_opportunity::text,  -- Explicit cast to text to fix type mismatch
    MAX(ck.search_volume) as search_volume,
    AVG(ck.keyword_difficulty) as difficulty_score
  FROM public.competitor_keywords ck
  WHERE ck.organization_id = p_organization_id
    AND ck.target_app_id = p_target_app_id
    AND ck.gap_opportunity IN ('high', 'medium')
  GROUP BY ck.keyword, ck.target_rank, ck.gap_opportunity
  ORDER BY 
    CASE ck.gap_opportunity 
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      ELSE 3
    END,
    search_volume DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_app_discoveries(p_organization_id uuid)
RETURNS TABLE(id uuid, app_identifier character varying, app_name character varying, record_count integer, first_seen date, last_seen date, days_with_data integer, discovered_date timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oa.id,
    oa.app_identifier,
    oa.app_name,
    (oa.app_metadata->>'record_count')::INTEGER as record_count,
    (oa.app_metadata->>'first_seen')::DATE as first_seen,
    (oa.app_metadata->>'last_seen')::DATE as last_seen,
    (oa.app_metadata->>'days_with_data')::INTEGER as days_with_data,
    oa.discovered_date
  FROM public.organization_apps oa
  WHERE oa.organization_id = p_organization_id
    AND oa.approval_status = 'pending'
  ORDER BY oa.discovered_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_app_approval_status(p_app_id uuid, p_status character varying, p_approved_by uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.organization_apps
  SET 
    approval_status = p_status,
    approved_date = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    approved_by = CASE WHEN p_status = 'approved' THEN COALESCE(p_approved_by, auth.uid()) ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_app_id
    AND organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    );
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_approved_apps(p_organization_id uuid)
RETURNS TABLE(app_identifier character varying)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT oa.app_identifier
  FROM public.organization_apps oa
  WHERE oa.organization_id = p_organization_id
    AND oa.approval_status = 'approved';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_app_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE 
  current_count INTEGER;
  org_limit INTEGER;
  limit_enforced BOOLEAN;
  org_tier VARCHAR(50);
BEGIN
  -- Get organization details
  SELECT app_limit, app_limit_enforced, subscription_tier 
  INTO org_limit, limit_enforced, org_tier
  FROM public.organizations 
  WHERE id = NEW.organization_id;
  
  -- Skip check if limit enforcement is disabled (for enterprise customers)
  IF NOT limit_enforced THEN
    RETURN NEW;
  END IF;
  
  -- Get current active app count
  SELECT COUNT(*) INTO current_count 
  FROM public.apps 
  WHERE organization_id = NEW.organization_id 
    AND is_active = true;
  
  -- Check limit with helpful error message
  IF current_count >= org_limit THEN
    RAISE EXCEPTION 'Organization has reached its % tier app limit of %. Upgrade subscription to add more apps.', 
      org_tier, org_limit
      USING HINT = 'Contact support to upgrade your subscription tier';
  END IF;
  
  RETURN NEW;
END;
$$;