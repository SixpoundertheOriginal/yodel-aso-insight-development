-- Create RPC function to check RLS policies on a table
-- This allows us to query pg_policies from the client

CREATE OR REPLACE FUNCTION check_rls_policies(table_name text)
RETURNS TABLE (
  policy_name text,
  command_type text,
  using_expression text,
  with_check_expression text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    policyname::text as policy_name,
    cmd::text as command_type,
    COALESCE(qual::text, 'NULL') as using_expression,
    COALESCE(with_check::text, 'NULL') as with_check_expression
  FROM pg_policies
  WHERE tablename = table_name
    AND schemaname = 'public'
  ORDER BY policyname;
END;
$$;

-- Grant execute permission to authenticated and service role
GRANT EXECUTE ON FUNCTION check_rls_policies(text) TO authenticated, service_role;

COMMENT ON FUNCTION check_rls_policies IS
  'Diagnostic function to check RLS policies on a table.
   Usage: SELECT * FROM check_rls_policies(''agency_clients'')';
