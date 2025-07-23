-- Add long_description field to metadata_versions table
ALTER TABLE public.metadata_versions 
ADD COLUMN long_description TEXT;

-- Update the notes field to include long description generation tracking
COMMENT ON COLUMN public.metadata_versions.long_description IS 'AI-generated long description optimized for App Store algorithm changes';