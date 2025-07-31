-- Add entity_analysis column to store enhanced entity detection results
ALTER TABLE public.chatgpt_query_results 
ADD COLUMN entity_analysis JSONB DEFAULT NULL;

-- Add index for better performance when querying entity analysis
CREATE INDEX idx_chatgpt_query_results_entity_analysis 
ON public.chatgpt_query_results 
USING GIN (entity_analysis);