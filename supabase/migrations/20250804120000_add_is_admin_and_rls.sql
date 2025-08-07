-- Add is_admin helper function and update RLS policies for admin access

-- 1. Helper function to determine if a user is an admin
create or replace function is_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$ language sql security definer;

-- 2. RLS policy updates for chatgpt_audit_runs
alter table chatgpt_audit_runs enable row level security;

drop policy if exists "Users can manage audit runs for their organization" on chatgpt_audit_runs;

create policy "Org members can manage audit runs"
  on chatgpt_audit_runs
  for all
  using (
    organization_id = get_current_user_organization_id()
  )
  with check (
    organization_id = get_current_user_organization_id()
  );

create policy "Admins or Org Members can read audit runs"
  on chatgpt_audit_runs
  for select
  using (
    organization_id = get_current_user_organization_id()
    or is_admin(auth.uid())
  );

-- 3. RLS policy updates for chatgpt_queries
alter table chatgpt_queries enable row level security;

drop policy if exists "Users can manage queries for their organization" on chatgpt_queries;

create policy "Org members can manage queries"
  on chatgpt_queries
  for all
  using (
    organization_id = get_current_user_organization_id()
  )
  with check (
    organization_id = get_current_user_organization_id()
  );

create policy "Admins or Org Members can read queries"
  on chatgpt_queries
  for select
  using (
    organization_id = get_current_user_organization_id()
    or is_admin(auth.uid())
  );
