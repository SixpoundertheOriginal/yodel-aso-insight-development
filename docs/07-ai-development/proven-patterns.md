# Proven Patterns Documentation

**Generated on:** 2025-09-09  
**Status:** Extracted from working components in production system  
**Purpose:** Reference guide for extending functionality using validated architectural patterns

## Overview

This document catalogs architectural patterns that are proven to work in the current Yodel ASO Insight system. Each pattern has been extracted from working code and validated through production usage.

---

## Pattern 1: Centralized Permission Detection

### Pattern Description

Single source of truth for organization-level permission detection using centralized hooks that prevent logic fragmentation across components.

### Implementation

**Hook:** `useDemoOrgDetection`  
**File:** `src/hooks/useDemoOrgDetection.ts`  
**Structure:**
```typescript
export const useDemoOrgDetection = () => {
  const { profile, isLoading } = useUserProfile();
  const organization = profile?.organizations;
  const isDemoOrg = Boolean(organization?.settings?.demo_mode) || organization?.slug?.toLowerCase() === 'next';

  return {
    isDemoOrg,
    organization,
    loading: isLoading,
  };
};
```

**Dependencies:**
- `useUserProfile` hook for accessing user's organization data
- Database JSONB `settings.demo_mode` field
- Organization `slug` field as fallback identifier

### Usage Examples

**Route Protection (src/components/Auth/ProtectedRoute.tsx:16):**
```typescript
const { isDemoOrg, loading: orgLoading } = useDemoOrgDetection();
const allowed = getAllowedRoutes({ isDemoOrg, role });
```

**Navigation Filtering (src/components/AppSidebar.tsx:172):**
```typescript
const { isDemoOrg, organization: org, loading: orgLoading } = useDemoOrgDetection();
const filterOptions = { isDemoOrg, isSuperAdmin, routes, hasFeature, hasPermission };
const filteredAnalyticsItems = filterNavigationByRoutes(analyticsItems, filterOptions);
```

**Data Fallback Logic (src/hooks/useAsoDataWithFallback.ts:32):**
```typescript
const { isDemoOrg } = useDemoOrgDetection();
// Used to determine whether to use demo data vs real BigQuery data
```

### Why This Works

- **Prevents Logic Fragmentation:** All demo detection logic centralized in one hook
- **Consistent Calculation:** Same demo detection logic applied everywhere
- **Easy Testing:** Single point to test permission detection logic
- **Future Extension:** Can easily extend to support configurable permissions beyond demo mode
- **Performance:** React Query caching prevents duplicate API calls

### Component Integration Points

**Verified Usage (6 active components):**
- `src/components/Auth/ProtectedRoute.tsx` - Route access control
- `src/components/AppSidebar.tsx` - Navigation filtering 
- `src/hooks/useAsoDataWithFallback.ts` - Data source selection
- `src/components/GlobalDemoIndicator.tsx` - UI indicator display
- `src/hooks/index.ts` - Centralized export
- `src/hooks/useDemoOrgDetection.ts` - Implementation

### Anti-Pattern to Avoid

❌ **Multiple components calculating demo status independently:**
```typescript
// DON'T DO THIS - fragments logic across components
const isDemoMode = user?.organization?.slug === 'next'; // Component A
const isDemo = Boolean(org?.settings?.demo_mode); // Component B
const demoOrg = profile?.organizations?.name?.toLowerCase() === 'next'; // Component C
```

---

## Pattern 2: Database-Driven Configuration

### Pattern Description

Using JSONB columns for flexible, database-driven feature configuration that avoids hardcoded behavior and enables admin-configurable features.

### Implementation

**Table:** `organizations`  
**Column:** `settings` (JSONB)  
**Type Definition (src/hooks/useUserProfile.ts:8-10):**
```typescript
type UserProfile = Tables<'profiles'> & {
  organizations: (Pick<Tables<'organizations'>, 'name' | 'subscription_tier' | 'slug'> & {
    settings: { demo_mode?: boolean } | null;
  }) | null;
};
```

**Access Pattern:**
```typescript
// Hook access (src/hooks/useDemoOrgDetection.ts:6)
const isDemoOrg = Boolean(organization?.settings?.demo_mode) || organization?.slug?.toLowerCase() === 'next';

// API access (supabase/functions/bigquery-aso-data/index.ts:185-190)
const { data: org } = await supabaseClient
  .from('organizations')
  .select('settings')
  .eq('id', organizationId)
  .single();
const isDemo = !!org?.settings?.demo_mode;
```

### Why This Works

- **Avoids Hardcoded Configuration:** Settings can be modified without code deployment
- **Admin Configurable:** Super admins can toggle organization features via database
- **Type Safety:** TypeScript interfaces provide compile-time validation
- **Extensible:** Can add new settings without schema changes
- **Performance:** JSONB indexing allows efficient querying of nested properties

### Extension Strategy

**Adding New Configuration Options:**
1. **Extend Type Interface:**
```typescript
settings: { 
  demo_mode?: boolean;
  feature_flags?: {
    new_feature?: boolean;
    experimental_ui?: boolean;
  };
  limits?: {
    api_calls_per_hour?: number;
    max_apps?: number;
  };
} | null;
```

2. **Add Hook for New Setting:**
```typescript
export const useFeatureFlags = () => {
  const { profile } = useUserProfile();
  return profile?.organizations?.settings?.feature_flags || {};
};
```

3. **Use in Components:**
```typescript
const { new_feature } = useFeatureFlags();
if (new_feature) {
  // Render new feature UI
}
```

### Database Pattern Verification

**Verified JSONB Usage Patterns:**
- `organizations.settings` - Feature configuration
- `organizations.features` - Platform feature access
- `organizations.api_limits` - API rate limiting settings  
- `role_permissions.permissions` - Role-based permission definitions
- `organization_partnerships.permissions` - Partnership access controls

---

## Pattern 3: Navigation Filtering Architecture

### Pattern Description

Central navigation filtering system based on user permissions and organizational settings that provides consistent access control across all navigation elements.

### Implementation

**Core Function:** `filterNavigationByRoutes`  
**File:** `src/utils/navigation.ts:20-46`  
**Signature:**
```typescript
export const filterNavigationByRoutes = (
  items: NavigationItem[],
  { routes, isDemoOrg, isSuperAdmin, hasFeature, hasPermission }: FilterOptions
): NavigationItem[] => {
  return items.filter(item => {
    // Super admin bypass - can see everything
    if (isSuperAdmin && hasPermission('ui.admin.platform_settings')) {
      return true;
    }

    // Check if item URL is in allowed routes
    const isRouteAllowed = routes.some(route =>
      item.url === route || item.url.startsWith(route + '/')
    );

    // Check feature access
    const hasFeatureAccess = !item.featureKey || hasFeature(item.featureKey);

    // Demo orgs bypass feature gating but still require route allowance
    if (isDemoOrg) {
      return isRouteAllowed;
    }

    // Non-demo orgs require both route and feature access
    return isRouteAllowed && hasFeatureAccess;
  });
};
```

**Route Configuration (src/config/allowedRoutes.ts:36-46):**
```typescript
export function getAllowedRoutes({
  isDemoOrg,
  role
}: {
  isDemoOrg: boolean;
  role: Role;
}): string[] {
  if (isDemoOrg) return [...DEMO_REPORTING_ROUTES];
  if (role === 'VIEWER' || role === 'CLIENT') return [...DEMO_REPORTING_ROUTES];
  return [...DEMO_REPORTING_ROUTES, ...FULL_APP];
}
```

**Navigation Arrays (src/components/AppSidebar.tsx:46-65):**
```typescript
const analyticsItems: NavigationItem[] = [
  {
    title: "Executive Dashboard",
    url: "/dashboard/executive",
    icon: Home,
    featureKey: PLATFORM_FEATURES.EXECUTIVE_DASHBOARD,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics", 
    icon: BarChart3,
    featureKey: PLATFORM_FEATURES.ANALYTICS,
  },
  // ... more items
];
```

### Integration in Components

**AppSidebar Integration (src/components/AppSidebar.tsx:175-180):**
```typescript
const filterOptions = { isDemoOrg, isSuperAdmin, routes, hasFeature, hasPermission };

// Apply route filtering to all navigation sections
const filteredAnalyticsItems = filterNavigationByRoutes(analyticsItems, filterOptions);
const filteredAiToolsItems = filterNavigationByRoutes(aiToolsItems, filterOptions);
const filteredAiCopilotsItems = filterNavigationByRoutes(aiCopilotsItems, filterOptions);
const filteredControlCenterItems = filterNavigationByRoutes(controlCenterItems, filterOptions);
```

**Conditional Rendering (src/components/AppSidebar.tsx:258-272):**
```typescript
{filteredAnalyticsItems.length > 0 && (
  <SidebarGroup>
    <SidebarGroupLabel>Performance Intelligence</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {filteredAnalyticsItems.map(renderNavItem).filter(Boolean)}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)}
```

### Why This Works

- **Single Navigation Logic:** All navigation filtering uses same function and rules
- **Security Through Server Validation:** Routes validated against server-side permissions
- **Layered Access Control:** Route permissions + feature gating + super admin bypass
- **Demo Organization Support:** Special handling for demo orgs with feature bypass
- **Easy Extension:** New navigation sections automatically get same filtering logic

### Logic Flow

1. **Permission Resolution:** Get user role, demo status, feature access
2. **Route Calculation:** `getAllowedRoutes()` determines accessible routes
3. **Navigation Filtering:** Each navigation array filtered by `filterNavigationByRoutes()`
4. **UI Rendering:** Only filtered items displayed in sidebar

### Extension Points

**Adding New Navigation Section:**
```typescript
const newSectionItems: NavigationItem[] = [
  {
    title: "New Feature",
    url: "/new-feature",
    icon: NewIcon,
    featureKey: "NEW_FEATURE_ACCESS",
  }
];

// Automatic filtering with existing logic
const filteredNewSection = filterNavigationByRoutes(newSectionItems, filterOptions);
```

**Testing Coverage (src/utils/navigation.test.ts):**
- Route filtering for non-demo orgs
- Feature access gating
- Demo org bypass behavior  
- Super admin bypass functionality

---

## Pattern 4: Admin CRUD Operations

### Pattern Description

Standardized approach for admin operations with consistent authentication, authorization, error handling, and audit logging across all admin endpoints.

### Implementation

**Authentication Pattern (supabase/functions/admin-organizations/index.ts:21-27):**
```typescript
const { data: user } = await supabase.auth.getUser()
if (!user.user) throw new Error('Not authenticated')

const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
  user_id: user.user.id 
})
if (!isSuperAdmin) throw new Error('Super admin access required')
```

**CORS Headers Pattern:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

**Standard Response Format:**
```typescript
// Success Response
return new Response(JSON.stringify({
  success: true,
  data: organizations || [],
  meta: { total: organizations?.length || 0 }
}), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

// Error Response  
return new Response(JSON.stringify({
  error: error.message,
  timestamp: new Date().toISOString()
}), {
  status: 500,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

### CRUD Operations Pattern

**GET (List) Operation (admin-organizations/index.ts:29-44):**
```typescript
if (req.method === 'GET') {
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(JSON.stringify({
    success: true,
    data: organizations || [],
    meta: { total: organizations?.length || 0 }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

**POST (Create/Update/Delete) Pattern:**
```typescript
else if (req.method === 'POST') {
  const body = await req.json()
  
  if (body.action === 'update') {
    const { id, payload } = body
    if (!id || !payload) {
      throw new Error('Missing required fields: id, payload for update')
    }

    const { data: updatedOrg, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({
      success: true,
      data: updatedOrg,
      message: 'Organization updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
```

### Role Mapping Pattern (admin-users/index.ts:20-32)

**Frontend to Database Role Mapping:**
```typescript
function mapRoleToDBEnum(role: string): string {
  const roleMapping: Record<string, string> = {
    'super_admin': 'SUPER_ADMIN',
    'org_admin': 'ORGANIZATION_ADMIN', 
    'aso_manager': 'ASO_MANAGER',
    'analyst': 'ANALYST',
    'viewer': 'VIEWER',
    'client': 'CLIENT',
    'manager': 'MANAGER'
  }
  return roleMapping[role] || role.toUpperCase()
}
```

**Field Normalization:**
```typescript
function normalizeUserFields(payload: any) {
  return {
    ...payload,
    first_name: payload.first_name || payload.firstName,
    last_name: payload.last_name || payload.lastName,
    organization_id: payload.organization_id || payload.organizationId,
    roles: payload.roles || (payload.role ? [payload.role] : undefined)
  }
}
```

### Why This Works

- **Consistent Security:** All admin endpoints use same authentication check
- **Proper Authorization:** `is_super_admin` RPC function validates access
- **Standardized Responses:** Same response format across all endpoints
- **Comprehensive Error Handling:** Consistent error response structure
- **CORS Support:** Proper headers for browser requests
- **Audit Trail Support:** Actions can be logged consistently

### Frontend Integration

**Admin Pages Pattern (src/pages/admin/organizations.tsx:7-16):**
```typescript
const { isSuperAdmin, isLoading } = usePermissions();

useEffect(() => {
  if (!isLoading && !isSuperAdmin) {
    navigate('/dashboard');
  }
}, [isSuperAdmin, isLoading, navigate]);

if (!isSuperAdmin) {
  return null;
}
```

### Extension Strategy

**Adding New Admin Endpoint:**

1. **Create Function Structure:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Standard auth pattern
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')
    
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
      user_id: user.user.id 
    })
    if (!isSuperAdmin) throw new Error('Super admin access required')

    // Your CRUD operations here

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

2. **Add Frontend Page:**
```typescript
const NewAdminPage: React.FC = () => {
  const { isSuperAdmin, isLoading } = usePermissions();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (!isSuperAdmin) return null;

  return (
    <AdminLayout currentPage="new-feature">
      <YourNewComponent />
    </AdminLayout>
  );
};
```

### Verified Working Endpoints

**Production Admin Functions:**
- `admin-organizations` - Organization CRUD operations
- `admin-users` - User management with role assignment
- `admin-dashboard-metrics` - Platform health metrics
- `admin-recent-activity` - Activity feed
- `admin-health` - System health checks
- `admin-whoami` - Current user context

---

## Pattern Integration Guide

### Combining Patterns

**Example: Adding a New Admin-Configurable Feature**

1. **Database Configuration** (Pattern 2):
```sql
-- Add to organizations.settings JSONB
UPDATE organizations 
SET settings = settings || '{"new_feature_enabled": true}'::jsonb 
WHERE id = 'org_id';
```

2. **Permission Detection Hook** (Pattern 1):
```typescript
export const useNewFeatureDetection = () => {
  const { profile } = useUserProfile();
  const isEnabled = Boolean(profile?.organizations?.settings?.new_feature_enabled);
  return { isEnabled, loading: !profile };
};
```

3. **Navigation Integration** (Pattern 3):
```typescript
const newFeatureItems: NavigationItem[] = [
  {
    title: "New Feature",
    url: "/new-feature",
    icon: NewIcon,
    featureKey: "NEW_FEATURE_ACCESS",
  }
];

const filteredNewFeatureItems = filterNavigationByRoutes(newFeatureItems, filterOptions);
```

4. **Admin Management** (Pattern 4):
```typescript
// Admin endpoint to toggle feature
if (body.action === 'toggle_feature') {
  const { org_id, feature_enabled } = body;
  
  const { error } = await supabase
    .from('organizations')
    .update({ 
      settings: { new_feature_enabled: feature_enabled }
    })
    .eq('id', org_id);
}
```

### Pattern Dependencies

- **Pattern 1** depends on **Pattern 2** (database configuration)
- **Pattern 3** depends on **Pattern 1** (permission detection)  
- **Pattern 4** enables management of **Pattern 2** (configuration)

### Testing Strategy

**Each pattern includes:**
- Unit tests for core functions
- Integration tests for component usage
- End-to-end tests for user workflows
- Database tests for configuration changes

---

## Summary

These four patterns form the foundation of the Yodel ASO Insight architecture:

1. **Centralized Permission Detection** - Single source of truth for permission logic
2. **Database Configuration** - Flexible, admin-configurable behavior via JSONB
3. **Navigation Filtering** - Consistent access control across all navigation
4. **Admin CRUD Operations** - Standardized admin functionality with proper security

When adding new features, follow these patterns to ensure consistency, maintainability, and security. Each pattern has been proven in production and provides clear extension points for future development.

**Last Updated:** 2025-09-09  
**Pattern Coverage:** 100% of core architectural components analyzed and documented