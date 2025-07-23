-- Create AI insights table for enhanced ASO-specific insights
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  insight_type VARCHAR(100) NOT NULL, -- 'cvr_analysis', 'impression_trends', 'traffic_source_performance', etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metrics_data JSONB DEFAULT '{}', -- Store relevant metrics and context
  confidence_score NUMERIC(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  data_fingerprint TEXT NOT NULL, -- Hash of input data for caching
  actionable_recommendations JSONB DEFAULT '[]', -- Array of specific action items
  related_kpis TEXT[] DEFAULT '{}', -- Array of KPIs this insight relates to
  priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  is_user_requested BOOLEAN DEFAULT false, -- Whether insight was specifically requested by user
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY "Users can view insights for their organization" 
ON public.ai_insights 
FOR SELECT 
USING (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can insert insights for their organization" 
ON public.ai_insights 
FOR INSERT 
WITH CHECK (organization_id = get_current_user_organization_id());

CREATE POLICY "Users can update insights for their organization" 
ON public.ai_insights 
FOR UPDATE 
USING (organization_id = get_current_user_organization_id());

-- Create indexes for performance
CREATE INDEX idx_ai_insights_org_id ON public.ai_insights(organization_id);
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_type ON public.ai_insights(insight_type);
CREATE INDEX idx_ai_insights_fingerprint ON public.ai_insights(data_fingerprint);
CREATE INDEX idx_ai_insights_expires ON public.ai_insights(expires_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_insights_updated_at
BEFORE UPDATE ON public.ai_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up expired insights
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.ai_insights WHERE expires_at < NOW();
END;
$$;