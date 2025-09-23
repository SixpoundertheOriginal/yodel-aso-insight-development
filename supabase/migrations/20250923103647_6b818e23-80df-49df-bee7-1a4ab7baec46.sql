-- Fix pattern_analyses RLS policy to handle super admin bypass and NULL auth contexts
DROP POLICY IF EXISTS "Users can manage pattern analyses for their organization" ON public.pattern_analyses;

CREATE POLICY "Users can manage pattern analyses with auth fallback"
  ON public.pattern_analyses
  FOR ALL 
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR 
    (
      auth.uid() IS NOT NULL AND 
      organization_id = get_current_user_organization_id()
    ) OR
    (
      auth.uid() IS NOT NULL AND 
      organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR 
    (
      auth.uid() IS NOT NULL AND 
      organization_id = get_current_user_organization_id()
    ) OR
    (
      auth.uid() IS NOT NULL AND 
      organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );