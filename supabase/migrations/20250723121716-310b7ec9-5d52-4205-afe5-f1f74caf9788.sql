-- Add new columns for enhanced analysis
ALTER TABLE chatgpt_query_results 
ADD COLUMN IF NOT EXISTS recommendation_strength DECIMAL(3,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS mention_excerpts JSONB DEFAULT '[]'::jsonb;