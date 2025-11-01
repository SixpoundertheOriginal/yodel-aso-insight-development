insert into public.user_roles (user_id, organization_id, role)
values ('48977685-7795-49fa-953e-579d6a6739cb', 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f', 'ORGANIZATION_ADMIN')
on conflict (user_id, organization_id) do nothing;
