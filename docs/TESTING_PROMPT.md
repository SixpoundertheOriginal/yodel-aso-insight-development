# Admin JSON API Integration - Testing Prompt

## Quick Smoke Tests

### 1. Manual cURL/Postman Tests

```bash
# Start dev server
npm run dev

# Get your auth tokens (replace with actual tokens)
SUPER_ADMIN_TOKEN="your-super-admin-jwt-here"
ORG_ADMIN_TOKEN="your-org-admin-jwt-here"

# Test whoami endpoint
curl -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" http://localhost:8080/api/whoami

# Test organizations (SUPER_ADMIN should see all)
curl -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" http://localhost:8080/api/admin/organizations

# Test organizations (ORG_ADMIN should see only their org)
curl -H "Authorization: Bearer $ORG_ADMIN_TOKEN" http://localhost:8080/api/admin/organizations

# Test users endpoint
curl -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" http://localhost:8080/api/admin/users

# Test cross-org access (should return 403)
curl -X POST -H "Authorization: Bearer $ORG_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Unauthorized Org","slug":"unauth-org"}' \
  http://localhost:8080/api/admin/organizations
```

### 2. Automated Smoke Tests

```bash
# Run comprehensive smoke tests
./scripts/admin-smoke-tests.sh $SUPER_ADMIN_TOKEN $ORG_ADMIN_TOKEN

# Check results
ls -la docs/admin-smoke/
```

### 3. UI Testing

1. **Login as SUPER_ADMIN**:
   - Navigate to `/admin`
   - Verify organizations page shows all orgs
   - Verify users table shows roles correctly (Igor = super_admin)
   - Test invite flow - should work
   - Switch org context if multi-org - data should refresh

2. **Login as ORG_ADMIN**:
   - Navigate to `/admin` 
   - Verify organizations page shows only own org
   - Verify users page shows only org users
   - Try to invite - should only see own org in dropdown
   - Attempt cross-org operations - should fail with 403

### 4. Playwright E2E Tests

```bash
# Install Playwright (if not already installed)
npx playwright install

# Run E2E tests
npx playwright test tests/admin-e2e.spec.ts

# View test results
npx playwright show-report
```

## Expected Results

### ✅ Success Criteria

1. **Authentication & Authorization**:
   - Invalid tokens return 401
   - Valid tokens return appropriate data based on role
   - Cross-org operations return 403 for ORG_ADMIN

2. **Data Scoping**:
   - SUPER_ADMIN sees all organizations and users
   - ORG_ADMIN sees only their organization's data
   - User roles display correctly in UI (Igor shows as "super_admin")

3. **API Behavior**:
   - All endpoints return JSON (never HTML errors)
   - Invite flow is idempotent (same email/org returns existing)
   - Write operations create audit log entries

4. **UI Behavior**:
   - Organization context switching works (for super admin)
   - Permission-based UI elements show/hide correctly
   - Error handling provides clear feedback

### 🔍 Key Validation Points

- [ ] Organizations API: SUPER_ADMIN sees all, ORG_ADMIN scoped
- [ ] Users table shows roles correctly (not "no role")  
- [ ] Igor user displays as "super_admin" role
- [ ] Cross-org read/write operations return 403 for ORG_ADMIN
- [ ] Invite flow works and creates audit entries
- [ ] UI respects permissions and org context
- [ ] All responses are JSON format
- [ ] Write operations log: actor_id, actor_role, org_id, resource, action, diff, timestamp

## Troubleshooting

### Users showing "no role"
- Check backend user data transformation in `admin-users/index.ts:89-106`
- Verify `user_roles` relation is populated correctly

### 403 errors for valid operations  
- Check JWT token validity and expiration
- Verify RLS policies allow the operation
- Check org context (X-Org-Id header) if applicable

### Organizations not loading
- Verify Vite proxy configuration for `/api/admin/organizations`
- Check Authorization header forwarding
- Confirm backend RLS scoping logic

### Audit logs missing
- Check `audit_logs` table has proper structure
- Verify write operations call `auditLog()` helper function
- Check for database permission issues

## Export Results

After testing, export results to timestamped directory:

```bash
# Results are automatically saved to:
docs/admin-smoke/YYYYMMDD_HHMMSS/

# Contains:
# - smoke_test.log (curl test results)  
# - detailed_responses.log (full API responses)
# - playwright_results.jsonl (E2E test results)
# - screenshots/ (test evidence)
# - test_summary.json (overall summary)
```

## Integration Checklist

- [ ] Edge functions use caller JWT for all RLS queries
- [ ] `/api/admin/whoami` and `/api/health` available for System Health widget
- [ ] OrgContextProvider persists currentOrgId and auto-appends X-Org-Id header  
- [ ] Backend fields mapped to UI expectations: `{id, email, organization:{id,name}, role, status}`
- [ ] `/users/invite` is idempotent (same email/org returns existing pending)
- [ ] All writes audited with: actor_id, actor_role, org_id, resource, action, diff, ts
- [ ] Vite proxy preserves Authorization header
- [ ] Smoke tests and Playwright tests pass
- [ ] SUPER_ADMIN sees all orgs; ORG_ADMIN is scoped
- [ ] Users table shows roles; Igor=super_admin  
- [ ] Cross-org read/write returns 403 and is audited