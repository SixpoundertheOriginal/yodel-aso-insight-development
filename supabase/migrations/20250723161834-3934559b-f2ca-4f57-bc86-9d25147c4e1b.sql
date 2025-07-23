-- Fix security issue with cleanup function by setting search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.ai_insights WHERE expires_at < NOW();
END;
$$;