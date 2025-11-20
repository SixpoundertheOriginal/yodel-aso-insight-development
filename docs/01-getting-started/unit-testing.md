---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Unit testing guide with Vitest and React Testing Library
Audience: Developers
---

# Unit Testing Guide

Complete guide to writing unit tests for Yodel ASO Insight using Vitest and React Testing Library.

## Table of Contents

1. [Setup](#setup)
2. [Testing React Components](#testing-react-components)
3. [Testing Utility Functions](#testing-utility-functions)
4. [Testing Custom Hooks](#testing-custom-hooks)
5. [Mocking](#mocking)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)

## Setup

### Test Framework

**Vitest:** Fast unit test framework (Vite-native)
**React Testing Library:** React component testing utilities

### Configuration

Tests are configured in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

### Test Setup File

Create `src/test/setup.ts` for global test configuration:

```typescript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with React Testing Library matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

## Testing React Components

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should have correct variant class', () => {
    render(<Button variant="primary">Submit</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Testing Component with Props

```typescript
import { render, screen } from '@testing-library/react';
import { DashboardStatsCard } from './DashboardStatsCard';

describe('DashboardStatsCard', () => {
  const defaultProps = {
    title: 'Total Downloads',
    value: 1234,
    delta: 5.2,
    icon: 'download'
  };

  it('should render title and value', () => {
    render(<DashboardStatsCard {...defaultProps} />);

    expect(screen.getByText('Total Downloads')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('should display positive delta with green color', () => {
    render(<DashboardStatsCard {...defaultProps} />);

    const delta = screen.getByText('+5.2%');
    expect(delta).toHaveClass('text-green-600');
  });

  it('should display negative delta with red color', () => {
    render(<DashboardStatsCard {...defaultProps} delta={-3.5} />);

    const delta = screen.getByText('-3.5%');
    expect(delta).toHaveClass('text-red-600');
  });

  it('should handle zero delta', () => {
    render(<DashboardStatsCard {...defaultProps} delta={0} />);

    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should call onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    // Fill in form fields
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    // Verify callback was called with correct data
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should display error message on failed submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
```

### Testing Component with Context

```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  // Create wrapper with providers
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it('should render user name', () => {
    const mockUser = { name: 'John Doe', email: 'john@example.com' };

    render(<UserProfile user={mockUser} />, { wrapper: createWrapper() });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## Testing Utility Functions

### Pure Functions

```typescript
import { describe, it, expect } from 'vitest';
import { formatPercentage, formatNumber } from './format';

describe('formatPercentage', () => {
  it('should format percentage with 2 decimal places', () => {
    expect(formatPercentage(0.1234)).toBe('12.34%');
    expect(formatPercentage(0.5)).toBe('50.00%');
    expect(formatPercentage(1)).toBe('100.00%');
  });

  it('should handle negative percentages', () => {
    expect(formatPercentage(-0.15)).toBe('-15.00%');
  });

  it('should handle zero', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });

  it('should handle null and undefined', () => {
    expect(formatPercentage(null)).toBe('0.00%');
    expect(formatPercentage(undefined)).toBe('0.00%');
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousands separator', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should handle decimal numbers', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
```

### Data Transformations

```typescript
import { describe, it, expect } from 'vitest';
import { transformBigQueryToAsoData } from './transforms';

describe('transformBigQueryToAsoData', () => {
  it('should transform BigQuery rows to ASO data format', () => {
    const input = [
      {
        date: '2025-01-01',
        app_id: 'Mixbook',
        traffic_source: 'App Store Search',
        impressions: 1000,
        downloads: 100,
        product_page_views: 500,
        conversion_rate: 0.2
      }
    ];

    const result = transformBigQueryToAsoData(input);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('timeseriesData');
    expect(result).toHaveProperty('trafficSources');
    expect(result.summary.impressions.value).toBe(1000);
    expect(result.summary.downloads.value).toBe(100);
  });

  it('should handle empty input array', () => {
    const result = transformBigQueryToAsoData([]);

    expect(result.summary.impressions.value).toBe(0);
    expect(result.timeseriesData).toEqual([]);
  });

  it('should aggregate data by date', () => {
    const input = [
      { date: '2025-01-01', impressions: 100, downloads: 10 },
      { date: '2025-01-01', impressions: 200, downloads: 20 },
      { date: '2025-01-02', impressions: 300, downloads: 30 }
    ];

    const result = transformBigQueryToAsoData(input);

    expect(result.timeseriesData).toHaveLength(2);
    expect(result.timeseriesData[0].impressions).toBe(300); // 100 + 200
    expect(result.timeseriesData[0].downloads).toBe(30); // 10 + 20
  });
});
```

## Testing Custom Hooks

### Basic Hook Test

```typescript
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter(0));

    expect(result.current.count).toBe(0);
  });

  it('should increment count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

### Hook with Dependencies

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { usePermissions } from './usePermissions';

describe('usePermissions', () => {
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

  it('should load permissions', async () => {
    const mockUser = { id: 'user-123' };

    const { result } = renderHook(
      () => usePermissions(mockUser),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions).toBeDefined();
  });
});
```

## Mocking

### Mocking Supabase

```typescript
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: '123', name: 'Test Org' },
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })),
    },
  },
}));
```

### Mocking usePermissions Hook

```typescript
import { vi } from 'vitest';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    permissions: {
      userId: 'user-123',
      organizationId: 'org-123',
      role: 'org_admin',
      isSuperAdmin: false,
      isOrgAdmin: true,
    },
    isLoading: false,
  })),
}));
```

### Mocking API Calls

```typescript
import { vi } from 'vitest';

global.fetch = vi.fn((url) => {
  if (url.includes('/api/users')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ])
    });
  }

  return Promise.reject(new Error('Not found'));
});
```

## Best Practices

### DO

✅ **Test behavior, not implementation**
```typescript
// Good: Test what happens
it('should display error message when email is invalid', () => {
  // ...
});

// Bad: Test how it happens
it('should call validateEmail function', () => {
  // ...
});
```

✅ **Use descriptive test names**
```typescript
// Good
it('should redirect to dashboard after successful login', () => {});

// Bad
it('works', () => {});
```

✅ **Arrange-Act-Assert pattern**
```typescript
it('should increment counter', () => {
  // Arrange
  const { result } = renderHook(() => useCounter(0));

  // Act
  act(() => result.current.increment());

  // Assert
  expect(result.current.count).toBe(1);
});
```

✅ **Test edge cases**
```typescript
describe('formatPercentage', () => {
  it('should handle zero', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });

  it('should handle null', () => {
    expect(formatPercentage(null)).toBe('0.00%');
  });

  it('should handle very large numbers', () => {
    expect(formatPercentage(999999)).toBe('99,999,900.00%');
  });
});
```

### DON'T

❌ **Don't test implementation details**
```typescript
// Bad: Testing internal state
it('should set isLoading to true', () => {
  expect(component.state.isLoading).toBe(true);
});

// Good: Test visible behavior
it('should display loading spinner', () => {
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

❌ **Don't share state between tests**
```typescript
// Bad: Shared state
let user;
beforeAll(() => {
  user = { name: 'Test' };
});

// Good: Isolated state
beforeEach(() => {
  const user = { name: 'Test' };
});
```

## Common Patterns

### Testing Async Components

```typescript
import { render, screen, waitFor } from '@testing-library/react';

it('should load and display data', async () => {
  render(<DataComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Testing Error States

```typescript
it('should display error message on API failure', async () => {
  // Mock failed API call
  vi.spyOn(global, 'fetch').mockRejectedValueOnce(
    new Error('API Error')
  );

  render(<DataComponent />);

  expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
});
```

### Testing Conditional Rendering

```typescript
it('should render admin menu for admin users', () => {
  const permissions = { isOrgAdmin: true };
  render(<Navigation permissions={permissions} />);

  expect(screen.getByText('Admin')).toBeInTheDocument();
});

it('should not render admin menu for regular users', () => {
  const permissions = { isOrgAdmin: false };
  render(<Navigation permissions={permissions} />);

  expect(screen.queryByText('Admin')).not.toBeInTheDocument();
});
```

## Running Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific file
npm test -- src/utils/format.test.ts

# Run with coverage
npm test -- --coverage

# Run in UI mode
npm test -- --ui
```

## Next Steps

- **Integration Testing:** [integration-testing.md](./integration-testing.md)
- **E2E Testing:** [e2e-testing.md](./e2e-testing.md)
- **Testing Overview:** [testing-overview.md](./testing-overview.md)

---

**Related:** [Local Development](./local-development.md) | [Development Guide](../../DEVELOPMENT_GUIDE.md)
