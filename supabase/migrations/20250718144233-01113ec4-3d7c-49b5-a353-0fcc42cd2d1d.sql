
-- Add rich intelligence data columns to apps table
ALTER TABLE public.apps 
ADD COLUMN IF NOT EXISTS app_description TEXT,
ADD COLUMN IF NOT EXISTS app_store_category VARCHAR(255),
ADD COLUMN IF NOT EXISTS app_rating NUMERIC(2,1),
ADD COLUMN IF NOT EXISTS app_reviews INTEGER,
ADD COLUMN IF NOT EXISTS app_subtitle TEXT,
ADD COLUMN IF NOT EXISTS intelligence_metadata JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apps_intelligence_metadata ON public.apps USING gin(intelligence_metadata);
CREATE INDEX IF NOT EXISTS idx_apps_app_store_category ON public.apps(app_store_category);
CREATE INDEX IF NOT EXISTS idx_apps_app_rating ON public.apps(app_rating);

-- Add comment explaining the new columns
COMMENT ON COLUMN public.apps.app_description IS 'Rich app description from app store for intelligence analysis';
COMMENT ON COLUMN public.apps.app_store_category IS 'Original category from app store (before intelligence mapping)';
COMMENT ON COLUMN public.apps.app_rating IS 'App store rating for intelligence context';
COMMENT ON COLUMN public.apps.app_reviews IS 'Number of reviews for intelligence context';
COMMENT ON COLUMN public.apps.app_subtitle IS 'App subtitle/tagline from app store';
COMMENT ON COLUMN public.apps.intelligence_metadata IS 'Metadata about intelligence analysis including confidence scores';
