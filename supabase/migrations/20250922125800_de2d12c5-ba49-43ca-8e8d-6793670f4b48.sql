-- SECURITY FIXES - Phase 2C: Complete function security fixes

-- Fix remaining functions with search_path issues
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_insights()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.ai_insights WHERE expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.data_cache WHERE expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Reset daily limits if date changed
  IF NEW.last_daily_reset < CURRENT_DATE THEN
    NEW.daily_ai_calls = 0;
    NEW.daily_metadata_generations = 0;
    NEW.last_daily_reset = CURRENT_DATE;
  END IF;
  
  -- Reset hourly limits if hour changed
  IF NEW.last_hourly_reset < DATE_TRUNC('hour', NOW()) THEN
    NEW.hourly_ai_calls = 0;
    NEW.last_hourly_reset = DATE_TRUNC('hour', NOW());
  END IF;
  
  -- Reset monthly limits if month changed
  IF NEW.last_monthly_reset < DATE_TRUNC('month', NOW())::DATE THEN
    NEW.monthly_ai_calls = 0;
    NEW.last_monthly_reset = DATE_TRUNC('month', NOW())::DATE;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_user_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, organization_id, user_tier)
  VALUES (
    NEW.id, 
    NEW.organization_id, 
    CASE 
      WHEN NEW.role = 'SUPER_ADMIN' THEN 'enterprise'
      WHEN NEW.role = 'ORGANIZATION_ADMIN' THEN 'pro'
      ELSE 'free'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_keyword_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Keep only last 30 days of metrics data
  DELETE FROM public.keyword_service_metrics 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  
  -- Keep only last 90 days of ranking history
  DELETE FROM public.keyword_ranking_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_keyword_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Remove expired difficulty scores
  DELETE FROM public.keyword_difficulty_scores 
  WHERE expires_at < now();
  
  -- Keep only last 90 days of volume history
  DELETE FROM public.keyword_volume_history 
  WHERE recorded_date < CURRENT_DATE - INTERVAL '90 days';
  
  -- Keep only last 30 days of competitor analysis
  DELETE FROM public.competitor_keywords 
  WHERE analyzed_at < now() - INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_platform_admin_creation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  locked BOOLEAN;
BEGIN
  -- Use a global lock key for platform admin setup; change the int for a different context.
  PERFORM pg_advisory_lock(998823442); 
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_platform_admin_creation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM pg_advisory_unlock(998823442); 
END;
$$;