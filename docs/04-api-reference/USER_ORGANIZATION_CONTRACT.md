# User-Organization API Contract Specification

**Version:** 1.0  
**Status:** Production  
**Migration Period:** 30 days from implementation  

## Core Principles

1. **Single Source of Truth**: `user_id` is the canonical identifier for all user operations
2. **Explicit Mapping**: No field inference - always require and return explicit IDs
3. **Consistent Error Semantics**: Predictable error responses with actionable messages
4. **Round-trip Correctness**: GET operations return exactly what PATCH/POST operations expect

## Field Standards

### **User Identification**
- **REQUIRED**: `user_id` (string, UUID) - The canonical user identifier
- **DEPRECATED**: `id` (supported during migration period only)
- **Rule**: All user modification endpoints MUST use `user_id` in request payload

### **Organization Assignment**
- **REQUIRED**: `organization_id` (string, UUID) - Always at top level in payload
- **REQUIRED**: `role` (string, enum) - User role within the organization
- **Rule**: Organization assignment is atomic - one organization per user

### **Response Structure**
- **ALWAYS RETURN**: Both `user_id` and `organization_id` in responses
- **ALWAYS RETURN**: `id` field for backward compatibility (same value as `user_id`)
- **INCLUDE**: Full organization object when available

## API Endpoints

### 1. Create User with Organization Assignment

**Endpoint:** `POST /admin-users`

**Request:**
```json
{
  "email": "john.doe@company.com",
  "first_name": "John",
  "last_name": "Doe", 
  "organization_id": "org-12345",
  "role": "VIEWER",
  "password": "secure-password" // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user-67890",           // Backward compatibility
    "user_id": "user-67890",     // Canonical identifier
    "email": "john.doe@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "org-12345",
    "role": "VIEWER",
    "status": "active",
    "email_confirmed": true,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### 2. Update User (Profile & Organization Assignment)

**Endpoint:** `PATCH /admin-users`

**Request:**
```json
{
  "user_id": "user-67890",        // REQUIRED - canonical identifier
  "first_name": "Jane",           // optional - profile update
  "last_name": "Smith",           // optional - profile update
  "organization_id": "org-54321", // optional - org reassignment
  "role": "ORG_ADMIN"            // optional - role change
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-67890",
    "user_id": "user-67890",
    "email": "john.doe@company.com",
    "first_name": "Jane",
    "last_name": "Smith", 
    "organization_id": "org-54321",
    "organization": {
      "id": "org-54321",
      "name": "New Company",
      "slug": "new-company"
    },
    "roles": [
      {
        "role": "ORG_ADMIN",
        "organization_id": "org-54321"
      }
    ],
    "status": "active",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

### 3. List Users with Organizations

**Endpoint:** `GET /admin-users`

**Query Parameters:**
- `org_id` (optional) - Filter by organization

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-67890",
      "user_id": "user-67890",
      "email": "jane.smith@company.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "organization_id": "org-54321",
      "organization": {
        "id": "org-54321",
        "name": "New Company",
        "slug": "new-company"
      },
      "roles": [
        {
          "role": "ORG_ADMIN",
          "organization_id": "org-54321"
        }
      ],
      "status": "active",
      "email_confirmed": true,
      "last_sign_in": "2025-01-15T09:30:00Z",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## Error Responses

### Validation Errors (400 Bad Request)
```json
{
  "error": "invalid_request",
  "details": "user_id is required",
  "code": "MISSING_USER_ID",
  "field": "user_id"
}
```

### Authorization Errors (403 Forbidden)
```json
{
  "error": "forbidden", 
  "details": "Insufficient permissions to assign user to organization",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required_role": "ORG_ADMIN"
}
```

### Not Found Errors (404 Not Found)
```json
{
  "error": "not_found",
  "details": "User not found",
  "code": "USER_NOT_FOUND",
  "user_id": "user-67890"
}
```

### Conflict Errors (409 Conflict)
```json
{
  "error": "conflict",
  "details": "User already assigned to organization",
  "code": "USER_ALREADY_ASSIGNED",
  "user_id": "user-67890",
  "organization_id": "org-12345"
}
```

## Migration Strategy

### Phase 1: Backend Support (Week 1)
- Update Edge Function to accept both `id` and `user_id`
- Always respond with both fields
- Log deprecation warnings for `id` usage

### Phase 2: Frontend Migration (Week 2-3)
- Update all frontend calls to use `user_id`
- Update TypeScript interfaces
- Test round-trip operations

### Phase 3: Deprecation (Week 4)
- Remove support for `id` parameter
- Keep `id` in responses for compatibility
- Update documentation

### Phase 4: Cleanup (Month 2)
- Remove `id` from responses (optional)
- Update TypeScript types
- Final documentation update

## Validation Rules

### User ID Validation
- **Format**: UUID v4
- **Required**: All modification operations
- **Validation**: Must exist in system
- **Authorization**: Must have access to target organization

### Organization ID Validation
- **Format**: UUID v4
- **Required**: User creation and organization assignment
- **Validation**: Must exist and not be soft-deleted
- **Authorization**: Actor must have admin rights to organization

### Role Validation
- **Enum**: ['VIEWER', 'ANALYST', 'ASO_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']
- **Default**: 'VIEWER' for new users
- **Rules**: Cannot assign roles higher than actor's role

## Testing Requirements

### Unit Tests
- Field validation (required/optional)
- Error response format
- Authorization logic
- Role hierarchy enforcement

### Integration Tests
- Full CRUD operations
- Organization assignment flows
- Cross-organization validation
- Migration compatibility

### Contract Tests
- Request/response schema validation
- Field name consistency
- Error format compliance
- Backward compatibility during migration

## Implementation Status

### Backend (Edge Function) ✅ COMPLETED
- ✅ Accept `user_id` parameter (required) with migration support for `id`
- ✅ Support `id` parameter (migration only) with deprecation warnings
- ✅ Return both `id` and `user_id` in responses using `createUserResponse()` helper
- ✅ Validate organization existence with proper error responses
- ✅ Enforce cross-tenant security with role-based authorization
- ✅ Implement structured error responses with `createErrorResponse()` helper
- ✅ Add comprehensive logging with `[ADMIN-USERS]` format
- ⏳ Write validation tests (pending)

### Frontend (Admin Panel) ✅ COMPLETED  
- ✅ Update API calls to use `user_id` in request payloads
- ✅ Update TypeScript interfaces to support canonical fields
- ✅ Handle organization display consistently (supports both `organization` and `organizations` fields)
- ✅ Maintain backward compatibility with `id` field for UI interactions
- ✅ Update user edit modals with canonical field support
- ✅ Build verification passed with no TypeScript errors

### Documentation ✅ COMPLETED
- ✅ API specification (this document)
- ✅ Comprehensive field standards and migration strategy
- ✅ Error handling examples with codes and structure
- ✅ Integration examples for all CRUD operations
- ✅ Implementation status tracking

## Implementation Summary

**Deployed:** January 15, 2025  
**Edge Function:** `admin-users` (latest deployment)  
**Status:** Production Ready with Migration Support

### Key Implementation Details

1. **Canonical Field Handling:**
   - `extractUserId()` helper automatically handles both `user_id` (canonical) and `id` (deprecated) with logging
   - `createUserResponse()` helper ensures all responses include both fields for compatibility
   - `createErrorResponse()` helper provides structured error responses with codes

2. **Migration Strategy:**
   - Backend accepts both `user_id` and `id` parameters
   - Deprecation warnings logged when `id` is used
   - Frontend updated to send `user_id` in request payloads
   - TypeScript interfaces support both field formats

3. **Backward Compatibility:**
   - All responses include both `user_id` and `id` fields
   - UI components handle both field patterns gracefully
   - No breaking changes for existing API consumers

4. **Security & Validation:**
   - Cross-tenant access controls enforced
   - Organization existence validation
   - Role-based authorization with proper error messages
   - Comprehensive audit logging for all operations

## Examples of Common Operations

### 1. Assign Existing User to Different Organization
```bash
curl -X PATCH "/admin-users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "user_id": "user-67890",
    "organization_id": "org-new-123",
    "role": "VIEWER"
  }'
```

### 2. Update User Profile Without Changing Organization
```bash
curl -X PATCH "/admin-users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "user_id": "user-67890", 
    "first_name": "UpdatedName",
    "last_name": "UpdatedLast"
  }'
```

### 3. Create User and Assign to Organization
```bash
curl -X POST "/admin-users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{
    "email": "newuser@company.com",
    "organization_id": "org-12345",
    "role": "ANALYST",
    "first_name": "New",
    "last_name": "User"
  }'
```

This contract ensures:
- ✅ **Consistency**: `user_id` always used for modifications
- ✅ **Clarity**: Explicit organization assignment at top level
- ✅ **Maintainability**: Clear error semantics and validation rules
- ✅ **Migration Support**: Backward compatibility during transition
- ✅ **Testing**: Comprehensive test requirements
- ✅ **Documentation**: Complete examples and specifications