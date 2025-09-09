-- Fix demo organization settings for proper demo data detection
UPDATE public.organizations 
SET settings = jsonb_build_object('demo_mode', true)
WHERE slug = 'next';

-- Verify the update
SELECT id, name, slug, settings 
FROM public.organizations 
WHERE slug = 'next';