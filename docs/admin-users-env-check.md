# Admin Users Function Troubleshooting

To verify the environment configuration for the `admin-users` Edge Function, call it with an `env_check` action. The function responds with the presence of required Supabase environment variables.

```sh
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"env_check"}' \
  https://<project-ref>.functions.supabase.co/admin-users
```

Example response:

```json
{
  "has_service_key": true,
  "has_anon_key": true,
  "supabase_url": "https://your-project.supabase.co"
}
```

Use this to troubleshoot missing or misconfigured environment variables before invoking other actions.
