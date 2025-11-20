---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-20
Purpose: End-to-end testing guide with Playwright
Audience: Developers, QA Engineers
---

# End-to-End Testing Guide

Complete guide to writing E2E tests for Yodel ASO Insight using Playwright.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Writing E2E Tests](#writing-e2e-tests)
4. [Testing Patterns](#testing-patterns)
5. [Best Practices](#best-practices)
6. [Running Tests](#running-tests)
7. [CI/CD Integration](#cicd-integration)

## Overview

**End-to-End (E2E) tests** verify that the complete application works correctly from the user's perspective by simulating real user interactions in a real browser.

**When to use E2E tests:**
- Critical user journeys (login, dashboard viewing, data export)
- Cross-page workflows
- Complex user interactions
- Real API integration testing
- Browser-specific behavior

**When NOT to use E2E tests:**
- Simple component logic (use unit tests)
- Utility functions (use unit tests)
- Edge cases (use unit tests)
- Isolated component behavior (use integration tests)

## Setup

### Install Playwright

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Project Structure

```
e2e/
├── auth/
│   ├── login.spec.ts
│   └── logout.spec.ts
├── dashboard/
│   ├── dashboard-view.spec.ts
│   └── app-selection.spec.ts
├── fixtures/
│   ├── test-users.ts
│   └── test-data.ts
└── helpers/
    ├── auth.ts
    └── navigation.ts
```

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load dashboard and display data', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard-v2');

    // Wait for data to load
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Verify dashboard content
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="impressions-card"]')).toBeVisible();
  });
});
```

### Login Flow Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/dashboard-v2');

    // Verify logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error message should appear
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');

    // Should still be on login page
    expect(page.url()).toContain('/login');
  });
});
```

### Dashboard Data Loading Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard V2', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard-v2');
  });

  test('should load BigQuery data and display charts', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Verify KPI cards are visible
    await expect(page.locator('[data-testid="impressions-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="downloads-card"]')).toBeVisible();

    // Verify charts are rendered
    await expect(page.locator('[data-testid="impressions-chart"]')).toBeVisible();

    // Verify data is displayed
    const impressions = await page.locator('[data-testid="impressions-value"]').textContent();
    expect(impressions).toMatch(/\d+/); // Should contain numbers
  });

  test('should filter data by app selection', async ({ page }) => {
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Get initial impressions value
    const initialImpressions = await page.locator('[data-testid="impressions-value"]').textContent();

    // Select different app
    await page.click('[data-testid="app-selector"]');
    await page.click('[data-testid="app-option-mixbook"]');

    // Wait for data to reload
    await page.waitForSelector('[data-testid="loading-spinner"]');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Verify impressions changed
    const newImpressions = await page.locator('[data-testid="impressions-value"]').textContent();
    expect(newImpressions).not.toBe(initialImpressions);
  });
});
```

## Testing Patterns

### Reusable Authentication Helper

```typescript
// e2e/helpers/auth.ts
import { Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard-v2');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login');
}

// Use in tests
import { login } from './helpers/auth';

test('should access admin panel', async ({ page }) => {
  await login(page, 'admin@example.com', 'password123');
  // Continue with test...
});
```

### Page Object Model

```typescript
// e2e/pages/DashboardPage.ts
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly impressionsCard: Locator;
  readonly downloadsCard: Locator;
  readonly appSelector: Locator;
  readonly dateRangePicker: Locator;

  constructor(page: Page) {
    this.page = page;
    this.impressionsCard = page.locator('[data-testid="impressions-card"]');
    this.downloadsCard = page.locator('[data-testid="downloads-card"]');
    this.appSelector = page.locator('[data-testid="app-selector"]');
    this.dateRangePicker = page.locator('[data-testid="date-range-picker"]');
  }

  async goto() {
    await this.page.goto('/dashboard-v2');
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-testid="dashboard-loaded"]');
  }

  async getImpressionsValue() {
    return await this.impressionsCard.locator('.value').textContent();
  }

  async selectApp(appName: string) {
    await this.appSelector.click();
    await this.page.click(`[data-testid="app-option-${appName}"]`);
    await this.waitForLoad();
  }

  async selectDateRange(range: string) {
    await this.dateRangePicker.click();
    await this.page.click(`[data-testid="date-range-${range}"]`);
    await this.waitForLoad();
  }
}

// Use in tests
import { DashboardPage } from './pages/DashboardPage';

test('should update dashboard when app changes', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  const initialValue = await dashboard.getImpressionsValue();
  await dashboard.selectApp('mixbook');
  const newValue = await dashboard.getImpressionsValue();

  expect(newValue).not.toBe(initialValue);
});
```

### Testing with API Mocking

```typescript
import { test, expect } from '@playwright/test';

test('should handle API errors gracefully', async ({ page }) => {
  // Mock API to return error
  await page.route('**/functions/v1/bigquery-aso-data', (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  });

  await page.goto('/dashboard-v2');

  // Error message should be displayed
  await expect(page.locator('.error-message')).toContainText('Failed to load data');
});
```

### Testing Navigation

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/dashboard-v2');

  // Navigate to admin panel
  await page.click('[data-testid="nav-admin"]');
  await page.waitForURL('/admin');
  await expect(page.locator('h1')).toContainText('Admin Panel');

  // Navigate back to dashboard
  await page.click('[data-testid="nav-dashboard"]');
  await page.waitForURL('/dashboard-v2');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

## Best Practices

### DO

✅ **Use data-testid attributes**
```typescript
// In component
<button data-testid="login-button">Login</button>

// In test
await page.click('[data-testid="login-button"]');
```

✅ **Wait for elements before interacting**
```typescript
// Good
await page.waitForSelector('[data-testid="submit-button"]');
await page.click('[data-testid="submit-button"]');

// Bad: May fail if element not ready
await page.click('[data-testid="submit-button"]');
```

✅ **Test critical user journeys**
```typescript
test('complete checkout flow', async ({ page }) => {
  await login(page);
  await selectProduct(page);
  await addToCart(page);
  await checkout(page);
  await verifyOrderConfirmation(page);
});
```

✅ **Use realistic test data**
```typescript
const testUser = {
  email: 'test.user@example.com',
  password: 'SecurePassword123!',
  name: 'Test User'
};
```

✅ **Take screenshots on failure**
```typescript
test('dashboard test', async ({ page }) => {
  try {
    // Test code...
  } catch (error) {
    await page.screenshot({ path: 'test-failed.png' });
    throw error;
  }
});
```

### DON'T

❌ **Don't use brittle selectors**
```typescript
// Bad: Breaks if HTML structure changes
await page.click('div > div > button:nth-child(3)');

// Good: Uses semantic selector
await page.click('[data-testid="submit-button"]');
```

❌ **Don't test every edge case in E2E**
```typescript
// Bad: Testing edge cases in E2E
test('should handle null props', async ({ page }) => {
  // This should be a unit test
});

// Good: Testing user journey in E2E
test('should complete user registration', async ({ page }) => {
  // Real user workflow
});
```

❌ **Don't make tests dependent on each other**
```typescript
// Bad: Test B depends on Test A
test('A: create user', async () => {});
test('B: edit user created in A', async () => {}); // Fails if A fails

// Good: Each test is independent
test('create user', async () => {
  await createUser();
  await verifyUser();
});
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
npx playwright test

# Run in headed mode (visible browser)
npx playwright test --headed

# Run specific test file
npx playwright test e2e/auth/login.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug

# Run with UI mode
npx playwright test --ui
```

### Test Reports

```bash
# View HTML report
npx playwright show-report

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Debugging E2E Tests

### Debug Mode

```bash
# Run in debug mode (pauses at breakpoints)
npx playwright test --debug

# Debug specific test
npx playwright test e2e/dashboard.spec.ts --debug
```

### VS Code Integration

Install Playwright extension for VS Code:
1. Install "Playwright Test for VSCode" extension
2. Click "Testing" icon in sidebar
3. Run/debug individual tests from UI

### Common Issues

**Issue: "Element not found"**
```typescript
// Bad: Not waiting
await page.click('[data-testid="button"]');

// Good: Wait first
await page.waitForSelector('[data-testid="button"]');
await page.click('[data-testid="button"]');
```

**Issue: "Test timeout"**
```typescript
// Increase timeout for slow operations
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  await page.goto('/slow-page');
  // ...
});
```

**Issue: "Flaky tests"**
```typescript
// Use retry for flaky tests
test.describe.configure({ mode: 'serial', retries: 2 });

test('might be flaky', async ({ page }) => {
  // Test code...
});
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload traces
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: traces
          path: test-results/
```

### Docker

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npx", "playwright", "test"]
```

## Test Data Management

### Using Fixtures

```typescript
import { test as base } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

type TestFixtures = {
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

const test = base.extend<TestFixtures>({
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  authenticatedPage: async ({ page }, use) => {
    await login(page, 'test@example.com', 'password123');
    await use(page);
  },
});

// Use fixtures in tests
test('dashboard test', async ({ dashboardPage }) => {
  await dashboardPage.goto();
  // Test code...
});

test('authenticated test', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/admin');
  // Test code...
});
```

## Next Steps

- **Unit Testing:** [unit-testing.md](./unit-testing.md) - Test individual components
- **Integration Testing:** [integration-testing.md](./integration-testing.md) - Test feature workflows
- **Testing Overview:** [testing-overview.md](./testing-overview.md) - Testing philosophy

---

**Related:** [Local Development](./local-development.md) | [Development Guide](../../DEVELOPMENT_GUIDE.md)
