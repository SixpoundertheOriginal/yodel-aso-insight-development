-- Migration: Update app_competitors table for audit tracking
-- Purpose: Add audit tracking columns to app_competitors table
-- Date: 2025-01-25

-- =====================================================================
-- UPDATE: app_competitors table
-- =====================================================================
-- Add columns to track audit history and metadata changes
-- =====================================================================

-- Add audit tracking columns
ALTER TABLE app_competitors
ADD COLUMN IF NOT EXISTS last_audit_id UUID REFERENCES competitor_audit_snapshots(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_audit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_audit_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS audit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata_changed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_audit_stale BOOLEAN DEFAULT TRUE;

-- Add audit status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competitor_audit_status') THEN
    CREATE TYPE competitor_audit_status AS ENUM ('never_audited', 'pending', 'completed', 'failed', 'stale');
  END IF;
END
$$;

ALTER TABLE app_competitors
ADD COLUMN IF NOT EXISTS audit_status competitor_audit_status DEFAULT 'never_audited';

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Find competitors needing audit refresh
CREATE INDEX IF NOT EXISTS idx_app_competitors_stale_audits
  ON app_competitors(target_app_id, is_audit_stale)
  WHERE is_audit_stale = TRUE;

-- Find competitors by audit status
CREATE INDEX IF NOT EXISTS idx_app_competitors_audit_status
  ON app_competitors(target_app_id, audit_status);

-- Quick lookup for latest audit
CREATE INDEX IF NOT EXISTS idx_app_competitors_last_audit
  ON app_competitors(last_audit_id)
  WHERE last_audit_id IS NOT NULL;

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function: Update competitor audit metadata when new audit completes
CREATE OR REPLACE FUNCTION update_competitor_audit_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process completed audits
  IF NEW.status = 'completed' THEN
    UPDATE app_competitors
    SET
      last_audit_id = NEW.id,
      last_audit_at = NEW.created_at,
      last_audit_score = NEW.overall_score,
      audit_count = COALESCE(audit_count, 0) + 1,
      is_audit_stale = FALSE,
      audit_status = 'completed'
    WHERE id = NEW.competitor_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE app_competitors
    SET
      audit_status = 'failed'
    WHERE id = NEW.competitor_id;
  ELSIF NEW.status = 'processing' THEN
    UPDATE app_competitors
    SET
      audit_status = 'pending'
    WHERE id = NEW.competitor_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Update competitor metadata on audit completion
CREATE TRIGGER trigger_update_competitor_audit_metadata
  AFTER INSERT OR UPDATE OF status ON competitor_audit_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_audit_metadata();

-- Function: Detect metadata changes between audits
CREATE OR REPLACE FUNCTION detect_competitor_metadata_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_audit competitor_audit_snapshots;
  v_metadata_changed BOOLEAN := FALSE;
BEGIN
  -- Only check for completed audits
  IF NEW.status = 'completed' THEN
    -- Get previous audit for this competitor
    SELECT *
    INTO v_previous_audit
    FROM competitor_audit_snapshots
    WHERE competitor_id = NEW.competitor_id
      AND status = 'completed'
      AND id != NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Check if metadata changed
    IF v_previous_audit.id IS NOT NULL THEN
      v_metadata_changed := (
        COALESCE(v_previous_audit.metadata->>'title', '') != COALESCE(NEW.metadata->>'title', '')
        OR COALESCE(v_previous_audit.metadata->>'subtitle', '') != COALESCE(NEW.metadata->>'subtitle', '')
        OR COALESCE(v_previous_audit.metadata->>'description', '') != COALESCE(NEW.metadata->>'description', '')
        OR COALESCE(v_previous_audit.metadata->>'keywords', '') != COALESCE(NEW.metadata->>'keywords', '')
      );

      -- If metadata changed, increment counter
      IF v_metadata_changed THEN
        UPDATE app_competitors
        SET metadata_changed_count = COALESCE(metadata_changed_count, 0) + 1
        WHERE id = NEW.competitor_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: Detect metadata changes
CREATE TRIGGER trigger_detect_competitor_metadata_changes
  AFTER INSERT ON competitor_audit_snapshots
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION detect_competitor_metadata_changes();

-- Function: Mark competitor audits as stale after 24 hours
CREATE OR REPLACE FUNCTION mark_competitor_audits_stale()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected_rows INTEGER;
BEGIN
  UPDATE app_competitors
  SET
    is_audit_stale = TRUE,
    audit_status = 'stale'
  WHERE
    last_audit_at < NOW() - INTERVAL '24 hours'
    AND is_audit_stale = FALSE
    AND audit_status = 'completed';

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

-- Function: Get competitors needing audit refresh
CREATE OR REPLACE FUNCTION get_competitors_needing_audit(
  p_target_app_id UUID,
  p_max_age_hours INTEGER DEFAULT 24
)
RETURNS SETOF app_competitors
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM app_competitors
  WHERE target_app_id = p_target_app_id
    AND (
      -- Never audited
      audit_status = 'never_audited'
      -- Or stale
      OR is_audit_stale = TRUE
      -- Or audit older than threshold
      OR last_audit_at < NOW() - (p_max_age_hours || ' hours')::INTERVAL
    )
    AND is_active = TRUE
  ORDER BY
    CASE audit_status
      WHEN 'never_audited' THEN 1
      WHEN 'stale' THEN 2
      WHEN 'failed' THEN 3
      ELSE 4
    END,
    last_audit_at ASC NULLS FIRST;
$$;

-- Function: Get competitor audit summary
CREATE OR REPLACE FUNCTION get_competitor_audit_summary(p_target_app_id UUID)
RETURNS TABLE (
  total_competitors INTEGER,
  audited_competitors INTEGER,
  stale_audits INTEGER,
  never_audited INTEGER,
  failed_audits INTEGER,
  avg_score NUMERIC,
  last_audit_time TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)::INTEGER AS total_competitors,
    COUNT(last_audit_id)::INTEGER AS audited_competitors,
    COUNT(*) FILTER (WHERE is_audit_stale = TRUE)::INTEGER AS stale_audits,
    COUNT(*) FILTER (WHERE audit_status = 'never_audited')::INTEGER AS never_audited,
    COUNT(*) FILTER (WHERE audit_status = 'failed')::INTEGER AS failed_audits,
    AVG(last_audit_score) AS avg_score,
    MAX(last_audit_at) AS last_audit_time
  FROM app_competitors
  WHERE target_app_id = p_target_app_id
    AND is_active = TRUE;
$$;

-- =====================================================================
-- SCHEDULED TASKS (Optional - requires pg_cron extension)
-- =====================================================================
-- Uncomment if pg_cron is available:
--
-- Schedule daily stale audit marking (3 AM)
-- SELECT cron.schedule(
--   'mark-competitor-audits-stale',
--   '0 3 * * *',
--   $$SELECT mark_competitor_audits_stale();$$
-- );

-- =====================================================================
-- BACKFILL DATA
-- =====================================================================
-- Set audit_status for existing competitors based on audit history
UPDATE app_competitors ac
SET
  audit_status = CASE
    WHEN EXISTS (
      SELECT 1 FROM competitor_audit_snapshots cas
      WHERE cas.competitor_id = ac.id
        AND cas.status = 'completed'
    ) THEN 'completed'::competitor_audit_status
    ELSE 'never_audited'::competitor_audit_status
  END,
  is_audit_stale = CASE
    WHEN EXISTS (
      SELECT 1 FROM competitor_audit_snapshots cas
      WHERE cas.competitor_id = ac.id
        AND cas.status = 'completed'
        AND cas.created_at > NOW() - INTERVAL '24 hours'
    ) THEN FALSE
    ELSE TRUE
  END
WHERE audit_status IS NULL;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON COLUMN app_competitors.last_audit_id IS 'Reference to most recent completed audit snapshot';
COMMENT ON COLUMN app_competitors.last_audit_at IS 'Timestamp of most recent completed audit';
COMMENT ON COLUMN app_competitors.last_audit_score IS 'Overall score from most recent audit (for quick sorting)';
COMMENT ON COLUMN app_competitors.audit_count IS 'Total number of audits performed on this competitor';
COMMENT ON COLUMN app_competitors.metadata_changed_count IS 'Number of times competitor metadata changed between audits';
COMMENT ON COLUMN app_competitors.is_audit_stale IS 'TRUE if audit is older than 24 hours or needs refresh';
COMMENT ON COLUMN app_competitors.audit_status IS 'Current audit status: never_audited, pending, completed, failed, or stale';

COMMENT ON FUNCTION update_competitor_audit_metadata IS 'Updates competitor record when new audit completes';
COMMENT ON FUNCTION detect_competitor_metadata_changes IS 'Compares consecutive audits to detect metadata changes';
COMMENT ON FUNCTION mark_competitor_audits_stale IS 'Marks audits older than 24 hours as stale (run periodically)';
COMMENT ON FUNCTION get_competitors_needing_audit IS 'Returns competitors that need audit refresh, prioritized by urgency';
COMMENT ON FUNCTION get_competitor_audit_summary IS 'Returns aggregate statistics about competitor audits for a target app';
