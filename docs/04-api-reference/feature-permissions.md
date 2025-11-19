# Unified Feature Permission System

## Table of Contents
- [System Overview](#system-overview)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Frontend Usage](#frontend-usage)
- [Admin Workflows](#admin-workflows)
- [Extending the System](#extending-the-system)
- [Validation & Testing](#validation--testing)

## System Overview

The unified feature permission system provides enterprise-grade access control for the ASO Tool platform. It consolidates previously overlapping permission systems into a single, coherent architecture that supports:

- **Organization-level entitlements**: Control which features are available to each organization
- **User-level overrides**: Grant or restrict access to specific users within an organization
- **Audit logging**: Track feature usage for compliance and analytics
- **Tenant isolation**: Ensure strict RLS (Row Level Security) across all operations

### Core Principles

1. **Server-truth only**: All permissions are validated server-side with no client heuristics
2. **RLS isolation**: Every table enforces tenant boundaries via Row Level Security
3. **Hierarchical access**: User overrides can grant or restrict beyond organization entitlements
4. **Comprehensive logging**: All feature access attempts are logged for audit purposes

### Architecture Overview

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Frontend (React)  │    │   Supabase (API)     │    │   Database (PG)     │
├─────────────────────┤    ├──────────────────────┤    ├─────────────────────┤
│ useUnifiedFeature   │◄──►│ Edge Functions       │◄──►│ platform_features   │
│ FeatureGuard        │    │ RLS Policies         │    │ org_feature_entitle │
│ Admin Panel         │    │ Service Functions    │    │ user_feature_over   │
│ Route Protection    │    │ Auth & Authorization │    │ feature_usage_logs  │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Database Schema

### `platform_features`
**Purpose**: Central registry of all available platform features

```sql
CREATE TABLE platform_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR UNIQUE NOT NULL,         -- e.g., 'keyword_intelligence'
  feature_name VARCHAR NOT NULL,               -- e.g., 'Keyword Intelligence'
  description TEXT,                            -- Feature description
  category VARCHAR NOT NULL,                   -- e.g., 'Performance Intelligence'
  is_active BOOLEAN DEFAULT true,              -- Feature toggle at platform level
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `org_feature_entitlements`
**Purpose**: Organization-level feature access control

```sql
CREATE TABLE org_feature_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  feature_key VARCHAR NOT NULL,               -- References platform_features.feature_key
  is_enabled BOOLEAN DEFAULT false,           -- Organization has access to feature
  enabled_at TIMESTAMPTZ,                     -- When feature was enabled
  enabled_by UUID,                            -- User who enabled the feature
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, feature_key)
);
```

### `user_feature_overrides`
**Purpose**: User-specific feature access overrides

```sql
CREATE TABLE user_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  feature_key VARCHAR NOT NULL,               -- References platform_features.feature_key
  is_enabled BOOLEAN NOT NULL,                -- Override: grant (true) or restrict (false)
  expires_at TIMESTAMPTZ,                     -- Optional expiration date
  granted_by UUID,                            -- Admin who granted the override
  reason TEXT,                                -- Optional reason for override
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature_key)
);
```

### `feature_usage_logs`
**Purpose**: Audit trail and usage analytics

```sql
CREATE TABLE feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  feature_key VARCHAR NOT NULL,
  usage_type VARCHAR DEFAULT 'access',        -- 'access', 'guard_check', 'api_call'
  metadata JSONB DEFAULT '{}',                -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Example Queries

**Check organization entitlements:**
```sql
SELECT feature_key, is_enabled 
FROM org_feature_entitlements 
WHERE organization_id = $1;
```

**Check user overrides:**
```sql
SELECT feature_key, is_enabled, expires_at
FROM user_feature_overrides 
WHERE user_id = $1 
  AND (expires_at IS NULL OR expires_at > now());
```

**Feature usage audit:**
```sql
SELECT u.email, ful.feature_key, ful.usage_type, ful.created_at
FROM feature_usage_logs ful
JOIN auth.users u ON u.id = ful.user_id
WHERE ful.organization_id = $1
ORDER BY ful.created_at DESC
LIMIT 100;
```

## API Reference

### Edge Functions

#### `GET /functions/v1/admin-features`
List all platform features with organization entitlements

**Response:**
```json
{
  "features": [
    {
      "feature_key": "keyword_intelligence",
      "feature_name": "Keyword Intelligence",
      "description": "Advanced keyword analysis and tracking",
      "category": "Performance Intelligence",
      "is_active": true,
      "org_enabled": true,
      "user_override": null
    }
  ],
  "categories": {
    "Performance Intelligence": [
      "keyword_intelligence",
      "competitive_analysis"
    ]
  }
}
```

#### `POST /functions/v1/admin-features/toggle`
Toggle feature access for an organization

**Request:**
```json
{
  "organization_id": "uuid",
  "feature_key": "keyword_intelligence",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feature toggled successfully",
  "feature_key": "keyword_intelligence",
  "enabled": true
}
```

#### `POST /functions/v1/admin-features/user-override`
Grant or restrict user access to a specific feature

**Request:**
```json
{
  "user_id": "uuid",
  "feature_key": "keyword_intelligence",
  "enabled": true,
  "expires_at": "2024-12-31T23:59:59Z",
  "reason": "Beta testing access"
}
```

### Error Handling

All API responses follow consistent error format:

```json
{
  "error": "unauthorized",
  "message": "Insufficient permissions to manage features",
  "code": 403
}
```

Common error codes:
- `400`: Invalid request parameters
- `403`: Insufficient permissions
- `404`: Feature or organization not found
- `409`: Conflict (e.g., override already exists)
- `500`: Internal server error

## Frontend Usage

### Using the Hook

```tsx
import { useUnifiedFeatureAccess } from '@/hooks/useUnifiedFeatureAccess';

function MyComponent() {
  const { 
    hasFeature, 
    getFeatureStatus, 
    getAllFeatures, 
    loading, 
    logFeatureUsage 
  } = useUnifiedFeatureAccess();

  // Simple access check
  const canUseKeywords = hasFeature('keyword_intelligence');

  // Detailed feature status
  const keywordStatus = getFeatureStatus('keyword_intelligence');
  // Returns: { hasAccess, orgEnabled, userOverride, roleAllowed, source }

  // Log feature usage
  const handleFeatureUse = () => {
    logFeatureUsage('keyword_intelligence', 'button_click', {
      component: 'KeywordDashboard',
      action: 'start_analysis'
    });
  };

  if (loading) return <div>Loading permissions...</div>;

  return (
    <div>
      {canUseKeywords && (
        <button onClick={handleFeatureUse}>
          Start Keyword Analysis
        </button>
      )}
    </div>
  );
}
```

### Component Protection with FeatureGuard

```tsx
import { FeatureGuard } from '@/components/FeatureGuard';

function App() {
  return (
    <div>
      <FeatureGuard 
        feature="keyword_intelligence" 
        fallback={<div>Feature not available</div>}
        logAccess={true}
      >
        <KeywordDashboard />
      </FeatureGuard>
    </div>
  );
}

// Higher-order component version
const GuardedKeywordDashboard = withFeatureGuard(
  KeywordDashboard, 
  'keyword_intelligence'
);
```

### Route Protection

```tsx
// In routing configuration
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

<Route 
  path="/keyword-analysis" 
  element={
    <ProtectedRoute>
      <FeatureGuard feature="keyword_intelligence">
        <KeywordAnalysisPage />
      </FeatureGuard>
    </ProtectedRoute>
  } 
/>
```

### Available Features

The system currently supports 24 features across 5 categories:

```typescript
// From src/constants/features.ts
export const PLATFORM_FEATURES_ENHANCED = {
  // Performance Intelligence
  KEYWORD_INTELLIGENCE: 'keyword_intelligence',
  COMPETITIVE_ANALYSIS: 'competitive_analysis',
  PERFORMANCE_TRACKING: 'performance_tracking',
  
  // AI Command Center  
  ASO_AI_HUB: 'aso_ai_hub',
  CHATGPT_VISIBILITY_AUDIT: 'chatgpt_visibility_audit',
  
  // Creative Intelligence
  CREATIVE_REVIEW_DEMO: 'creative_review_demo',
  KEYWORD_INSIGHTS_DEMO: 'keyword_insights_demo',
  
  // Data & Intelligence
  BIGQUERY_INTEGRATION: 'bigquery_integration',
  
  // Account Management
  PROFILE_MANAGEMENT: 'profile_management'
  // ... more features
};

export const FEATURE_CATEGORIES = {
  'Performance Intelligence': [
    'keyword_intelligence',
    'competitive_analysis',
    'performance_tracking'
  ],
  // ... more categories
};
```

## Admin Workflows

### Super Admin: Platform-Wide Feature Management

1. **Access the admin panel** at `/admin/features`
2. **View all organizations** and their feature entitlements
3. **Toggle features per organization**:
   - Enable/disable features for specific organizations
   - Bulk enable features for multiple organizations
   - View feature usage statistics

### Organization Admin: Team Feature Management

1. **View organization features** at `/admin/features` (filtered to own org)
2. **Manage user overrides**:
   - Grant temporary access to restricted features
   - Revoke access to normally available features
   - Set expiration dates for overrides
3. **Review usage logs** for compliance and monitoring

### User Override Scenarios

**Scenario 1: Beta Feature Access**
```sql
-- Grant beta access to specific user
INSERT INTO user_feature_overrides (
  user_id, organization_id, feature_key, is_enabled, 
  expires_at, reason, granted_by
) VALUES (
  'user-uuid', 'org-uuid', 'new_beta_feature', true,
  '2024-06-30', 'Beta testing participant', 'admin-uuid'
);
```

**Scenario 2: Temporary Restriction** 
```sql
-- Temporarily restrict access due to billing issue
INSERT INTO user_feature_overrides (
  user_id, organization_id, feature_key, is_enabled, 
  expires_at, reason, granted_by
) VALUES (
  'user-uuid', 'org-uuid', 'premium_analytics', false,
  '2024-03-31', 'Payment overdue', 'admin-uuid'
);
```

## Extending the System

### Adding a New Feature

1. **Insert into platform_features table:**
```sql
INSERT INTO platform_features (feature_key, feature_name, description, category)
VALUES (
  'advanced_reporting', 
  'Advanced Reporting', 
  'Enhanced analytics and custom reports',
  'Data & Intelligence'
);
```

2. **Update constants file:**
```typescript
// In src/constants/features.ts
export const PLATFORM_FEATURES_ENHANCED = {
  // ... existing features
  ADVANCED_REPORTING: 'advanced_reporting',
};

// Add to appropriate category
export const FEATURE_CATEGORIES = {
  'Data & Intelligence': [
    'bigquery_integration',
    'advanced_reporting', // Add here
  ],
};

// Add label and description
export const FEATURE_LABELS = {
  // ... existing labels
  advanced_reporting: 'Advanced Reporting',
};

export const FEATURE_DESCRIPTIONS = {
  // ... existing descriptions
  advanced_reporting: 'Enhanced analytics with custom reporting capabilities',
};
```

3. **Update role-based defaults (if needed):**
```typescript
export const ROLE_FEATURE_DEFAULTS = {
  super_admin: ['*'], // Gets all features
  organization_admin: [
    'keyword_intelligence',
    'advanced_reporting', // Add to org admin defaults
  ],
  // ... other roles
};
```

4. **Create feature-specific components:**
```tsx
// Protect new feature in UI
<FeatureGuard feature="advanced_reporting">
  <AdvancedReportingDashboard />
</FeatureGuard>
```

### Feature-Based Route Protection

```tsx
// Add route with feature protection
<Route 
  path="/advanced-reports" 
  element={
    <ProtectedRoute>
      <FeatureGuard 
        feature="advanced_reporting"
        fallback={<FeatureNotAvailable />}
      >
        <AdvancedReportsPage />
      </FeatureGuard>
    </ProtectedRoute>
  } 
/>
```

### Best Practices for Feature Naming

- **Feature keys**: Use `snake_case` for consistency
- **Categories**: Use "Title Case" with clear groupings
- **Descriptions**: Be specific about functionality
- **Prefix conventions**:
  - `demo_*` for demo/preview features
  - `beta_*` for beta features
  - `premium_*` for paid features

## Validation & Testing

### Smoke Tests

Run these tests to validate the system:

```typescript
// Example test suite
describe('Feature Permission System', () => {
  test('Super admin has access to all features', async () => {
    const { hasFeature } = renderHookWithAuth(useUnifiedFeatureAccess, {
      role: 'super_admin'
    });
    
    expect(hasFeature('keyword_intelligence')).toBe(true);
    expect(hasFeature('advanced_reporting')).toBe(true);
  });

  test('User override grants access despite org restriction', async () => {
    // Mock org has feature disabled, but user has override
    mockOrgFeatures({ keyword_intelligence: false });
    mockUserOverrides({ keyword_intelligence: true });
    
    const { hasFeature } = renderHookWithAuth(useUnifiedFeatureAccess);
    expect(hasFeature('keyword_intelligence')).toBe(true);
  });

  test('FeatureGuard blocks unauthorized access', () => {
    mockUserPermissions({ keyword_intelligence: false });
    
    const { queryByText } = render(
      <FeatureGuard feature="keyword_intelligence">
        <div>Protected Content</div>
      </FeatureGuard>
    );
    
    expect(queryByText('Protected Content')).toBeNull();
  });
});
```

### SQL Validation Queries

**Verify organization entitlements:**
```sql
-- Check that all orgs have required baseline features
SELECT o.name, COUNT(ofe.feature_key) as enabled_features
FROM organizations o
LEFT JOIN org_feature_entitlements ofe ON o.id = ofe.organization_id AND ofe.is_enabled = true
GROUP BY o.id, o.name
HAVING COUNT(ofe.feature_key) < 5; -- Baseline feature count
```

**Validate user overrides:**
```sql
-- Find expired overrides that should be cleaned up
SELECT uo.*, u.email, o.name as org_name
FROM user_feature_overrides uo
JOIN auth.users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.expires_at < now();
```

**Audit feature usage:**
```sql
-- Most used features in the last 30 days
SELECT 
  feature_key, 
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users
FROM feature_usage_logs 
WHERE created_at > now() - interval '30 days'
GROUP BY feature_key
ORDER BY usage_count DESC;
```

### E2E Testing Scenarios

```typescript
// Playwright test example
test('Admin can toggle organization features', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/features');
  
  // Find organization and toggle a feature
  await page.click('[data-org-id="test-org"] [data-feature="keyword_intelligence"] button');
  
  // Verify the toggle worked
  await expect(page.locator('[data-feature="keyword_intelligence"] .enabled')).toBeVisible();
  
  // Switch to that organization and verify access
  await loginAsOrgUser(page, 'test-org');
  await page.goto('/keyword-analysis');
  
  // Should now have access to the feature
  await expect(page.locator('.keyword-dashboard')).toBeVisible();
});
```

### Performance Monitoring

Monitor these metrics for system health:

- **Permission check latency**: Track `useUnifiedFeatureAccess` hook performance
- **Database query performance**: Monitor RLS policy efficiency
- **Feature usage patterns**: Analyze popular features and access patterns
- **Override effectiveness**: Track how often overrides are used vs. org entitlements

### Security Validation

- **RLS Policy Testing**: Verify users cannot access other tenants' data
- **Permission Escalation**: Ensure users cannot grant themselves permissions
- **Audit Trail Integrity**: Verify all feature access attempts are logged
- **Role-Based Access**: Confirm role boundaries are enforced correctly

---

## Support & Troubleshooting

### Common Issues

**Issue**: User can't access a feature they should have
- **Check**: Organization entitlements in `/admin/features`
- **Check**: User overrides (may be explicitly restricted)
- **Check**: Role-based defaults in `ROLE_FEATURE_DEFAULTS`

**Issue**: Feature toggles not working in UI
- **Check**: Hook is using `useUnifiedFeatureAccess` (not legacy hooks)
- **Check**: Component is wrapped in `<FeatureGuard>`
- **Check**: Loading states are handled properly

**Issue**: Admin panel shows wrong permissions
- **Check**: User has correct role (`super_admin` or `organization_admin`)
- **Check**: RLS policies are enforcing tenant isolation
- **Check**: Cache invalidation after permission changes

### Debug Tools

```typescript
// Debug feature status for a user
const debugFeatureStatus = (featureKey: string) => {
  const status = getFeatureStatus(featureKey);
  console.log(`Feature: ${featureKey}`, {
    hasAccess: status.hasAccess,
    orgEnabled: status.orgEnabled,
    userOverride: status.userOverride,
    roleAllowed: status.roleAllowed,
    source: status.source
  });
};
```

For additional support, check the admin panel at `/admin/features` or review the audit logs in the database.
