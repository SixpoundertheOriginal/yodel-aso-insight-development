DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'organizations'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT
    );
    RAISE NOTICE 'Created local stub for public.organizations (client_org_map fallback)';
  END IF;

  BEGIN
    INSERT INTO public.organizations (id, name)
    VALUES ('dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', 'YodelMobile')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Skipped seed insert for public.organizations (client_org_map): %', SQLERRM;
  END;
END $$;

create table if not exists public.client_org_map (
  client text primary key,
  organization_id uuid references public.organizations(id) on delete cascade
);

insert into public.client_org_map (client, organization_id) values
  ('Client_One', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'),
  ('Client_Two', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'),
  ('Client_Three', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'),
  ('Client_Four', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'),
  ('Client_Five', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'),
  ('Client_Six', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'),
  ('Client_Seven', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f')
on conflict (client) do update
set organization_id = excluded.organization_id;
