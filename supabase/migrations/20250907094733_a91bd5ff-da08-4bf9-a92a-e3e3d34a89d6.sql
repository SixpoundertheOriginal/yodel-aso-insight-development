-- Add missing role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ASO_MANAGER';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'CLIENT';

-- Update existing values to match frontend conventions (if needed)
-- Note: PostgreSQL doesn't allow renaming enum values directly, 
-- but the frontend will map to existing values where possible