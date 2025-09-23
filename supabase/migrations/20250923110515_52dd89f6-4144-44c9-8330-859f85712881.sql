-- Phase 1: Enhanced Database Schema for Keyword Intelligence 2.0
-- Creating tables for bulk keyword discovery, competitor intelligence, and enhanced tracking

-- 1. Keyword Discovery Jobs Table - Track bulk extraction operations
CREATE TABLE public.keyword_discovery_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  job_type VARCHAR(50) NOT NULL DEFAULT 'bulk_discovery', -- 'bulk_discovery', 'competitor_mining', 'category_discovery'
  target_app_id TEXT NOT NULL,
  discovery_params JSONB NOT NULL DEFAULT '{}', -- Store parameters like keywords count, filters, etc
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  progress JSONB NOT NULL DEFAULT '{"current": 0, "total": 0}',
  discovered_keywords INTEGER DEFAULT 0,
  processing_metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Competitor App Rankings Table - Store comprehensive competitor data
CREATE TABLE public.competitor_app_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  target_app_id TEXT NOT NULL,
  competitor_app_id TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_developer TEXT,
  keyword TEXT NOT NULL,
  competitor_rank INTEGER,
  target_app_rank INTEGER,
  search_volume INTEGER,
  competition_strength NUMERIC(3,2), -- 0.00 to 10.00
  market_share_percent NUMERIC(5,2), -- percentage of visibility for this keyword
  discovery_source VARCHAR(50) DEFAULT 'serp_analysis', -- 'serp_analysis', 'category_mining', 'manual'
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, target_app_id, competitor_app_id, keyword, snapshot_date)
);

-- 3. Keyword Suggestion Pools - Systematic keyword discovery results
CREATE TABLE public.keyword_suggestion_pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  pool_name TEXT NOT NULL,
  discovery_method VARCHAR(50) NOT NULL, -- 'top_10_discovery', 'competitor_mining', 'category_analysis'
  target_app_id TEXT,
  keywords TEXT[] NOT NULL,
  keyword_metadata JSONB DEFAULT '{}', -- Store additional data per keyword
  discovery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quality_score NUMERIC(3,2) DEFAULT 0.0, -- 0.00 to 10.00
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enhanced Keyword Rankings History - Better historical tracking
CREATE TABLE public.enhanced_keyword_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  app_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  rank_position INTEGER,
  previous_rank INTEGER,
  rank_change INTEGER, -- calculated change from previous
  search_volume INTEGER,
  volume_change_percent NUMERIC(5,2),
  difficulty_score NUMERIC(3,2),
  confidence_level VARCHAR(20) DEFAULT 'estimated', -- 'estimated', 'verified', 'actual'
  data_source VARCHAR(50) DEFAULT 'system', -- 'system', 'manual', 'api', 'scraping'
  tracking_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, app_id, keyword, snapshot_date)
);

-- 5. Bulk Keyword Operations - Track bulk analysis operations
CREATE TABLE public.bulk_keyword_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'bulk_analysis', 'competitor_extraction', 'ranking_update'
  target_app_id TEXT NOT NULL,
  keywords_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  operation_params JSONB DEFAULT '{}',
  results_summary JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_keyword_discovery_jobs_org_status ON public.keyword_discovery_jobs(organization_id, status);
CREATE INDEX idx_competitor_app_rankings_target_keyword ON public.competitor_app_rankings(target_app_id, keyword);
CREATE INDEX idx_competitor_app_rankings_org_date ON public.competitor_app_rankings(organization_id, snapshot_date);
CREATE INDEX idx_keyword_suggestion_pools_org_method ON public.keyword_suggestion_pools(organization_id, discovery_method);
CREATE INDEX idx_enhanced_keyword_rankings_app_date ON public.enhanced_keyword_rankings(app_id, snapshot_date);
CREATE INDEX idx_bulk_keyword_operations_org_status ON public.bulk_keyword_operations(organization_id, status);

-- Enable RLS for all new tables
ALTER TABLE public.keyword_discovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_app_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_suggestion_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_keyword_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_keyword_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage keyword discovery jobs for their organization"
  ON public.keyword_discovery_jobs
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage competitor rankings for their organization"
  ON public.competitor_app_rankings
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage keyword suggestions for their organization"
  ON public.keyword_suggestion_pools
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage enhanced rankings for their organization"
  ON public.enhanced_keyword_rankings
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage bulk operations for their organization"
  ON public.bulk_keyword_operations
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- Create database functions for enhanced keyword intelligence

-- Function to get top N keywords for any app
CREATE OR REPLACE FUNCTION public.get_top_keywords_for_app(
  p_organization_id UUID,
  p_app_id TEXT,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE(
  keyword TEXT,
  rank_position INTEGER,
  search_volume INTEGER,
  confidence_level TEXT,
  last_updated DATE
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ekr.keyword,
    ekr.rank_position,
    ekr.search_volume,
    ekr.confidence_level,
    ekr.snapshot_date as last_updated
  FROM public.enhanced_keyword_rankings ekr
  WHERE ekr.organization_id = p_organization_id
    AND ekr.app_id = p_app_id
    AND ekr.rank_position IS NOT NULL
    AND ekr.rank_position <= 100
  ORDER BY ekr.rank_position ASC, ekr.search_volume DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Function to get competitor keyword overlap
CREATE OR REPLACE FUNCTION public.get_competitor_keyword_overlap(
  p_organization_id UUID,
  p_target_app_id TEXT,
  p_competitor_app_id TEXT
) RETURNS TABLE(
  keyword TEXT,
  target_rank INTEGER,
  competitor_rank INTEGER,
  rank_gap INTEGER,
  search_volume INTEGER,
  opportunity_score NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT 
    car.keyword,
    car.target_app_rank as target_rank,
    car.competitor_rank,
    (car.target_app_rank - car.competitor_rank) as rank_gap,
    car.search_volume,
    -- Calculate opportunity score: higher when competitor ranks better + high volume
    CASE 
      WHEN car.competitor_rank < car.target_app_rank AND car.search_volume > 1000 THEN 9.0
      WHEN car.competitor_rank < car.target_app_rank AND car.search_volume > 500 THEN 7.0
      WHEN car.competitor_rank < car.target_app_rank THEN 5.0
      ELSE 2.0
    END::NUMERIC(3,1) as opportunity_score
  FROM public.competitor_app_rankings car
  WHERE car.organization_id = p_organization_id
    AND car.target_app_id = p_target_app_id
    AND car.competitor_app_id = p_competitor_app_id
    AND car.target_app_rank IS NOT NULL
    AND car.competitor_rank IS NOT NULL
  ORDER BY 
    CASE 
      WHEN car.competitor_rank < car.target_app_rank THEN (car.target_app_rank - car.competitor_rank)
      ELSE 0 
    END DESC,
    car.search_volume DESC NULLS LAST;
END;
$$;

-- Function to start bulk keyword discovery job
CREATE OR REPLACE FUNCTION public.start_keyword_discovery_job(
  p_organization_id UUID,
  p_target_app_id TEXT,
  p_job_type VARCHAR DEFAULT 'bulk_discovery',
  p_params JSONB DEFAULT '{}'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO public.keyword_discovery_jobs (
    organization_id,
    target_app_id,
    job_type,
    discovery_params,
    created_by
  ) VALUES (
    p_organization_id,
    p_target_app_id,
    p_job_type,
    p_params,
    auth.uid()
  ) RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;