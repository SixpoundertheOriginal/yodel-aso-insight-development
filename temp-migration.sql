-- Manual migration to add deleted_at column
-- You can execute this in Supabase Studio SQL Editor or via psql

-- Add deleted_at column to organizations table for soft delete functionality
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for better performance when filtering non-deleted records  
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations (deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN organizations.deleted_at IS 'Timestamp when the organization was soft deleted. NULL means active.';