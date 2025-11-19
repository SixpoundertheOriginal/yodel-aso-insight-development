## DB & RLS Integrity Report

Tables (expected)
- `organizations(id, slug, settings jsonb)`
  - `settings.demo_mode` used for demo detection (server-truth)
- `organization_features(organization_id, feature_key text, is_enabled boolean)`
  - Feature flags like `aso_audit_demo`
- `profiles(id, organization_id)`
- `user_roles(user_id, organization_id, role)`

RLS Policies (patterns)
- For all org-scoped tables (including `organization_features`):
  - Enable RLS
  - Policy: `organization_id = auth.jwt() ->> 'organization_id'` or equivalent via secure RPCs
  - Super admin bypass via `is_super_admin(auth.uid())`

Example SQL (sketch)
```
-- Ensure features table exists
-- create table organization_features (
--   organization_id uuid references organizations(id) on delete cascade,
--   feature_key text not null,
--   is_enabled boolean not null default false,
--   primary key (organization_id, feature_key)
--);

alter table organization_features enable row level security;

create policy org_features_read on organization_features
for select using (
  exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = organization_features.organization_id
  ) or (select is_super_admin(auth.uid()))
);

create policy org_features_admin on organization_features
for insert with check (
  exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = organization_features.organization_id
      and ur.role in ('ORG_ADMIN','SUPER_ADMIN')
  ) or (select is_super_admin(auth.uid()))
);

create policy org_features_update on organization_features
for update using (
  exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = organization_features.organization_id
      and ur.role in ('ORG_ADMIN','SUPER_ADMIN')
  ) or (select is_super_admin(auth.uid()))
);
```

Seeds
```
-- Mark Next org as demo and enable aso_audit_demo
update organizations set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('demo_mode', true)
where lower(slug) = 'next';

insert into organization_features (organization_id, feature_key, is_enabled)
select id, 'aso_audit_demo', true from organizations where lower(slug) = 'next'
on conflict (organization_id, feature_key) do update set is_enabled = EXCLUDED.is_enabled;
```

