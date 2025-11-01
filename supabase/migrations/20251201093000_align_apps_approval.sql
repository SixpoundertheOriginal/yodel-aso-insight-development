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
    RAISE NOTICE 'Created local stub for public.apps (align_apps_approval fallback)';
  END IF;
END $$;

-- Align apps approval metadata and RPC contract
alter table public.apps
  add column if not exists approved_at timestamptz default now();

-- Backfill existing rows to ensure approved_at is populated
update public.apps
set approved_at = coalesce(approved_at, created_at, now());

-- Ensure created_at retains default now() for new inserts
alter table public.apps
  alter column created_at set default now();

-- Ensure updated_at tracks modifications
alter table public.apps
  alter column updated_at set default now();

-- Replace legacy approval RPC to operate on public.apps
drop function if exists public.update_app_approval_status(uuid, text);

create or replace function public.update_app_approval_status(
  p_app_id uuid,
  p_status text
)
returns public.apps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(coalesce(p_status, ''));
  v_app public.apps;
begin
  if p_app_id is null then
    raise exception 'APP_ID_REQUIRED';
  end if;

  if v_status not in ('approved', 'rejected') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.apps
  set
    is_active = (v_status = 'approved'),
    approved_at = case
      when v_status = 'approved' then coalesce(approved_at, now())
      else null
    end,
    updated_at = now()
  where id = p_app_id
  returning * into v_app;

  if not found then
    raise exception 'APP_NOT_FOUND';
  end if;

  return v_app;
end;
$$;

revoke execute on function public.update_app_approval_status(uuid, text) from anon;
grant execute on function public.update_app_approval_status(uuid, text) to authenticated;
grant execute on function public.update_app_approval_status(uuid, text) to service_role;
