# Yodel ASO Insight - Development Guide

**Last Updated:** January 20, 2025
**For:** Developers extending the platform (patterns, best practices, advanced topics)
**Prerequisites:**
- Complete [docs/01-getting-started/quickstart.md](./docs/01-getting-started/quickstart.md) first
- Read [docs/02-architecture/ARCHITECTURE_V1.md](./docs/02-architecture/ARCHITECTURE_V1.md) for architecture

> **📖 What This Guide Covers**
>
> This guide focuses on **development patterns and best practices** for extending the platform.
>
> **For getting started:**
> - **Quick Start:** [docs/01-getting-started/quickstart.md](./docs/01-getting-started/quickstart.md)
> - **Installation:** [docs/01-getting-started/installation.md](./docs/01-getting-started/installation.md)
> - **Local Development:** [docs/01-getting-started/local-development.md](./docs/01-getting-started/local-development.md)
>
> **For architecture:**
> - **V1 Architecture:** [docs/02-architecture/ARCHITECTURE_V1.md](./docs/02-architecture/ARCHITECTURE_V1.md)
> - **Authorization:** [docs/02-architecture/system-design/authorization-v1.md](./docs/02-architecture/system-design/authorization-v1.md)
> - **Database Schema:** [docs/02-architecture/database/schema-reference.md](./docs/02-architecture/database/schema-reference.md)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Environment](#development-environment)
3. [Code Organization](#code-organization)
4. [Component Patterns](#component-patterns)
5. [Data Fetching Patterns](#data-fetching-patterns)
6. [Adding New Pages](#adding-new-pages)
7. [Database Changes](#database-changes)
8. [Testing](#testing)
9. [Common Pitfalls](#common-pitfalls)
10. [Best Practices](#best-practices)

---

## Quick Start

### Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd yodel-aso-insight
npm install

# 2. Environment setup
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Start development server
npm run dev

# 4. TypeScript type checking
npm run typecheck
```

### Essential Commands

```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run typecheck        # TypeScript validation
npm run lint             # ESLint (if configured)

# Supabase
supabase link            # Connect to remote project
supabase db push         # Apply migrations
supabase functions deploy # Deploy Edge Functions
```

---

## Development Environment

### Required Tools

- **Node.js:** 18+ (LTS recommended)
- **npm:** 9+ or yarn/pnpm
- **Supabase CLI:** Latest version
- **TypeScript:** 5.6+ (installed via npm)
- **VS Code:** Recommended (with extensions)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Environment Variables

**Frontend (.env):**

```bash
# Supabase
VITE_SUPABASE_URL=https://bkbcqocpjahewqjmlgvf.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Optional
VITE_ADMIN_DIAGNOSTICS_ENABLED=true
NODE_ENV=development
```

**Edge Functions (Supabase Dashboard → Edge Functions → Secrets):**

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
BIGQUERY_PROJECT_ID=yodel-mobile-app
BIGQUERY_DATASET=aso_reports
```

---

## Code Organization

### Directory Structure Philosophy

**Rule:** Place files closest to where they're used

```
src/
├── components/
│   ├── auth/           # Authentication-specific components
│   ├── ui/             # Generic UI primitives (shadcn/ui)
│   ├── analytics/      # Analytics/chart components
│   └── [feature]/      # Feature-specific components
├── context/            # App-wide state (React Context)
├── hooks/              # Reusable logic hooks
├── pages/              # Route components (one per route)
├── layouts/            # Page layouts
├── integrations/       # External service clients
└── lib/                # Utilities and helpers
```

### File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `usePermissions.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |
| Types | PascalCase with `.types.ts` | `User.types.ts` |

### Import Order

```typescript
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Internal components
import { UserProfile } from '@/components/UserProfile';

// 4. Hooks and context
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

// 5. Utilities and types
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/types';

// 6. Styles (if any)
import './styles.css';
```

---

## Component Patterns

### 1. Page Component Pattern

**Every page should follow this structure:**

```typescript
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/layouts';

export default function MyFeaturePage() {
  const { permissions, isLoading } = usePermissions();

  // ✅ STEP 1: Access Control
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!permissions?.isOrgAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // ✅ STEP 2: Audit Logging
  useEffect(() => {
    if (permissions?.organizationId) {
      supabase.rpc('log_audit_event', {
        p_user_id: permissions.userId,
        p_organization_id: permissions.organizationId,
        p_user_email: permissions.email,
        p_action: 'view_my_feature',
        p_resource_type: 'feature_page',
        p_status: 'success',
      }).catch(err => {
        // Non-blocking - don't fail page if logging fails
        console.error('Audit log failed:', err);
      });
    }
  }, [permissions?.organizationId]);

  // ✅ STEP 3: Feature Implementation
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <h1>My Feature</h1>
        {/* Your content */}
      </div>
    </MainLayout>
  );
}
```

### 2. Data Fetching Component Pattern

**Use TanStack Query for server state:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function DataComponent() {
  const { permissions } = usePermissions();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-data', permissions?.organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('organization_id', permissions.organizationId);

      if (error) throw error;
      return data;
    },
    enabled: !!permissions?.organizationId, // Only fetch when org is available
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### 3. Form Component Pattern

**Use React Hook Form + Zod:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
});

type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      // Submit to Supabase
      const { error } = await supabase
        .from('my_table')
        .insert(data);

      if (error) throw error;

      toast({ title: 'Success' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormControl>
              <Input {...field} />
            </FormControl>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### 4. Admin-Only Component Pattern

```typescript
import { usePermissions } from '@/hooks/usePermissions';

export function AdminFeature() {
  const { permissions } = usePermissions();

  // Hide completely for non-admins
  if (!permissions?.isOrgAdmin && !permissions?.isSuperAdmin) {
    return null;
  }

  return (
    <div>
      {/* Admin-only content */}
    </div>
  );
}
```

---

## Data Fetching Patterns

### Pattern 1: Direct Supabase Query (Simple Data)

**When to use:** Simple, single-table queries

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['organizations', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },
});
```

### Pattern 2: Edge Function Call (Complex Logic)

**When to use:** Multi-step logic, external API calls, BigQuery integration

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['analytics', orgId, dateRange],
  queryFn: async () => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/bigquery-aso-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: orgId,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
      }
    );

    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
});
```

### Pattern 3: Custom Hook (Reusable Logic)

**When to use:** Data fetching logic used in multiple components

```typescript
// hooks/useOrganizationApps.ts
export function useOrganizationApps(organizationId: string | null) {
  return useQuery({
    queryKey: ['org-apps', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_app_access')
        .select('app_id')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data.map(row => row.app_id);
    },
    enabled: !!organizationId,
  });
}

// Usage in component
function MyComponent() {
  const { permissions } = usePermissions();
  const { data: appIds, isLoading } = useOrganizationApps(
    permissions?.organizationId
  );
}
```

---

## Adding New Pages

### Step-by-Step Guide

#### 1. Create Page Component

```bash
# Create file
touch src/pages/MyNewFeature.tsx
```

```typescript
// src/pages/MyNewFeature.tsx
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/layouts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function MyNewFeature() {
  const { permissions, isLoading } = usePermissions();

  // Access control
  if (isLoading) return <div>Loading...</div>;
  if (!permissions?.isOrgAdmin) {
    return <Navigate to="/no-access" replace />;
  }

  // Audit logging
  useEffect(() => {
    if (permissions.organizationId) {
      supabase.rpc('log_audit_event', {
        p_user_id: permissions.userId,
        p_organization_id: permissions.organizationId,
        p_action: 'view_my_new_feature',
        p_resource_type: 'feature_page',
        p_status: 'success',
      }).catch(console.error);
    }
  }, [permissions.organizationId]);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My New Feature</h1>
          <p className="text-muted-foreground">
            {permissions.orgName}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feature Content</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your implementation */}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
```

#### 2. Add Route to App.tsx

```typescript
// Import at top
const MyNewFeature = lazy(() => import("./pages/MyNewFeature"));

// Add route in Routes section
<Route
  path="/my-new-feature"
  element={<ProtectedRoute><MyNewFeature /></ProtectedRoute>}
/>
```

#### 3. Add Navigation Link (Optional)

```typescript
// In your navigation component
import { Link } from 'react-router-dom';

<Link to="/my-new-feature" className="nav-link">
  My New Feature
</Link>
```

#### 4. Test

```bash
# TypeScript check
npm run typecheck

# Run dev server
npm run dev

# Navigate to http://localhost:5173/my-new-feature
```

**✅ Automatic Security Inheritance:**
- Session security (via SessionSecurityProvider)
- RLS (database level)
- MFA (if user has it)
- Encryption (infrastructure)
- Organization scoping (via usePermissions)

---

## Database Changes

### Creating a Migration

```bash
# Create new migration file
supabase migration new my_feature_table

# This creates: supabase/migrations/YYYYMMDDHHMMSS_my_feature_table.sql
```

### Migration Template

```sql
-- ============================================
-- Migration: Add My Feature Table
-- Date: 2025-11-09
-- Purpose: Store feature-specific data
-- ============================================

-- Create table
CREATE TABLE IF NOT EXISTS public.my_feature_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_my_feature_data_org
  ON public.my_feature_data(organization_id);

-- Enable RLS
ALTER TABLE public.my_feature_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "users_see_own_org_data"
  ON public.my_feature_data
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "users_insert_own_org_data"
  ON public.my_feature_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: my_feature_data table created';
END $$;
```

### Applying Migration

```bash
# Link to project (first time only)
supabase link --project-ref bkbcqocpjahewqjmlgvf

# Push migration to database
supabase db push

# Or specify database URL
supabase migration up --db-url "postgresql://..."
```

### RLS Policy Checklist

**Every table MUST have:**

- [ ] RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] SELECT policy (read access)
- [ ] INSERT policy (create access)
- [ ] UPDATE policy (modify access, if needed)
- [ ] DELETE policy (remove access, if needed)
- [ ] Organization scoping (via `user_roles` join)
- [ ] Super admin override (OR condition)

---

## Testing

### Manual Testing Checklist

**For every new page:**

- [ ] TypeScript compiles without errors
- [ ] Page loads without console errors
- [ ] Access control works (non-admin redirected)
- [ ] Audit log created (check audit_logs table)
- [ ] RLS policies work (user can only see own org data)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Responsive design (mobile, tablet, desktop)

### Testing Access Control

```typescript
// Test different user roles
const testUsers = {
  superAdmin: { id: '...', role: 'super_admin' },
  orgAdmin: { id: '...', role: 'org_admin' },
  viewer: { id: '...', role: 'viewer' },
  noRole: { id: '...', role: null },
};

// Test each role:
// 1. Login as user
// 2. Navigate to page
// 3. Verify expected behavior (access/no access)
```

### Testing RLS Policies

```sql
-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';

-- Should only see own organization
SELECT * FROM my_feature_data;

-- Reset
RESET ROLE;
```

---

## Common Pitfalls

### 1. ❌ Using Wrong Column Names

**Problem:**

```typescript
// Frontend expects organizationId, not org_id
const orgId = permissions.org_id; // ❌ Wrong
```

**Solution:**

```typescript
// Use the correct field name
const orgId = permissions.organizationId; // ✅ Correct
```

**Why:** `user_permissions_unified` view exposes `org_id` but hook renames to `organizationId`

### 2. ❌ Forgetting to Check Loading State

**Problem:**

```typescript
function MyComponent() {
  const { permissions } = usePermissions();
  // permissions is null during loading!
  const orgId = permissions.organizationId; // ❌ Crash
}
```

**Solution:**

```typescript
function MyComponent() {
  const { permissions, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!permissions) return <Error />;

  const orgId = permissions.organizationId; // ✅ Safe
}
```

### 3. ❌ Forgetting RLS Policies

**Problem:**

```sql
-- Created table but forgot RLS
CREATE TABLE my_table (...);
-- Users can see all data! ❌
```

**Solution:**

```sql
-- Always enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_scoped" ON my_table
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  ));
```

### 4. ❌ Blocking Page Load on Audit Log Failure

**Problem:**

```typescript
// Page fails if audit logging fails
await supabase.rpc('log_audit_event', {...}); // ❌ Blocks
```

**Solution:**

```typescript
// Non-blocking audit logging
supabase.rpc('log_audit_event', {...})
  .catch(err => console.error('Audit failed:', err)); // ✅ Non-blocking
```

### 5. ❌ Using Demo/Test Data in Production Tables

**Problem:**

```sql
-- Mixing demo apps with real apps
INSERT INTO org_app_access (organization_id, app_id)
VALUES ('real-org', 'DEMO_APP_1'); -- ❌ Confusion
```

**Solution:**

```sql
-- Only insert real production app IDs
INSERT INTO org_app_access (organization_id, app_id)
VALUES ('real-org', 'real-app-id'); -- ✅ Clean data
```

---

## Best Practices

### 1. Always Use TypeScript

```typescript
// ✅ Define types for clarity
interface MyFeatureProps {
  userId: string;
  onSuccess: () => void;
}

export function MyFeature({ userId, onSuccess }: MyFeatureProps) {
  // Implementation
}
```

### 2. Co-locate Related Code

```
src/pages/MyFeature/
├── index.tsx           # Main page component
├── components/         # Feature-specific components
│   ├── FeatureCard.tsx
│   └── FeatureTable.tsx
├── hooks/              # Feature-specific hooks
│   └── useFeatureData.ts
└── types.ts            # Feature-specific types
```

### 3. Use Semantic Component Names

```typescript
// ❌ Vague names
<Box />
<Container />
<Thing />

// ✅ Clear names
<UserProfileCard />
<OrganizationSettingsPanel />
<AnalyticsDashboard />
```

### 4. Document Complex Logic

```typescript
/**
 * Calculates conversion rate with traffic source weighting
 *
 * @param downloads - Total downloads
 * @param impressions - Total impressions
 * @param trafficSources - Breakdown by source
 * @returns Weighted conversion rate (0-100)
 *
 * @example
 * const rate = calculateConversionRate(1000, 10000, [...]);
 * // => 10.5
 */
export function calculateConversionRate(...) {
  // Implementation
}
```

### 5. Handle All States

```typescript
function DataComponent() {
  const { data, isLoading, error } = useQuery(...);

  // ✅ Handle all states
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data || data.length === 0) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### 6. Use Consistent Error Handling

```typescript
try {
  const { data, error } = await supabase.from('table').select();

  if (error) throw error; // ✅ Consistent

  return data;
} catch (err) {
  console.error('Failed to fetch:', err);
  toast({ title: 'Error', description: err.message });
  throw err; // Re-throw for React Query
}
```

### 7. Leverage TanStack Query Features

```typescript
const { data, isLoading, refetch } = useQuery({
  queryKey: ['my-data', orgId],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000,     // Cache for 5 minutes
  cacheTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
  retry: 3,                      // Retry failed requests 3 times
  enabled: !!orgId,              // Only fetch when orgId exists
});

// Invalidate cache when data changes
const mutation = useMutation({
  mutationFn: updateData,
  onSuccess: () => {
    queryClient.invalidateQueries(['my-data']); // ✅ Refetch
  },
});
```

### 8. Use Consistent Styling

```typescript
// ✅ Use Tailwind utility classes
<div className="container mx-auto p-6 space-y-6">
  <Card className="bg-zinc-900 border-zinc-800">
    <CardHeader>
      <CardTitle className="text-foreground">Title</CardTitle>
    </CardHeader>
  </Card>
</div>

// ❌ Avoid inline styles
<div style={{ padding: '24px', margin: '0 auto' }}>
```

---

## Performance Optimization

### 1. Lazy Load Heavy Components

```typescript
// App.tsx
const HeavyFeature = lazy(() => import('./pages/HeavyFeature'));

<Suspense fallback={<LoadingSpinner />}>
  <Route path="/heavy" element={<HeavyFeature />} />
</Suspense>
```

### 2. Memoize Expensive Calculations

```typescript
import { useMemo } from 'react';

function AnalyticsComponent({ data }) {
  const aggregatedData = useMemo(() => {
    // Expensive calculation
    return data.reduce((acc, item) => {
      // Complex aggregation logic
      return acc;
    }, {});
  }, [data]); // Only recalculate when data changes

  return <Chart data={aggregatedData} />;
}
```

### 3. Virtualize Long Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function LongList({ items }) {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index}>
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Debugging Tips

### 1. Enable Detailed Logging

```typescript
// Add to components for debugging
console.log('🔍 [DEBUG] Component rendered', {
  permissions,
  isLoading,
  data
});
```

### 2. Check Network Tab

- **Supabase queries:** Look for `rest/v1` endpoints
- **Edge Functions:** Look for `functions/v1` endpoints
- **Check response status and payload**

### 3. Inspect RLS Policies

```sql
-- Check which policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Check policy definition
SELECT pg_get_expr(polqual, polrelid) as policy_expression
FROM pg_policy
WHERE polname = 'my_policy_name';
```

### 4. Test Edge Functions Locally

```bash
# Serve functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

## Quick Reference

### Essential Hooks

```typescript
usePermissions()          // User permissions and org
useEnterpriseAnalytics()  // Dashboard V2 data
useQuery()                // TanStack Query data fetching
useMutation()             // TanStack Query mutations
useNavigate()             // React Router navigation
```

### Essential Components

```typescript
<MainLayout>              // Page layout
<ProtectedRoute>          // Auth-gated routes
<Card>                    // Container component
<Button>                  // Button component
<Form>                    // Form wrapper
```

### Common Supabase Queries

```typescript
// Select with filter
const { data } = await supabase
  .from('table')
  .select('*')
  .eq('organization_id', orgId);

// Insert
const { error } = await supabase
  .from('table')
  .insert({ name: 'value' });

// Update
const { error } = await supabase
  .from('table')
  .update({ name: 'new value' })
  .eq('id', rowId);

// Delete
const { error } = await supabase
  .from('table')
  .delete()
  .eq('id', rowId);

// RPC (stored procedure)
const { data } = await supabase.rpc('function_name', {
  param1: 'value'
});
```

---

## Getting Help

### Documentation Links

- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs
- **Supabase:** https://supabase.com/docs
- **TanStack Query:** https://tanstack.com/query/latest/docs/react
- **shadcn/ui:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs

### Internal Documentation

- `CURRENT_ARCHITECTURE.md` - System architecture
- `PHASE2_COMPLETE_SUMMARY.md` - Security implementation
- `ENCRYPTION_STATUS.md` - Encryption compliance

---

**Happy coding! 🚀**

For questions or clarifications, review `CURRENT_ARCHITECTURE.md` first.
