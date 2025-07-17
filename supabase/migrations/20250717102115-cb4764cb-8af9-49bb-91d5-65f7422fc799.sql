-- Create ChatGPT Visibility Audit tables

-- Audit runs table to track each audit session
CREATE TABLE public.chatgpt_audit_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  app_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_queries INTEGER DEFAULT 0,
  completed_queries INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Query templates and individual queries
CREATE TABLE public.chatgpt_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  audit_run_id UUID REFERENCES public.chatgpt_audit_runs(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_category TEXT,
  query_type TEXT DEFAULT 'custom', -- 'template', 'custom', 'generated'
  variables JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Query results and AI responses
CREATE TABLE public.chatgpt_query_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  query_id UUID NOT NULL REFERENCES public.chatgpt_queries(id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL REFERENCES public.chatgpt_audit_runs(id) ON DELETE CASCADE,
  response_text TEXT,
  app_mentioned BOOLEAN DEFAULT false,
  mention_position INTEGER, -- 1=primary, 2=secondary, etc.
  mention_context TEXT, -- 'recommended', 'compared', 'mentioned'
  competitors_mentioned TEXT[], -- array of competitor app names
  sentiment_score NUMERIC(3,2), -- -1.0 to 1.0
  visibility_score NUMERIC(5,2), -- calculated visibility score
  raw_response JSONB, -- full OpenAI response
  processing_metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  cost_cents INTEGER, -- cost in cents
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Visibility scoring and trends
CREATE TABLE public.chatgpt_visibility_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  audit_run_id UUID NOT NULL REFERENCES public.chatgpt_audit_runs(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  overall_score NUMERIC(5,2),
  mention_rate NUMERIC(3,2), -- percentage of queries where app was mentioned
  avg_position NUMERIC(3,2), -- average mention position
  positive_mentions INTEGER DEFAULT 0,
  neutral_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,
  top_competitors JSONB DEFAULT '[]',
  category_scores JSONB DEFAULT '{}', -- scores by query category
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_chatgpt_audit_runs_org_id ON public.chatgpt_audit_runs(organization_id);
CREATE INDEX idx_chatgpt_audit_runs_status ON public.chatgpt_audit_runs(status);
CREATE INDEX idx_chatgpt_queries_audit_run ON public.chatgpt_queries(audit_run_id);
CREATE INDEX idx_chatgpt_queries_status ON public.chatgpt_queries(status);
CREATE INDEX idx_chatgpt_query_results_audit_run ON public.chatgpt_query_results(audit_run_id);
CREATE INDEX idx_chatgpt_query_results_query_id ON public.chatgpt_query_results(query_id);
CREATE INDEX idx_chatgpt_visibility_scores_audit_run ON public.chatgpt_visibility_scores(audit_run_id);

-- Enable Row Level Security
ALTER TABLE public.chatgpt_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatgpt_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatgpt_query_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatgpt_visibility_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage audit runs for their organization" 
ON public.chatgpt_audit_runs 
FOR ALL 
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage queries for their organization" 
ON public.chatgpt_queries 
FOR ALL 
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can manage query results for their organization" 
ON public.chatgpt_query_results 
FOR ALL 
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can view visibility scores for their organization" 
ON public.chatgpt_visibility_scores 
FOR ALL 
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatgpt_audit_runs_updated_at
BEFORE UPDATE ON public.chatgpt_audit_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();