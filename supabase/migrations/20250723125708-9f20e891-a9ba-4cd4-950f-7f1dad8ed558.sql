-- Enhanced Competitor Intelligence Schema
-- Competitor analysis table
CREATE TABLE public.competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  search_term VARCHAR(255) NOT NULL,
  search_type VARCHAR(50) NOT NULL CHECK (search_type IN ('brand', 'keyword', 'category')),
  analysis_date TIMESTAMP DEFAULT NOW(),
  
  -- Analysis metadata
  total_apps_analyzed INTEGER DEFAULT 0,
  analysis_status VARCHAR(50) DEFAULT 'processing' CHECK (analysis_status IN ('processing', 'completed', 'failed')),
  ai_summary TEXT,
  insights JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual competitor app data
CREATE TABLE public.competitor_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES competitor_analysis(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- App store data
  app_id VARCHAR(255) NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  developer_name VARCHAR(255),
  platform VARCHAR(50) NOT NULL DEFAULT 'ios',
  ranking_position INTEGER,
  
  -- Metrics
  rating_score DECIMAL(3,2),
  rating_count INTEGER,
  category VARCHAR(100),
  price DECIMAL(10,2),
  
  -- Metadata analysis
  title_keywords TEXT[],
  subtitle_keywords TEXT[],
  description_keywords TEXT[],
  
  -- AI insights
  ai_keyword_analysis JSONB DEFAULT '{}',
  competitive_strengths TEXT,
  positioning_summary TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Competitor keyword intelligence
CREATE TABLE public.competitor_keyword_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_app_id UUID REFERENCES competitor_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  keyword VARCHAR(255) NOT NULL,
  keyword_source VARCHAR(50) CHECK (keyword_source IN ('title', 'subtitle', 'description')),
  frequency_score INTEGER DEFAULT 1,
  relevance_score DECIMAL(3,2) DEFAULT 0.0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Competitive trends tracking
CREATE TABLE public.competitive_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  search_term VARCHAR(255) NOT NULL,
  trend_date DATE DEFAULT CURRENT_DATE,
  
  -- Market metrics
  avg_rating DECIMAL(3,2),
  total_competitors INTEGER,
  market_saturation_score DECIMAL(3,2),
  
  -- Keyword trends
  trending_keywords TEXT[],
  emerging_keywords TEXT[],
  declining_keywords TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_competitor_analysis_org_search ON competitor_analysis(organization_id, search_term);
CREATE INDEX idx_competitor_apps_analysis ON competitor_apps(analysis_id);
CREATE INDEX idx_competitor_keywords_app ON competitor_keyword_intelligence(competitor_app_id);
CREATE INDEX idx_competitive_trends_org_term ON competitive_trends(organization_id, search_term);

-- Enable RLS
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_keyword_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage competitor analysis for their organization"
  ON competitor_analysis FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage competitor apps for their organization"
  ON competitor_apps FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage competitor keywords for their organization"
  ON competitor_keyword_intelligence FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage competitive trends for their organization"
  ON competitive_trends FOR ALL
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- Trigger for updated_at
CREATE TRIGGER update_competitor_analysis_updated_at
  BEFORE UPDATE ON competitor_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();