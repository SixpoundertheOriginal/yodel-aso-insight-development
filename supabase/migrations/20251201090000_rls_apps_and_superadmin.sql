-- Helper function (no-arg) for super-admin checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'apps'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.apps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      app_name TEXT,
      bundle_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );
    RAISE NOTICE 'Created local stub for public.apps (with created_at/approved_at fields)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.user_roles (
      user_id UUID,
      organization_id UUID,
      role TEXT
    );
    RAISE NOTICE 'Created local stub for public.user_roles';
  END IF;
END $$;


create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce( (auth.jwt() ->> 'is_superadmin')::boolean, false );
$$;

-- RLS policy for public.apps (membership OR super-admin)
drop policy if exists org_access_apps on public.apps;
create policy org_access_apps
on public.apps
as permissive
for all
to authenticated
using (
  (organization_id in (select organization_id from public.user_roles where user_id = auth.uid()))
  or public.is_super_admin()
)
with check (
  (organization_id in (select organization_id from public.user_roles where user_id = auth.uid()))
  or public.is_super_admin()
);

-- Grants (RLS still applies)
grant usage on schema public to authenticated;
grant select, insert, update on public.apps to authenticated;
