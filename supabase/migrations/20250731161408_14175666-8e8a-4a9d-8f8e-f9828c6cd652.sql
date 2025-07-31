-- Add ranking tracking enhancements to existing tables
ALTER TABLE chatgpt_query_results 
  ADD COLUMN IF NOT EXISTS ranking_context JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_entities_in_response INTEGER DEFAULT NULL;

-- Create new table for detailed ranking snapshots
CREATE TABLE IF NOT EXISTS chatgpt_ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  audit_run_id UUID NOT NULL,
  query_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  position INTEGER,
  total_positions INTEGER,
  ranking_type TEXT, -- 'numbered_list', 'top_mentions', 'competitive_comparison'
  ranking_context TEXT, -- Full text context where ranking appears
  competitors JSONB DEFAULT '[]'::JSONB, -- Other entities in the ranking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new table
ALTER TABLE chatgpt_ranking_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ranking snapshots
CREATE POLICY "Users can manage ranking snapshots for their organization" 
ON chatgpt_ranking_snapshots
FOR ALL 
TO authenticated
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_audit_run ON chatgpt_ranking_snapshots(audit_run_id);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_position ON chatgpt_ranking_snapshots(position);
CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_org_entity ON chatgpt_ranking_snapshots(organization_id, entity_name);

-- Add foreign key constraints
ALTER TABLE chatgpt_ranking_snapshots 
  ADD CONSTRAINT fk_ranking_audit_run 
  FOREIGN KEY (audit_run_id) 
  REFERENCES chatgpt_audit_runs(id) 
  ON DELETE CASCADE;

ALTER TABLE chatgpt_ranking_snapshots 
  ADD CONSTRAINT fk_ranking_query 
  FOREIGN KEY (query_id) 
  REFERENCES chatgpt_queries(id) 
  ON DELETE CASCADE;