-- Create tables for creative analysis persistence

-- Creative analysis sessions to track search queries and results
CREATE TABLE public.creative_analysis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  keyword TEXT NOT NULL,
  search_type VARCHAR(20) NOT NULL CHECK (search_type IN ('keyword', 'appid')),
  total_apps INTEGER NOT NULL DEFAULT 0,
  analysis_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual screenshot analyses 
CREATE TABLE public.screenshot_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.creative_analysis_sessions(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  screenshot_url TEXT NOT NULL,
  analysis_data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pattern analyses aggregated from multiple screenshots
CREATE TABLE public.pattern_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.creative_analysis_sessions(id) ON DELETE CASCADE,
  patterns_data JSONB NOT NULL DEFAULT '{}',
  insights TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshot_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creative_analysis_sessions
CREATE POLICY "Users can manage sessions for their organization"
  ON public.creative_analysis_sessions
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for screenshot_analyses
CREATE POLICY "Users can manage screenshot analyses for their organization"
  ON public.screenshot_analyses
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- RLS Policies for pattern_analyses
CREATE POLICY "Users can manage pattern analyses for their organization"
  ON public.pattern_analyses
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_user_organization_id())
  WITH CHECK (organization_id = get_current_user_organization_id());

-- Create indexes for better performance
CREATE INDEX idx_creative_sessions_org_created ON public.creative_analysis_sessions(organization_id, created_at DESC);
CREATE INDEX idx_screenshot_analyses_session ON public.screenshot_analyses(session_id);
CREATE INDEX idx_pattern_analyses_session ON public.pattern_analyses(session_id);

-- Add triggers for updated_at timestamp
CREATE TRIGGER update_creative_sessions_updated_at
  BEFORE UPDATE ON public.creative_analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();