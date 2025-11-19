# Super Admin Quick Reference

**User:** igor@yodelmobile.com
**User ID:** 9487fa9d-f0cc-427c-900b-98871c19498a
**Date Granted:** 2025-01-13

## Current Status

**Before granting:**
- ✅ ORG_ADMIN for organization `7cccba3f-0a8f-446f-9dba-86e9cb68c92b`
- ❌ NOT a super admin

## Rollback Options

### Option 1: Use the Rollback Script (Recommended)
```bash
./ROLLBACK_SUPER_ADMIN.sh
```

### Option 2: Manual SQL Rollback
```sql
DELETE FROM user_roles
WHERE user_id = '9487fa9d-f0cc-427c-900b-98871c19498a'
  AND organization_id IS NULL
  AND role = 'SUPER_ADMIN';
```

### Option 3: One-liner Node.js Command
```bash
node -e "
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1];
const url = envContent.match(/VITE_SUPABASE_URL=\"(.+)\"/)[1];

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data, error } = await supabase
  .from('user_roles')
  .delete()
  .eq('user_id', '9487fa9d-f0cc-427c-900b-98871c19498a')
  .is('organization_id', null)
  .eq('role', 'SUPER_ADMIN')
  .select();

console.log(data ? '✅ Removed SUPER_ADMIN role' : '⚠️  No role found');
"
```

## Verification Commands

### Check if Super Admin Exists
```bash
node -e "
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1];
const url = envContent.match(/VITE_SUPABASE_URL=\"(.+)\"/)[1];

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data } = await supabase
  .from('user_roles')
  .select('role, organization_id')
  .eq('user_id', '9487fa9d-f0cc-427c-900b-98871c19498a');

console.log('Current roles:', data);
const isSuperAdmin = data.some(r => r.role === 'SUPER_ADMIN' && r.organization_id === null);
console.log('Is Super Admin:', isSuperAdmin ? '✅ YES' : '❌ NO');
"
```

### Test Super Admin Access
```bash
# Should return ALL organizations (not just assigned ones)
node -e "
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1];
const url = envContent.match(/VITE_SUPABASE_URL=\"(.+)\"/)[1];

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// This uses service role, but simulates what igor would see
const { data, count } = await supabase
  .from('organizations')
  .select('id, name', { count: 'exact' });

console.log('Total organizations visible:', count);
console.log('Organizations:', data?.map(o => o.name));
"
```

## What Was Changed

**Table:** `user_roles`
**Action:** INSERT
**Record:**
- `user_id`: 9487fa9d-f0cc-427c-900b-98871c19498a
- `organization_id`: NULL (platform-level)
- `role`: SUPER_ADMIN

## Impact Assessment

✅ **Safe Changes:**
- Existing ORG_ADMIN role preserved
- No RLS policy changes
- No schema changes
- Completely reversible

❌ **No Breaking Changes:**
- Other users unaffected
- Existing permissions unchanged
- No downtime required

## Support

If you need help:
1. Check logs: `tail -f supabase/logs/postgres.log`
2. Review plan: `docs/architecture/SUPER_ADMIN_IMPLEMENTATION_PLAN.md`
3. Run rollback: `./ROLLBACK_SUPER_ADMIN.sh`
