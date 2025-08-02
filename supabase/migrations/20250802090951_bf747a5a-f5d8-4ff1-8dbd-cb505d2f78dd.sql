-- Add missing processed_at column to chatgpt_queries table
ALTER TABLE public.chatgpt_queries 
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance on processed_at queries
CREATE INDEX idx_chatgpt_queries_processed_at ON public.chatgpt_queries(processed_at);

-- Add updated_at column if it doesn't exist for better tracking
ALTER TABLE public.chatgpt_queries 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_chatgpt_queries_updated_at
    BEFORE UPDATE ON public.chatgpt_queries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();