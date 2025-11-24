-- Migration: Fix competitor triggers to remove updated_at column references
-- Purpose: The app_competitors table doesn't have an updated_at column
-- Date: 2026-01-26

-- =====================================================================
-- FIX TRIGGER FUNCTIONS
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
