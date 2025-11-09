-- =====================================================
-- Keyword Discovery Tables
-- =====================================================
-- Creates tables for bulk keyword discovery jobs and enhanced rankings
-- Part of Phase 0: Foundation - Keyword Intelligence

-- =====================================================
-- 1. keyword_discovery_jobs table
-- =====================================================
-- Tracks bulk keyword discovery jobs (10/30/50/100 keywords)

CREATE TABLE IF NOT EXISTS public.keyword_discovery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  target_app_id TEXT NOT NULL,

  -- Job metadata
  job_type TEXT NOT NULL DEFAULT 'bulk_discovery' CHECK (job_type IN ('bulk_discovery', 'competitor_analysis', 'category_discovery')),
  job_params JSONB DEFAULT '{}'::jsonb,

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress JSONB DEFAULT '{"current": 0, "total": 100}'::jsonb,

  -- Results
  discovered_keywords INTEGER DEFAULT 0,
  error_message TEXT,
  processing_metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_keyword_discovery_jobs_org_id
  ON public.keyword_discovery_jobs(organization_id);

CREATE INDEX IF NOT EXISTS idx_keyword_discovery_jobs_status
  ON public.keyword_discovery_jobs(status);

CREATE INDEX IF NOT EXISTS idx_keyword_discovery_jobs_created_at
  ON public.keyword_discovery_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_keyword_discovery_jobs_org_created
  ON public.keyword_discovery_jobs(organization_id, created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_keyword_discovery_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_keyword_discovery_jobs_updated_at
  BEFORE UPDATE ON public.keyword_discovery_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_keyword_discovery_jobs_updated_at();

-- =====================================================
-- 2. enhanced_keyword_rankings table
-- =====================================================
-- Stores discovered keywords with enhanced metadata

CREATE TABLE IF NOT EXISTS public.enhanced_keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  keyword TEXT NOT NULL,

  -- Ranking data
  rank_position INTEGER,
  search_volume INTEGER,
  difficulty_score DECIMAL(4,2),

  -- Metadata
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  data_source TEXT NOT NULL CHECK (data_source IN ('bulk_discovery', 'manual', 'competitor_analysis', 'serp', 'category')),

  -- Snapshot tracking
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one ranking per keyword per app per day
  CONSTRAINT unique_keyword_ranking_snapshot
    UNIQUE (organization_id, app_id, keyword, snapshot_date)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_enhanced_keyword_rankings_org_app
  ON public.enhanced_keyword_rankings(organization_id, app_id);

CREATE INDEX IF NOT EXISTS idx_enhanced_keyword_rankings_keyword
  ON public.enhanced_keyword_rankings(keyword);

CREATE INDEX IF NOT EXISTS idx_enhanced_keyword_rankings_snapshot
  ON public.enhanced_keyword_rankings(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_enhanced_keyword_rankings_rank
  ON public.enhanced_keyword_rankings(rank_position)
  WHERE rank_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enhanced_keyword_rankings_org_app_snapshot
  ON public.enhanced_keyword_rankings(organization_id, app_id, snapshot_date DESC);

-- Full-text search on keywords
CREATE INDEX IF NOT EXISTS idx_enhanced_keyword_rankings_keyword_text
  ON public.enhanced_keyword_rankings USING gin(to_tsvector('english', keyword));

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_enhanced_keyword_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enhanced_keyword_rankings_updated_at
  BEFORE UPDATE ON public.enhanced_keyword_rankings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_enhanced_keyword_rankings_updated_at();

-- =====================================================
-- 3. start_keyword_discovery_job database function
-- =====================================================
-- Creates a new keyword discovery job and returns the job ID

CREATE OR REPLACE FUNCTION public.start_keyword_discovery_job(
  p_organization_id TEXT,
  p_target_app_id TEXT,
  p_job_type TEXT DEFAULT 'bulk_discovery',
  p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Create new job
  INSERT INTO public.keyword_discovery_jobs (
    organization_id,
    target_app_id,
    job_type,
    job_params,
    status,
    progress
  ) VALUES (
    p_organization_id,
    p_target_app_id,
    p_job_type,
    p_params,
    'pending',
    '{"current": 0, "total": 100}'::jsonb
  )
  RETURNING id INTO v_job_id;

  -- Log job creation
  RAISE NOTICE 'Created keyword discovery job: % for org: % app: %',
    v_job_id, p_organization_id, p_target_app_id;

  RETURN v_job_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.start_keyword_discovery_job(TEXT, TEXT, TEXT, JSONB)
  TO authenticated, anon;

-- =====================================================
-- 4. RLS Policies
-- =====================================================
-- Enable Row Level Security

ALTER TABLE public.keyword_discovery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_keyword_rankings ENABLE ROW LEVEL SECURITY;

-- keyword_discovery_jobs policies
-- Allow users to read their organization's jobs
CREATE POLICY "Users can view their organization's discovery jobs"
  ON public.keyword_discovery_jobs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id = 'public'  -- Allow public demo jobs
  );

-- Allow users to create jobs for their organization
CREATE POLICY "Users can create discovery jobs for their organization"
  ON public.keyword_discovery_jobs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id = 'public'  -- Allow public demo jobs
  );

-- Allow service role to update any job
CREATE POLICY "Service role can update any discovery job"
  ON public.keyword_discovery_jobs
  FOR UPDATE
  USING (true);

-- enhanced_keyword_rankings policies
-- Allow users to read their organization's rankings
CREATE POLICY "Users can view their organization's keyword rankings"
  ON public.enhanced_keyword_rankings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id = 'public'  -- Allow public demo data
  );

-- Allow users to insert rankings for their organization
CREATE POLICY "Users can insert keyword rankings for their organization"
  ON public.enhanced_keyword_rankings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    OR organization_id = 'public'  -- Allow public demo data
  );

-- Allow service role to update any ranking
CREATE POLICY "Service role can update any keyword ranking"
  ON public.enhanced_keyword_rankings
  FOR UPDATE
  USING (true);

-- =====================================================
-- 5. Comments for documentation
-- =====================================================

COMMENT ON TABLE public.keyword_discovery_jobs IS
  'Tracks bulk keyword discovery jobs for finding top 10/30/50/100 keywords';

COMMENT ON TABLE public.enhanced_keyword_rankings IS
  'Stores discovered keywords with enhanced metadata (volume, difficulty, confidence)';

COMMENT ON FUNCTION public.start_keyword_discovery_job IS
  'Creates a new keyword discovery job and returns the job ID';

COMMENT ON COLUMN public.keyword_discovery_jobs.progress IS
  'JSON object with current and total progress: {"current": 50, "total": 100}';

COMMENT ON COLUMN public.keyword_discovery_jobs.processing_metadata IS
  'Stores processing stats like keyword counts by source: {"totalFound": 30, "bySource": {"serp": 10, "competitor": 15, "category": 5}}';

COMMENT ON COLUMN public.enhanced_keyword_rankings.difficulty_score IS
  'Keyword difficulty score from 1-10 (1=easy, 10=hard)';

COMMENT ON COLUMN public.enhanced_keyword_rankings.snapshot_date IS
  'Date when this ranking was captured (allows historical tracking)';
