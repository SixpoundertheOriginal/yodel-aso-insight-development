-- 🔐 Secure view access: organization_app_usage & chatgpt_visibility_scores_unified
-- Prevents direct queries from anon/authenticated users
-- Restricts access to Edge Functions (service_role) only

-- 1️⃣ organization_app_usage
alter view if exists public.organization_app_usage set (security_invoker = on);
revoke all on public.organization_app_usage from public;
revoke select on public.organization_app_usage from anon, authenticated;
grant select on public.organization_app_usage to service_role;

-- 2️⃣ chatgpt_visibility_scores_unified
alter view if exists public.chatgpt_visibility_scores_unified set (security_invoker = on);
revoke all on public.chatgpt_visibility_scores_unified from public;
revoke select on public.chatgpt_visibility_scores_unified from anon, authenticated;
grant select on public.chatgpt_visibility_scores_unified to service_role;