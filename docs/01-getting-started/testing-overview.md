---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: Testing overview and philosophy
Audience: Developers
---

# Testing Overview

Testing strategy and philosophy for Yodel ASO Insight.

## Testing Philosophy

**Goals:**
- Prevent regressions during refactoring
- Document expected behavior through tests
- Enable confident code changes
- Catch bugs early in development cycle
- Maintain code quality standards

**Principles:**
- Write tests for all new features
- Maintain > 80% code coverage overall
- Test behavior, not implementation details
- Keep tests fast and isolated
- Make tests readable and maintainable

## Test Types

### 1. Unit Tests

**Purpose:** Test individual functions, utilities, and components in isolation

**Framework:** Vitest + React Testing Library

**Coverage Target:** 80%+

**Run Time:** < 10 seconds

**What to Test:**
- Pure utility functions
- React components (rendering, props, events)
- Custom hooks
- Data transformations
- Business logic

**See:** [unit-testing.md](./unit-testing.md) for detailed guide

### 2. Integration Tests

**Purpose:** Test feature workflows and component interactions

**Framework:** Vitest + React Testing Library

**Coverage:** Critical user flows

**Run Time:** < 30 seconds

**What to Test:**
- Multi-component workflows
- API integration with mocked responses
- State management across components
- Form submissions and validation
- Navigation flows

**See:** [integration-testing.md](./integration-testing.md) for detailed guide

### 3. E2E Tests

**Purpose:** Test full application workflows from user perspective

**Framework:** Playwright (recommended) or Cypress

**Coverage:** Happy paths + critical flows

**Run Time:** 2-5 minutes

**What to Test:**
- Complete user journeys
- Authentication flows
- Data loading and display
- Cross-page interactions
- Real API calls (against test environment)

**See:** [e2e-testing.md](./e2e-testing.md) for detailed guide

## Running Tests

### All Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run with coverage report
npm test -- --coverage
```

### Specific Tests

```bash
# Run single test file
npm test -- src/utils/format.test.ts

# Run tests matching pattern
npm test -- --grep "formatPercentage"

# Run tests for specific component
npm test -- src/components/AppSidebar.test.tsx
```

### Debug Mode

```bash
# Run tests with debugger
npm test -- --inspect-brk

# Run tests with UI (Vitest UI)
npm test -- --ui
```

## Test Structure

### Arrange-Act-Assert Pattern

```typescript
import { render, screen } from '@testing-library/react';
import { AppSidebar } from './AppSidebar';

describe('AppSidebar', () => {
  it('should render navigation links', () => {
    // Arrange: Set up test data and mocks
    const mockPermissions = {
      role: 'org_admin',
      isOrgAdmin: true
    };

    // Act: Perform the action being tested
    render(<AppSidebar permissions={mockPermissions} />);

    // Assert: Verify the expected outcome
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
```

### Test Naming

**Good:**
```typescript
it('should display error message when login fails', () => {});
it('should format percentage with 2 decimal places', () => {});
it('should redirect to dashboard after successful login', () => {});
```

**Bad:**
```typescript
it('works', () => {});
it('test login', () => {});
it('should call function', () => {});
```

### Test Organization

```typescript
describe('ComponentName or FunctionName', () => {
  // Group related tests
  describe('when user is authenticated', () => {
    it('should display user menu', () => {});
    it('should allow logout', () => {});
  });

  describe('when user is not authenticated', () => {
    it('should display login button', () => {});
    it('should redirect to login page', () => {});
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle null props', () => {});
    it('should handle empty array', () => {});
  });
});
```

## Coverage Requirements

| Type | Target | Priority |
|------|--------|----------|
| Overall | 80%+ | Required |
| Critical Features | 90%+ | Required |
| Utils/Helpers | 95%+ | Required |
| UI Components | 70%+ | Recommended |
| New Code | 90%+ | Required |

### Checking Coverage

```bash
# Generate coverage report
npm test -- --coverage

# View coverage in browser
npm test -- --coverage --ui

# Coverage reports saved to:
# coverage/index.html
```

### Coverage Exemptions

Some code is exempt from coverage requirements:
- Generated code (types, API clients)
- Configuration files
- Test utilities and mocks
- Deprecated code (marked for removal)

## CI/CD Integration

Tests run automatically on:

**Pre-commit Hook (if configured):**
- Run lint
- Run affected tests
- Run type checking

**Pull Request:**
- Run all tests
- Generate coverage report
- Block merge if tests fail
- Block merge if coverage < 80%

**Before Deployment:**
- Run all tests
- Run E2E tests
- Verify coverage requirements

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

### DO

✅ **Write tests for new features**
- Every new feature should have tests before merging

✅ **Test behavior, not implementation**
- Test what the component does, not how it does it

✅ **Keep tests isolated**
- Each test should be independent and not rely on other tests

✅ **Use descriptive test names**
- Test names should clearly describe what is being tested

✅ **Mock external dependencies**
- Mock Supabase, API calls, and external services

✅ **Test edge cases**
- Test null values, empty arrays, error states, etc.

### DON'T

❌ **Don't test implementation details**
- Avoid testing internal state or private methods

❌ **Don't write brittle tests**
- Avoid tests that break when unrelated code changes

❌ **Don't share state between tests**
- Each test should set up its own data

❌ **Don't skip tests**
- Fix or remove broken tests instead of skipping them

❌ **Don't test third-party libraries**
- Trust that React, Vitest, etc. work correctly

❌ **Don't make tests too complex**
- If a test is hard to write, the code may need refactoring

## Common Testing Patterns

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle button click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  await userEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Async Code

```typescript
import { waitFor } from '@testing-library/react';

it('should load data asynchronously', async () => {
  render(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
import { renderHook } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';

it('should return permissions', () => {
  const { result } = renderHook(() => usePermissions());

  expect(result.current.permissions).toBeDefined();
});
```

## Debugging Tests

### Failed Test

```bash
# Run single failing test with verbose output
npm test -- src/path/to/test.ts --reporter=verbose

# Run test with debugger
npm test -- --inspect-brk src/path/to/test.ts
```

### Slow Tests

```bash
# Find slow tests
npm test -- --reporter=verbose | grep "ms"

# Run tests with timeout increased
npm test -- --testTimeout=10000
```

### Flaky Tests

If a test fails intermittently:
1. Check for race conditions (async code)
2. Check for shared state between tests
3. Check for timing dependencies
4. Add `waitFor` for async operations
5. Isolate the test to run alone

## Next Steps

Now that you understand the testing philosophy, dive into specific guides:

1. **Unit Testing:** [unit-testing.md](./unit-testing.md) - Test functions, components, and hooks
2. **Integration Testing:** [integration-testing.md](./integration-testing.md) - Test feature workflows
3. **E2E Testing:** [e2e-testing.md](./e2e-testing.md) - Test complete user journeys

## Related Documentation

- **Development Guide:** [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)
- **Local Development:** [local-development.md](./local-development.md)
- **Architecture:** [ARCHITECTURE_V1.md](../02-architecture/ARCHITECTURE_V1.md)

---

**Next:** Start with [Unit Testing Guide](./unit-testing.md) →
