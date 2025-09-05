-- Add domain column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Update existing organizations with placeholder domains based on their slugs
UPDATE public.organizations 
SET domain = COALESCE(slug || '.com', 'example.com') 
WHERE domain IS NULL;