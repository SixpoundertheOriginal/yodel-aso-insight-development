-- Add missing analysis_type column to chatgpt_query_results table
-- This column is required by the chatgpt-topic-analysis Edge Function
ALTER TABLE public.chatgpt_query_results 
ADD COLUMN analysis_type VARCHAR(50) DEFAULT 'topic';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chatgpt_query_results_analysis_type 
ON public.chatgpt_query_results(analysis_type);

-- Update any existing records to have the topic analysis type
UPDATE public.chatgpt_query_results 
SET analysis_type = 'topic' 
WHERE analysis_type IS NULL;