-- Apply the temp migration for soft delete
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for better performance when filtering non-deleted records  
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations (deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.deleted_at IS 'Timestamp when the organization was soft deleted. NULL means active.';