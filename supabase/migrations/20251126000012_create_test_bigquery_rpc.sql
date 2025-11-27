-- Temporary diagnostic RPC to test BigQuery connectivity
-- This will be removed after testing

CREATE OR REPLACE FUNCTION test_bigquery_connection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This is just a diagnostic function
  -- The actual BigQuery query happens in the edge function
  -- This RPC will return info about what should be queried

  SELECT jsonb_build_object(
    'message', 'BigQuery credentials are in edge function secrets',
    'hint', 'Use supabase functions invoke to test BigQuery',
    'test_app_ids', (
      SELECT jsonb_agg(DISTINCT app_id)
      FROM org_app_access
      WHERE organization_id IN (
        SELECT client_org_id FROM agency_clients
        WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
          AND is_active = true
        UNION ALL
        SELECT '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
      )
      AND detached_at IS NULL
      LIMIT 10
    ),
    'app_count', (
      SELECT COUNT(DISTINCT app_id)
      FROM org_app_access
      WHERE organization_id IN (
        SELECT client_org_id FROM agency_clients
        WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
          AND is_active = true
        UNION ALL
        SELECT '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
      )
      AND detached_at IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to service role only (for testing)
GRANT EXECUTE ON FUNCTION test_bigquery_connection() TO service_role;

COMMENT ON FUNCTION test_bigquery_connection IS
  'Diagnostic function to verify app IDs that should be queried in BigQuery.
   This does not actually query BigQuery - that happens in the edge function.
   To test BigQuery: use the edge function directly with proper auth.';
