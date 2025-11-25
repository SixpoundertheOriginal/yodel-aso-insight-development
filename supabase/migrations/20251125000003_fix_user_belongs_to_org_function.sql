/**
 * Fix user_belongs_to_organization Function Ambiguity
 *
 * Issue: The function parameter "org_id" creates ambiguity when called
 * from RLS policies during INSERT/UPDATE operations. PostgreSQL cannot
 * determine if "org_id" refers to the function parameter or a table column.
 *
 * Solution: Use a local variable inside the function to avoid ambiguity,
 * and fully qualify all column references.
 */

-- Recreate the function with unambiguous internal logic
CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID := org_id;  -- Local variable to avoid ambiguity
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.organization_id = v_org_id
      AND ur.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (idempotent)
GRANT EXECUTE ON FUNCTION user_belongs_to_organization(UUID) TO authenticated;

COMMENT ON FUNCTION user_belongs_to_organization(UUID) IS
  'Checks if the current user belongs to the specified organization. Uses local variable to avoid ambiguity in RLS policy evaluation.';
