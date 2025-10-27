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
