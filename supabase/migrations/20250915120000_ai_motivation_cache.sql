-- Cache table for AI-generated motivational messages
CREATE TABLE public.ai_motivation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('week','month')),
  period_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure one entry per user, period and locale
CREATE UNIQUE INDEX ai_motivation_cache_unique
  ON public.ai_motivation_cache(user_id, period_type, period_id, locale);

-- Enable RLS
ALTER TABLE public.ai_motivation_cache ENABLE ROW LEVEL SECURITY;

-- Users can view their own cached motivation
CREATE POLICY "Users can read own motivation cache"
  ON public.ai_motivation_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own cached motivation
CREATE POLICY "Users can insert own motivation cache"
  ON public.ai_motivation_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cached motivation
CREATE POLICY "Users can update own motivation cache"
  ON public.ai_motivation_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role read access
CREATE POLICY "Service role can read motivation cache"
  ON public.ai_motivation_cache FOR SELECT
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.ai_motivation_cache IS 'Caches OpenAI generated motivational messages for workout summaries.';
