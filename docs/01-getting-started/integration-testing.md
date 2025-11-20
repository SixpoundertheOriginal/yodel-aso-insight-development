---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Integration testing guide for feature workflows
Audience: Developers
---

# Integration Testing Guide

Guide to writing integration tests for multi-component workflows and feature interactions in Yodel ASO Insight.

## Table of Contents

1. [Overview](#overview)
2. [When to Write Integration Tests](#when-to-write-integration-tests)
3. [Setup](#setup)
4. [Testing Multi-Component Workflows](#testing-multi-component-workflows)
5. [Testing API Integration](#testing-api-integration)
6. [Testing State Management](#testing-state-management)
7. [Best Practices](#best-practices)

## Overview

**Integration tests** verify that multiple components work together correctly to implement a feature or user workflow.

**Differences from Unit Tests:**
- Test multiple components together
- Test feature workflows end-to-end
- May involve real or mocked API calls
- Longer execution time (but still < 30 seconds)

**Differences from E2E Tests:**
- Run in test environment (not real browser)
- Mock external dependencies (APIs, database)
- Faster than E2E tests
- Focus on feature logic, not browser interactions

## When to Write Integration Tests

Write integration tests for:

✅ **Multi-Component Workflows**
- User completes login flow → navigates to dashboard
- User selects apps → dashboard loads BigQuery data → charts render

✅ **Form Submissions**
- User fills form → validation runs → API call → success message

✅ **Navigation Flows**
- User navigates between pages → state preserved → correct data shown

✅ **State Management**
- Action dispatched → state updated → components re-render correctly

✅ **API Integration**
- Component fetches data → loading state → data displayed

## Setup

### Test Environment

Integration tests use the same setup as unit tests:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### Test Helpers

Create helper functions for common integration test patterns:

```typescript
// src/test/helpers.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialRoute = '/',
    ...renderOptions
  } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  window.history.pushState({}, 'Test page', initialRoute);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
```

## Testing Multi-Component Workflows

### Login Flow

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { renderWithProviders } from '@/test/helpers';

describe('Login Flow', () => {
  it('should login and redirect to dashboard', async () => {
    const user = userEvent.setup();

    // Mock successful login
    const mockLogin = vi.fn().mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      session: { access_token: 'token-123' }
    });

    renderWithProviders(<LoginPage onLogin={mockLogin} />);

    // Fill login form
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    // Wait for redirect to dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Verify login was called
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should show error message on failed login', async () => {
    const user = userEvent.setup();

    // Mock failed login
    const mockLogin = vi.fn().mockRejectedValue(
      new Error('Invalid credentials')
    );

    renderWithProviders(<LoginPage onLogin={mockLogin} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    // Error message should appear
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();

    // Should still be on login page
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
  });
});
```

### Dashboard Data Loading Flow

```typescript
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardV2 } from '@/pages/DashboardV2';
import { renderWithProviders } from '@/test/helpers';

describe('Dashboard V2 Data Loading Flow', () => {
  beforeEach(() => {
    // Mock BigQuery Edge Function
    global.fetch = vi.fn((url) => {
      if (url.includes('/functions/v1/bigquery-aso-data')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              {
                date: '2025-01-01',
                app_id: 'Mixbook',
                traffic_source: 'App Store Search',
                impressions: 1000,
                downloads: 100,
                product_page_views: 500
              }
            ],
            meta: {
              row_count: 1,
              query_duration_ms: 250
            }
          })
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('should load dashboard data and render charts', async () => {
    const mockPermissions = {
      organizationId: 'org-123',
      role: 'org_admin',
      isOrgAdmin: true
    };

    renderWithProviders(
      <DashboardV2 permissions={mockPermissions} />
    );

    // Loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Verify charts are rendered
    expect(screen.getByText('Impressions')).toBeInTheDocument();
    expect(screen.getByText('Downloads')).toBeInTheDocument();

    // Verify data is displayed
    expect(screen.getByText('1,000')).toBeInTheDocument(); // impressions
    expect(screen.getByText('100')).toBeInTheDocument(); // downloads
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed API call
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    const mockPermissions = {
      organizationId: 'org-123',
      role: 'org_admin'
    };

    renderWithProviders(
      <DashboardV2 permissions={mockPermissions} />
    );

    // Error message should appear
    expect(await screen.findByText(/Failed to load data/i)).toBeInTheDocument();
  });
});
```

## Testing API Integration

### Mocking API Responses

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Create MSW server for API mocking
const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'User 1', email: 'user1@example.com' },
        { id: '2', name: 'User 2', email: 'user2@example.com' }
      ])
    );
  }),

  rest.post('/api/users', async (req, res, ctx) => {
    const { name, email } = await req.json();
    return res(
      ctx.json({ id: '3', name, email })
    );
  })
);

// Start server before tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

describe('User Management API Integration', () => {
  it('should fetch and display users', async () => {
    renderWithProviders(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
    });
  });

  it('should create new user', async () => {
    const user = userEvent.setup();

    renderWithProviders(<UserForm />);

    await user.type(screen.getByLabelText('Name'), 'New User');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('User created successfully')).toBeInTheDocument();
  });
});
```

### Testing with Real Supabase Mocks

```typescript
import { createClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn((table) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({
        data: [
          { id: '1', organization_id: 'org-123', role: 'org_admin' }
        ],
        error: null
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'user-123' } },
      error: null
    })),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));
```

## Testing State Management

### Testing React Query State

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useBigQueryData } from '@/hooks/useBigQueryData';

describe('BigQuery Data State Management', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it('should fetch and cache BigQuery data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      data: [{ date: '2025-01-01', impressions: 1000 }],
      meta: { row_count: 1 }
    });

    const { result } = renderHook(
      () => useBigQueryData('org-123', { from: '2025-01-01', to: '2025-01-31' }),
      { wrapper: createWrapper() }
    );

    // Initial loading state
    expect(result.current.loading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Data should be available
    expect(result.current.data).toBeDefined();
    expect(result.current.data.summary.impressions.value).toBe(1000);
  });
});
```

## Testing Navigation Flows

```typescript
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { App } from '@/App';
import { renderWithProviders } from '@/test/helpers';

describe('Navigation Flow', () => {
  it('should navigate from dashboard to admin panel', async () => {
    const user = userEvent.setup();

    const mockPermissions = {
      role: 'org_admin',
      isOrgAdmin: true
    };

    renderWithProviders(<App permissions={mockPermissions} />);

    // Start on dashboard
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Navigate to admin panel
    await user.click(screen.getByText('Admin'));

    // Should be on admin page
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
  });

  it('should preserve state when navigating back', async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    // Select date range on dashboard
    await user.click(screen.getByText('Last 30 Days'));
    await user.click(screen.getByText('Last 7 Days'));

    // Navigate away
    await user.click(screen.getByText('Settings'));

    // Navigate back
    await user.click(screen.getByText('Dashboard'));

    // State should be preserved
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
  });
});
```

## Best Practices

### DO

✅ **Test complete user workflows**
```typescript
it('should complete user creation workflow', async () => {
  // 1. Navigate to user management
  // 2. Click "Add User"
  // 3. Fill form
  // 4. Submit
  // 5. Verify user appears in list
});
```

✅ **Mock external dependencies**
```typescript
// Mock API calls, not internal functions
vi.mock('@/integrations/supabase/client');
```

✅ **Test error scenarios**
```typescript
it('should handle network errors gracefully', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
  // Test error handling
});
```

✅ **Use realistic test data**
```typescript
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'org_admin',
  organization_id: 'org-123'
};
```

### DON'T

❌ **Don't test everything in integration tests**
```typescript
// Bad: Testing simple util function
it('should format percentage correctly', () => {
  // This should be a unit test
});
```

❌ **Don't make tests too long**
```typescript
// Bad: Testing too many workflows in one test
it('should do everything', async () => {
  // 50 lines of test code...
  // Split into multiple focused tests
});
```

❌ **Don't rely on test order**
```typescript
// Bad: Test B depends on Test A
it('test A: creates user', () => {});
it('test B: updates user created in test A', () => {});
```

## Running Integration Tests

```bash
# Run all integration tests
npm test -- integration

# Run specific integration test file
npm test -- src/__tests__/dashboard-flow.test.tsx

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Debugging Integration Tests

### Debug Failed Tests

```bash
# Run single failing test
npm test -- src/__tests__/login-flow.test.tsx

# Run with verbose output
npm test -- --reporter=verbose

# Debug in VS Code
# Set breakpoint and press F5
```

### Common Issues

**Issue: "Cannot find element"**
```typescript
// Bad: Not waiting for async operation
expect(screen.getByText('Data')).toBeInTheDocument();

// Good: Wait for async operation
expect(await screen.findByText('Data')).toBeInTheDocument();
```

**Issue: "Act warning"**
```typescript
// Bad: Not wrapping state update
result.current.increment();

// Good: Wrap in act()
act(() => {
  result.current.increment();
});
```

## Next Steps

- **E2E Testing:** [e2e-testing.md](./e2e-testing.md) - Test complete user journeys
- **Unit Testing:** [unit-testing.md](./unit-testing.md) - Test individual functions
- **Testing Overview:** [testing-overview.md](./testing-overview.md) - Testing philosophy

---

**Related:** [Local Development](./local-development.md) | [Development Guide](../../DEVELOPMENT_GUIDE.md)
