SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles::text,
  cmd::text,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'org_feature_entitlements'
ORDER BY policyname;
