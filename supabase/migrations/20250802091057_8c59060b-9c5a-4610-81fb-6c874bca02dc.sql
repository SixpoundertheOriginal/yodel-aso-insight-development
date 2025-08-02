-- Add RLS policies for chatgpt_queries table
CREATE POLICY "Users can manage queries for their organization" 
ON public.chatgpt_queries 
FOR ALL 
TO authenticated 
USING (organization_id = get_current_user_organization_id())
WITH CHECK (organization_id = get_current_user_organization_id());