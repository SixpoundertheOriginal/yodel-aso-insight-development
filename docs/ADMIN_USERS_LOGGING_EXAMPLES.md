# Admin Users Edge Function - Comprehensive Logging Examples

This document shows the enhanced console logging added to the admin-users Edge Function for debugging and monitoring.

## Logging Format

All logs follow the pattern: `[ADMIN-USERS] <METHOD> <context> - <message>`

Examples:
- `[ADMIN-USERS] POST action=create - Processing user creation`
- `[ADMIN-USERS] PATCH - Validation failure: missing user_id`

## Example Logging Outputs

### 1. Successful User Creation (POST with action=create)

**Request:**
```bash
curl -X POST "https://project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "email": "john@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "org-123",
    "role": "VIEWER",
    "password": "secure123"
  }'
```

**Console Logs:**
```
=== ADMIN-USERS DEBUG START ===
Method: POST
URL: https://project.supabase.co/functions/v1/admin-users
Headers: {"authorization":"Bearer jwt...","content-type":"application/json",...}
Authorization header present: true

Auth getUser result: { user: "admin-user-id", error: null }
Super admin check: { isSA: false, error: null }
User roles query: { userRoles: [{"role":"ORG_ADMIN","organization_id":"org-123"}], error: null }
Final actor role: ORG_ADMIN

[ADMIN-USERS] POST request - Incoming JSON body: {"action":"create","email":"john@company.com","first_name":"John","last_name":"Doe","organization_id":"org-123","role":"VIEWER","password":"secure123"}

[ADMIN-USERS] POST action=create - Processing user creation

[ADMIN-USERS] POST action=create - Extracted fields: {
  "email": "john@company.com",
  "organization_id": "org-123", 
  "role": "VIEWER",
  "has_password": true,
  "first_name": "John",
  "last_name": "Doe"
}

[ADMIN-USERS] POST action=create - Checking authorization for user: admin-user-id isSuperAdmin: false

[ADMIN-USERS] POST action=create - Not super admin, checking org admin rights for org: org-123

[ADMIN-USERS] POST action=create - User roles in target org: [{"role":"ORG_ADMIN","organization_id":"org-123"}]

[ADMIN-USERS] POST action=create - Authorization result: true

[ADMIN-USERS] POST action=create - Verifying organization exists: org-123

[ADMIN-USERS] POST action=create - Organization check result: { "found": true, "error": null }

[ADMIN-USERS] POST action=create - Starting user creation process

[ADMIN-USERS] POST action=create - Creating auth user with payload: {
  "email": "john@company.com",
  "has_custom_password": true,
  "email_confirm": true,
  "user_metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "created_by_admin": true,
    "created_by": "admin-user-id",
    "organization_id": "org-123"
  }
}

[ADMIN-USERS] POST action=create - Auth user created successfully, ID: new-user-uuid

[ADMIN-USERS] POST action=create - Creating profile: {
  "id": "new-user-uuid",
  "email": "john@company.com", 
  "first_name": "John",
  "last_name": "Doe",
  "organization_id": "org-123"
}

[ADMIN-USERS] POST action=create - Profile created successfully

[ADMIN-USERS] POST action=create - Assigning role: {
  "user_id": "new-user-uuid",
  "organization_id": "org-123",
  "role": "VIEWER"
}

[ADMIN-USERS] POST action=create - Role assigned successfully

[ADMIN-USERS] POST action=create - Creating audit log

[ADMIN-USERS] POST action=create - SUCCESS! User created: {
  "id": "new-user-uuid",
  "email": "john@company.com",
  "first_name": "John", 
  "last_name": "Doe",
  "organization_id": "org-123",
  "role": "VIEWER",
  "status": "active"
}
```

### 2. Failed User Creation - Missing Required Fields

**Request:**
```bash
curl -X POST "https://project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Console Logs:**
```
[ADMIN-USERS] POST request - Incoming JSON body: {"action":"create","first_name":"John","last_name":"Doe"}

[ADMIN-USERS] POST action=create - Processing user creation

[ADMIN-USERS] POST action=create - Extracted fields: {
  "email": "MISSING",
  "organization_id": "MISSING",
  "role": "VIEWER",
  "has_password": false,
  "first_name": "John",
  "last_name": "Doe"
}

[ADMIN-USERS] POST action=create - Validation failure: missing required fields {
  "email": false,
  "organization_id": false,
  "body": "{\"action\":\"create\",\"first_name\":\"John\",\"last_name\":\"Doe\"}"
}
```

### 3. Authorization Failure

**Request:**
```bash
curl -X POST "https://project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $NON_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "email": "john@company.com",
    "organization_id": "org-456"
  }'
```

**Console Logs:**
```
[ADMIN-USERS] POST action=create - Checking authorization for user: regular-user-id isSuperAdmin: false

[ADMIN-USERS] POST action=create - Not super admin, checking org admin rights for org: org-456

[ADMIN-USERS] POST action=create - User roles in target org: []

[ADMIN-USERS] POST action=create - Authorization result: false

[ADMIN-USERS] POST action=create - Authorization failure: insufficient permissions {
  "user_id": "regular-user-id",
  "organization_id": "org-456",
  "is_super_admin": false,
  "body": "{\"action\":\"create\",\"email\":\"john@company.com\",\"organization_id\":\"org-456\"}"
}
```

### 4. Database Error During Profile Creation

**Console Logs:**
```
[ADMIN-USERS] POST action=create - Auth user created successfully, ID: new-user-uuid

[ADMIN-USERS] POST action=create - Creating profile: {
  "id": "new-user-uuid",
  "email": "duplicate@company.com",
  "first_name": "John",
  "last_name": "Doe", 
  "organization_id": "org-123"
}

[ADMIN-USERS] POST action=create - Profile creation failed, cleaning up auth user: {
  "error": "duplicate key value violates unique constraint \"profiles_email_key\"",
  "newUserId": "new-user-uuid",
  "profileData": {
    "id": "new-user-uuid",
    "email": "duplicate@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "org-123"
  },
  "body": "{\"action\":\"create\",\"email\":\"duplicate@company.com\",...}"
}
```

### 5. Successful User Update (PATCH)

**Request:**
```bash
curl -X PATCH "https://project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "organization_id": "new-org-456", 
    "role": "ORG_ADMIN",
    "first_name": "Jane"
  }'
```

**Console Logs:**
```
[ADMIN-USERS] PATCH request - Incoming JSON body: {"user_id":"user-123","organization_id":"new-org-456","role":"ORG_ADMIN","first_name":"Jane"}

[ADMIN-USERS] PATCH - Extracted fields: {
  "user_id": "user-123",
  "organization_id": "new-org-456",
  "role": "ORG_ADMIN", 
  "first_name": "Jane",
  "last_name": undefined,
  "otherFields": {}
}

[ADMIN-USERS] PATCH - Starting authorization and validation checks...

[ADMIN-USERS] PATCH - User update completed successfully
```

### 6. Direct POST Creation (No Action Parameter)

**Request:**
```bash
curl -X POST "https://project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "direct@company.com",
    "organization_id": "org-123",
    "first_name": "Direct",
    "role": "VIEWER"
  }'
```

**Console Logs:**
```
[ADMIN-USERS] POST request - Incoming JSON body: {"email":"direct@company.com","organization_id":"org-123","first_name":"Direct","role":"VIEWER"}

[ADMIN-USERS] POST direct - No action parameter, checking for direct creation

[ADMIN-USERS] POST direct - Fields check: {
  "email": "direct@company.com",
  "organization_id": "org-123", 
  "has_both_required": true
}

[ADMIN-USERS] POST direct - Starting direct user creation

[Same creation process logs as action=create above]
```

### 7. Missing User ID in Update

**Request:**
```bash
curl -X PATCH "https://project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "organization_id": "org-456"
  }'
```

**Console Logs:**
```
[ADMIN-USERS] PATCH request - Incoming JSON body: {"first_name":"Jane","organization_id":"org-456"}

[ADMIN-USERS] PATCH - Extracted fields: {
  "user_id": "MISSING",
  "organization_id": "org-456",
  "role": undefined,
  "first_name": "Jane",
  "last_name": undefined,
  "otherFields": {}
}

[ADMIN-USERS] PATCH - Validation failure: missing user_id {
  "body": "{\"first_name\":\"Jane\",\"organization_id\":\"org-456\"}"
}
```

### 8. Unexpected Server Error

**Console Logs:**
```
[ADMIN-USERS] POST action=create - Unexpected error in creation process: {
  "error": "Connection timeout", 
  "stack": "Error: Connection timeout\n    at ...",
  "body": "{\"action\":\"create\",\"email\":\"test@example.com\",...}"
}
```

## Debugging Benefits

This comprehensive logging provides:

### ✅ **Request Tracking**
- Full request body logging
- Field extraction validation  
- Parameter presence checks

### ✅ **Authorization Debugging**
- Super admin vs org admin paths
- Role lookup results
- Permission check outcomes

### ✅ **Database Operation Monitoring**
- Auth user creation status
- Profile creation success/failure
- Role assignment results
- Organization validation

### ✅ **Error Context**
- Full error messages with context
- Request body included in error logs
- Stack traces for unexpected errors
- Cleanup operation logging

### ✅ **Success Tracking**
- Step-by-step progress logs
- Final result data logging
- Audit log creation confirmation

## Log Analysis Commands

### View Recent Function Logs
```bash
# Via Supabase Dashboard
# Functions > admin-users > Logs

# Or via CLI (if supported in newer versions)
supabase functions logs admin-users --limit 100
```

### Filter for Errors
Search for logs containing:
- `[ADMIN-USERS]` + `error` or `FAILED`
- `Validation failure`
- `Authorization failure` 
- `DB error`
- `Unexpected error`

### Monitor Success Rates
Search for:
- `SUCCESS! User created` 
- `User update completed successfully`
- Count vs error logs for success rate

This logging implementation provides complete visibility into the admin-users function operations for debugging and monitoring purposes.