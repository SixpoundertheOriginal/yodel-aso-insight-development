-- SECURITY FIXES - Phase 2E: Final function security fixes

-- Fix the remaining functions with missing search_path
CREATE OR REPLACE FUNCTION public.can_add_app(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  org_limit INTEGER;
  limit_enforced BOOLEAN;
BEGIN
  SELECT app_limit, app_limit_enforced INTO org_limit, limit_enforced
  FROM public.organizations WHERE id = org_id;
  
  IF NOT limit_enforced THEN
    RETURN true;
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.apps 
  WHERE organization_id = org_id AND is_active = true;
  
  RETURN current_count < org_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_app_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,
    'app',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', row_to_json(OLD),
      'new', row_to_json(NEW),
      'app_name', COALESCE(NEW.app_name, OLD.app_name),
      'platform', COALESCE(NEW.platform, OLD.platform)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_rank_distribution(p_organization_id uuid, p_app_id text, p_analysis_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(top_1 integer, top_3 integer, top_5 integer, top_10 integer, top_20 integer, top_50 integer, top_100 integer, total_tracked integer, avg_rank numeric, visibility_score numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_top_1 integer := 0;
  v_top_3 integer := 0;
  v_top_5 integer := 0;
  v_top_10 integer := 0;
  v_top_20 integer := 0;
  v_top_50 integer := 0;
  v_top_100 integer := 0;
  v_total integer := 0;
  v_avg_rank numeric := 0;
  v_visibility numeric := 0;
BEGIN
  -- Get latest snapshot data for the app
  WITH latest_rankings AS (
    SELECT DISTINCT ON (keyword) 
      keyword, 
      rank_position,
      search_volume
    FROM public.keyword_ranking_snapshots
    WHERE organization_id = p_organization_id
      AND app_id = p_app_id
      AND snapshot_date <= p_analysis_date
      AND rank_position IS NOT NULL
    ORDER BY keyword, snapshot_date DESC
  )
  SELECT 
    COUNT(*) FILTER (WHERE rank_position <= 1),
    COUNT(*) FILTER (WHERE rank_position <= 3),
    COUNT(*) FILTER (WHERE rank_position <= 5),
    COUNT(*) FILTER (WHERE rank_position <= 10),
    COUNT(*) FILTER (WHERE rank_position <= 20),
    COUNT(*) FILTER (WHERE rank_position <= 50),
    COUNT(*) FILTER (WHERE rank_position <= 100),
    COUNT(*),
    AVG(rank_position)::numeric(5,2),
    -- Visibility score: weighted average based on rank position and volume
    (SUM(
      CASE 
        WHEN rank_position <= 3 THEN (COALESCE(search_volume, 100) * 1.0)
        WHEN rank_position <= 10 THEN (COALESCE(search_volume, 100) * 0.7)
        WHEN rank_position <= 20 THEN (COALESCE(search_volume, 100) * 0.4)
        WHEN rank_position <= 50 THEN (COALESCE(search_volume, 100) * 0.2)
        ELSE (COALESCE(search_volume, 100) * 0.1)
      END
    ) / NULLIF(SUM(COALESCE(search_volume, 100)), 0) * 100)::numeric(5,2)
  INTO v_top_1, v_top_3, v_top_5, v_top_10, v_top_20, v_top_50, v_top_100, v_total, v_avg_rank, v_visibility
  FROM latest_rankings;

  RETURN QUERY SELECT v_top_1, v_top_3, v_top_5, v_top_10, v_top_20, v_top_50, v_top_100, v_total, v_avg_rank, COALESCE(v_visibility, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_keyword_usage(p_organization_id uuid, p_keywords_processed integer DEFAULT 1, p_api_calls integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  INSERT INTO public.organization_keyword_usage (
    organization_id,
    month_year,
    keywords_processed,
    api_calls_made,
    updated_at
  )
  VALUES (
    p_organization_id,
    current_month,
    p_keywords_processed,
    p_api_calls,
    now()
  )
  ON CONFLICT (organization_id, month_year)
  DO UPDATE SET
    keywords_processed = organization_keyword_usage.keywords_processed + p_keywords_processed,
    api_calls_made = organization_keyword_usage.api_calls_made + p_api_calls,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_keyword_trends(p_organization_id uuid, p_app_id text, p_days_back integer DEFAULT 30)
RETURNS TABLE(keyword text, current_rank integer, previous_rank integer, rank_change integer, current_volume integer, volume_change_pct numeric, trend_direction text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_snapshots AS (
    SELECT 
      ks.keyword,
      ks.rank_position,
      ks.search_volume,
      ks.snapshot_date,
      ROW_NUMBER() OVER (PARTITION BY ks.keyword ORDER BY ks.snapshot_date DESC) as rn
    FROM public.keyword_ranking_snapshots ks
    WHERE ks.organization_id = p_organization_id
      AND ks.app_id = p_app_id
      AND ks.snapshot_date >= CURRENT_DATE - p_days_back
  ),
  current_data AS (
    SELECT 
      rs.keyword, 
      rs.rank_position as current_rank, 
      rs.search_volume as current_volume
    FROM ranked_snapshots rs 
    WHERE rs.rn = 1
  ),
  previous_data AS (
    SELECT 
      rs.keyword, 
      rs.rank_position as previous_rank, 
      rs.search_volume as previous_volume
    FROM ranked_snapshots rs 
    WHERE rs.rn = 2
  )
  SELECT 
    c.keyword,
    c.current_rank,
    p.previous_rank,
    COALESCE(p.previous_rank - c.current_rank, 0) as rank_change,
    c.current_volume,
    CASE 
      WHEN p.previous_volume > 0 THEN 
        ((c.current_volume::numeric - p.previous_volume::numeric) / p.previous_volume::numeric * 100)::numeric(5,2)
      ELSE 0::numeric(5,2)
    END as volume_change_pct,
    CASE 
      WHEN p.previous_rank IS NULL THEN 'new'::text
      WHEN p.previous_rank > c.current_rank THEN 'up'::text
      WHEN p.previous_rank < c.current_rank THEN 'down'::text
      ELSE 'stable'::text
    END as trend_direction
  FROM current_data c
  LEFT JOIN previous_data p ON c.keyword = p.keyword
  ORDER BY 
    CASE WHEN p.previous_rank IS NULL THEN 0 ELSE 1 END,
    ABS(COALESCE(p.previous_rank - c.current_rank, 0)) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;