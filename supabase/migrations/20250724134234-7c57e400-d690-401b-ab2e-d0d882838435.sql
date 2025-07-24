-- Phase 1: Database Schema Extensions for Topic Analysis Mode
-- Add support for topic-based audits while maintaining backward compatibility

-- Add new columns to existing chatgpt_audit_runs table
ALTER TABLE chatgpt_audit_runs 
ADD COLUMN IF NOT EXISTS audit_type VARCHAR(20) DEFAULT 'app';

ALTER TABLE chatgpt_audit_runs 
ADD COLUMN IF NOT EXISTS topic_data JSONB;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_audit_runs_audit_type ON chatgpt_audit_runs(audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_runs_topic_data ON chatgpt_audit_runs USING GIN (topic_data);

-- Add comment to document the schema change
COMMENT ON COLUMN chatgpt_audit_runs.audit_type IS 'Type of audit: app (existing) or topic (new)';
COMMENT ON COLUMN chatgpt_audit_runs.topic_data IS 'JSONB data for topic analysis: {topic, industry, target_audience, known_players, refined_topic, analysis_confidence}';

-- Ensure RLS policies still work with new columns
-- The existing RLS policies will automatically apply to the new columns