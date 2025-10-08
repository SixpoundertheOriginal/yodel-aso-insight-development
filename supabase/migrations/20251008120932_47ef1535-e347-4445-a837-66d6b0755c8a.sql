-- ============================================================================
-- ASO_TOOL Schema Restoration Migration (CORRECTED)
-- Description: Restores missing tables from previous Supabase project
-- Date: 2025-01-08
-- Fix: Removed DATE() function from UNIQUE constraint
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CHATGPT AUDIT TABLES
-- ----------------------------------------------------------------------------

-- Audit Run Configuration & Tracking
CREATE TABLE IF NOT EXISTS chatgpt_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audit_type VARCHAR(20) DEFAULT 'topic' CHECK (audit_type IN ('topic', 'app')),
  topic_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE chatgpt_audit_runs IS 'Tracks ChatGPT visibility audit execution runs';

-- Individual Query Tracking
CREATE TABLE IF NOT EXISTS chatgpt_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id UUID NOT NULL REFERENCES chatgpt_audit_runs(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50) CHECK (query_type IN ('discovery', 'competitive', 'solution')),
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE chatgpt_queries IS 'Individual queries generated for audit runs';

-- AI Response Analysis Results
CREATE TABLE IF NOT EXISTS chatgpt_query_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query_id UUID NOT NULL REFERENCES chatgpt_queries(id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL REFERENCES chatgpt_audit_runs(id) ON DELETE CASCADE,
  
  -- ChatGPT Response Data
  chatgpt_response TEXT NOT NULL,
  response_text_length INTEGER,
  tokens_used INTEGER CHECK (tokens_used >= 0),
  cost_cents INTEGER CHECK (cost_cents >= 0),
  
  -- Analysis Results
  app_mentioned BOOLEAN DEFAULT FALSE,
  mention_position INTEGER CHECK (mention_position IS NULL OR mention_position > 0),
  visibility_score DECIMAL(5,2) DEFAULT 0 CHECK (visibility_score >= 0 AND visibility_score <= 100),
  sentiment_score DECIMAL(3,2) DEFAULT 0 CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  
  -- Enhanced Entity Analysis
  entity_analysis JSONB,
  competitive_context JSONB,
  
  -- Metadata
  analysis_type VARCHAR(50) DEFAULT 'topic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE chatgpt_query_results IS 'Stores ChatGPT responses and analysis results';

-- Visibility Scores Aggregation
CREATE TABLE IF NOT EXISTS chatgpt_visibility_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL REFERENCES chatgpt_audit_runs(id) ON DELETE CASCADE,
  entity_name VARCHAR(255) NOT NULL,
  visibility_score DECIMAL(5,2) CHECK (visibility_score >= 0 AND visibility_score <= 100),
  mention_count INTEGER DEFAULT 0 CHECK (mention_count >= 0),
  average_position DECIMAL(4,2),
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_entity_per_audit UNIQUE(audit_run_id, entity_name)
);

COMMENT ON TABLE chatgpt_visibility_scores IS 'Aggregated visibility metrics per audit run';

-- Historical Position Tracking
CREATE TABLE IF NOT EXISTS chatgpt_position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audit_run_id UUID REFERENCES chatgpt_audit_runs(id) ON DELETE CASCADE,
  
  -- Entity Tracking
  entity_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('company', 'app', 'service')),
  topic_context VARCHAR(255) NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Position Metrics
  mention_count INTEGER DEFAULT 0,
  average_position DECIMAL(4,2),
  visibility_score DECIMAL(5,2),
  sentiment_score DECIMAL(3,2),
  
  -- Competitive Context
  competitor_mentions JSONB,
  market_share_estimate DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_entity_topic_snapshot UNIQUE(organization_id, entity_name, topic_context, snapshot_date)
);

COMMENT ON TABLE chatgpt_position_history IS 'Tracks entity visibility trends over time';

-- ----------------------------------------------------------------------------
-- 2. KEYWORD INTELLIGENCE TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS keyword_ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id VARCHAR(255) NOT NULL,
  keyword TEXT NOT NULL,
  rank INTEGER CHECK (rank > 0),
  search_volume INTEGER CHECK (search_volume >= 0),
  difficulty_score DECIMAL(3,2) CHECK (difficulty_score >= 0 AND difficulty_score <= 1),
  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_keyword_snapshot UNIQUE(app_id, keyword, snapshot_date)
);

COMMENT ON TABLE keyword_ranking_snapshots IS 'Daily keyword ranking snapshots for trend analysis';

-- ----------------------------------------------------------------------------
-- 3. METADATA COPILOT TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS metadata_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  
  -- Metadata Fields
  title TEXT,
  subtitle TEXT,
  description TEXT,
  keywords TEXT,
  promotional_text TEXT,
  
  -- Version Control
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  is_active BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- AI Generation Metadata
  ai_generated BOOLEAN DEFAULT FALSE,
  generation_prompt TEXT,
  generation_model VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_app_version UNIQUE(app_id, platform, version_number)
);

COMMENT ON TABLE metadata_versions IS 'Version control for app metadata with AI generation tracking';

-- ----------------------------------------------------------------------------
-- 4. ASO METRICS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aso_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  app_id VARCHAR(255) NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Core Metrics
  impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
  downloads INTEGER DEFAULT 0 CHECK (downloads >= 0),
  product_page_views INTEGER DEFAULT 0 CHECK (product_page_views >= 0),
  conversion_rate DECIMAL(5,2) CHECK (conversion_rate >= 0 AND conversion_rate <= 100),
  
  -- Traffic Sources
  traffic_source VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_app_date_source UNIQUE(app_id, metric_date, traffic_source)
);

COMMENT ON TABLE aso_metrics IS 'ASO performance metrics (supplement to BigQuery data)';

-- ----------------------------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE chatgpt_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatgpt_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatgpt_query_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatgpt_visibility_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatgpt_position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aso_metrics ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6. CREATE RLS POLICIES (Organization-Scoped with Super Admin Bypass)
-- ----------------------------------------------------------------------------

-- ChatGPT Audit Runs
DROP POLICY IF EXISTS "org_access_audit_runs" ON chatgpt_audit_runs;
CREATE POLICY "org_access_audit_runs" ON chatgpt_audit_runs
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- ChatGPT Queries  
DROP POLICY IF EXISTS "org_access_queries" ON chatgpt_queries;
CREATE POLICY "org_access_queries" ON chatgpt_queries
  FOR ALL USING (
    audit_run_id IN (
      SELECT id FROM chatgpt_audit_runs WHERE organization_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
      )
    ) OR
    is_super_admin(auth.uid())
  );

-- ChatGPT Query Results
DROP POLICY IF EXISTS "org_access_query_results" ON chatgpt_query_results;
CREATE POLICY "org_access_query_results" ON chatgpt_query_results
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- ChatGPT Visibility Scores
DROP POLICY IF EXISTS "org_access_visibility" ON chatgpt_visibility_scores;
CREATE POLICY "org_access_visibility" ON chatgpt_visibility_scores
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- ChatGPT Position History
DROP POLICY IF EXISTS "org_access_position_history" ON chatgpt_position_history;
CREATE POLICY "org_access_position_history" ON chatgpt_position_history
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- Keyword Rankings
DROP POLICY IF EXISTS "org_access_rankings" ON keyword_ranking_snapshots;
CREATE POLICY "org_access_rankings" ON keyword_ranking_snapshots
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- Metadata Versions
DROP POLICY IF EXISTS "org_access_metadata" ON metadata_versions;
CREATE POLICY "org_access_metadata" ON metadata_versions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- ASO Metrics
DROP POLICY IF EXISTS "org_access_metrics" ON aso_metrics;
CREATE POLICY "org_access_metrics" ON aso_metrics
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ) OR
    is_super_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 7. CREATE PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- ChatGPT Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_runs_org ON chatgpt_audit_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_status ON chatgpt_audit_runs(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_queries_audit_run ON chatgpt_queries(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_query_results_org ON chatgpt_query_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_query_results_audit ON chatgpt_query_results(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_visibility_scores_org ON chatgpt_visibility_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_position_history_org_entity ON chatgpt_position_history(organization_id, entity_name);

-- Keyword Intelligence indexes
CREATE INDEX IF NOT EXISTS idx_rankings_org_app ON keyword_ranking_snapshots(organization_id, app_id);
CREATE INDEX IF NOT EXISTS idx_rankings_date ON keyword_ranking_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_keyword ON keyword_ranking_snapshots(keyword);

-- Metadata Copilot indexes
CREATE INDEX IF NOT EXISTS idx_metadata_org_app ON metadata_versions(organization_id, app_id);
CREATE INDEX IF NOT EXISTS idx_metadata_active ON metadata_versions(app_id, platform, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_metadata_published ON metadata_versions(app_id, platform, is_published) WHERE is_published = TRUE;

-- ASO Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_org_app_date ON aso_metrics(organization_id, app_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON aso_metrics(metric_date DESC);

-- ----------------------------------------------------------------------------
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_metadata_versions_updated_at ON metadata_versions;
CREATE TRIGGER update_metadata_versions_updated_at
  BEFORE UPDATE ON metadata_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();