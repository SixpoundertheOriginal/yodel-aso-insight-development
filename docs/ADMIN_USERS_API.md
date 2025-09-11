# Admin Users Edge Function API

This document describes the complete API for the `admin-users` Edge Function with full POST/PATCH support for user creation and organization assignment.

## Base URL
```
https://<project>.supabase.co/functions/v1/admin-users
```

## Authentication
All requests require authentication via JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

**Authorization Levels:**
- **Super Admin**: Full access to all organizations
- **Organization Admin**: Access to users within their organization(s) only

## Supported HTTP Methods

### GET - List Users
Lists users with organization and role information.

**Query Parameters:**
- `org_id` (optional): Filter by organization ID (Super Admin only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe", 
      "organization": {
        "id": "org-uuid",
        "name": "Company Name",
        "slug": "company"
      },
      "organization_id": "org-uuid",
      "roles": [{"role": "VIEWER", "organization_id": "org-uuid"}],
      "role": "VIEWER",
      "status": "active",
      "email_confirmed": true,
      "last_sign_in": "2025-01-01T00:00:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST - Create User or Legacy Actions

#### Option 1: Direct User Creation
Create a new user with organization assignment.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "secure_password", // Optional, auto-generated if not provided
  "first_name": "Jane",
  "last_name": "Smith",
  "organization_id": "org-uuid",
  "role": "VIEWER" // Optional, defaults to VIEWER
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "organization_id": "org-uuid",
    "role": "VIEWER",
    "status": "active"
  }
}
```

#### Option 2: Legacy Action-Based API
For backward compatibility with existing client code.

**Available Actions:**

##### `action: "list"`
Same as GET method.

##### `action: "create"`
Same as direct user creation above, but with `action` parameter.

##### `action: "update"`
Update existing user. Same parameters as PATCH method below.

##### `action: "invite"`
Create user invitation (existing functionality).

**Request Body:**
```json
{
  "action": "create",
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Smith", 
  "organization_id": "org-uuid",
  "role": "VIEWER"
}
```

### PATCH - Update User
Update existing user profile and/or organization assignment.

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "first_name": "UpdatedName", // Optional
  "last_name": "UpdatedLastName", // Optional
  "organization_id": "new-org-uuid", // Optional - reassign to different org
  "role": "ORG_ADMIN" // Optional - change role
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "first_name": "UpdatedName",
    "last_name": "UpdatedLastName",
    "organization_id": "new-org-uuid",
    "user_roles": [{"role": "ORG_ADMIN", "organization_id": "new-org-uuid"}],
    "organizations": {
      "id": "new-org-uuid",
      "name": "New Company",
      "slug": "new-company"
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "invalid_request", 
  "details": "email and organization_id required"
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "details": "Only super admin or org admin can create users"
}
```

### 404 Not Found
```json
{
  "error": "user_not_found",
  "details": "User not found"
}
```

### 405 Method Not Allowed
```json
{
  "error": "method_not_allowed",
  "details": "Supported methods: GET, POST, PATCH, OPTIONS"
}
```

### 500 Internal Server Error
```json
{
  "error": "server_error",
  "details": "Failed to create user"
}
```

## Security & Authorization

### Cross-Tenant Protection
- Users can only be assigned to organizations where the admin has `ORG_ADMIN` or `SUPER_ADMIN` role
- Organization changes require admin rights on both source and target organizations
- Super Admins can manage all organizations

### Input Validation
- All required fields validated before processing
- Organization existence verified before assignment
- Duplicate email checks performed
- Role values normalized to uppercase

### Audit Logging
All operations are logged to `audit_logs` table with:
- Actor information (who performed the action)
- Before/after values for updates
- Action context and metadata
- Timestamp and operation details

## Example Usage

### Create New User
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "org-123",
    "role": "VIEWER",
    "password": "secure123"
  }'
```

### Assign User to Different Organization
```bash
curl -X PATCH "https://your-project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-456",
    "organization_id": "new-org-789",
    "role": "ORG_ADMIN"
  }'
```

### Update User Profile
```bash
curl -X PATCH "https://your-project.supabase.co/functions/v1/admin-users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-456",
    "first_name": "Jane",
    "last_name": "Smith"
  }'
```

## Implementation Notes

### User Creation Process
1. Validates admin permissions and organization access
2. Creates auth user with `supabaseAdmin.auth.admin.createUser()`
3. Auto-confirms email for admin-created users
4. Creates profile record in `profiles` table
5. Assigns role in `user_roles` table
6. Rolls back all changes if any step fails
7. Logs action in audit trail

### Organization Assignment Process
1. Validates admin has rights to both source and target organizations
2. Updates user profile with new organization
3. Removes old role assignments for that organization
4. Adds new role assignment
5. Maintains audit trail of changes

### Error Handling
- Transactional cleanup on failures
- Detailed error messages for debugging
- Proper HTTP status codes
- Comprehensive logging for troubleshooting

## Role Hierarchy
- `SUPER_ADMIN`: Platform-wide access, can manage all organizations
- `ORG_ADMIN`: Organization-level admin, can manage users within their org(s)
- `VIEWER`: Standard user role (default for new users)

## Database Schema Dependencies
- `profiles`: User profile information
- `user_roles`: Role assignments per organization
- `organizations`: Organization details
- `audit_logs`: Action audit trail