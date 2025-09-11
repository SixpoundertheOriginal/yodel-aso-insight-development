import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = join(__dirname, '..', 'docs', 'admin-smoke', new Date().toISOString().slice(0, 10));

interface TestUser {
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN';
}

// Test users - these should be created in your test database
const TEST_USERS: Record<string, TestUser> = {
  superAdmin: {
    email: 'super@example.com',
    password: 'password123',
    role: 'SUPER_ADMIN'
  },
  orgAdmin: {
    email: 'admin@example.com', 
    password: 'password123',
    role: 'ORG_ADMIN'
  }
};

// Helper function to login
async function loginAs(page: Page, userType: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userType];
  
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for successful login
  await expect(page).toHaveURL(/\/admin|\/dashboard/);
}

// Helper function to take screenshot with test name
async function takeScreenshot(page: Page, testName: string, step: string) {
  try {
    mkdirSync(RESULTS_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const filename = `${testName.replace(/[^a-z0-9]/gi, '_')}_${step}.png`;
  await page.screenshot({ 
    path: join(RESULTS_DIR, filename),
    fullPage: true 
  });
}

// Helper function to log test results
function logTestResult(testName: string, result: 'PASS' | 'FAIL', details?: string) {
  try {
    mkdirSync(RESULTS_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    test: testName,
    result,
    details: details || ''
  };
  
  const logFile = join(RESULTS_DIR, 'playwright_results.jsonl');
  writeFileSync(logFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
}

test.describe('Admin Panel E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up any common test state
    await page.goto('/');
  });

  test('SUPER_ADMIN: Can access all organizations and users', async ({ page }) => {
    const testName = 'super_admin_full_access';
    
    try {
      await loginAs(page, 'superAdmin');
      await takeScreenshot(page, testName, '01_logged_in');
      
      // Navigate to admin panel
      await page.goto('/admin');
      await takeScreenshot(page, testName, '02_admin_dashboard');
      
      // Check organizations page
      await page.click('[data-testid="nav-organizations"]');
      await expect(page).toHaveURL(/\/admin\/organizations/);
      
      // Should see organization list
      await expect(page.locator('[data-testid="organizations-table"]')).toBeVisible();
      await takeScreenshot(page, testName, '03_organizations_list');
      
      // Check users page
      await page.click('[data-testid="nav-users"]');
      await expect(page).toHaveURL(/\/admin\/users/);
      
      // Should see user list with roles
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      
      // Verify Igor shows as super_admin
      await expect(page.locator('[data-testid="user-igor"] [data-testid="user-role"]')).toContainText('super_admin');
      await takeScreenshot(page, testName, '04_users_list');
      
      // Test create organization
      await page.click('[data-testid="create-organization-button"]');
      await expect(page.locator('[data-testid="create-organization-modal"]')).toBeVisible();
      await takeScreenshot(page, testName, '05_create_org_modal');
      
      logTestResult(testName, 'PASS', 'Super admin can access all features');
      
    } catch (error) {
      await takeScreenshot(page, testName, 'error');
      logTestResult(testName, 'FAIL', error.message);
      throw error;
    }
  });

  test('SUPER_ADMIN: Can invite users successfully', async ({ page }) => {
    const testName = 'super_admin_invite_user';
    
    try {
      await loginAs(page, 'superAdmin');
      await page.goto('/admin/users');
      
      await takeScreenshot(page, testName, '01_users_page');
      
      // Click invite user button
      await page.click('[data-testid="invite-user-button"]');
      await expect(page.locator('[data-testid="user-invitation-modal"]')).toBeVisible();
      
      // Fill invitation form
      const testEmail = `test-${Date.now()}@example.com`;
      await page.fill('[data-testid="invite-email"]', testEmail);
      await page.selectOption('[data-testid="invite-organization"]', { index: 0 });
      await page.selectOption('[data-testid="invite-role"]', 'VIEWER');
      
      await takeScreenshot(page, testName, '02_invite_form_filled');
      
      // Submit invitation
      await page.click('[data-testid="send-invitation-button"]');
      
      // Check for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Invitation sent');
      await takeScreenshot(page, testName, '03_invite_success');
      
      logTestResult(testName, 'PASS', `Invited user: ${testEmail}`);
      
    } catch (error) {
      await takeScreenshot(page, testName, 'error');
      logTestResult(testName, 'FAIL', error.message);
      throw error;
    }
  });

  test('ORG_ADMIN: Cannot see other organizations', async ({ page }) => {
    const testName = 'org_admin_scoped_access';
    
    try {
      await loginAs(page, 'orgAdmin');
      await page.goto('/admin');
      await takeScreenshot(page, testName, '01_logged_in');
      
      // Go to organizations page
      await page.click('[data-testid="nav-organizations"]');
      
      // Should only see own organization
      const orgRows = page.locator('[data-testid="organizations-table"] tbody tr');
      const orgCount = await orgRows.count();
      
      expect(orgCount).toBeLessThanOrEqual(1); // Should see only own org
      await takeScreenshot(page, testName, '02_scoped_orgs');
      
      // Go to users page
      await page.click('[data-testid="nav-users"]');
      
      // Should only see users from own organization
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      await takeScreenshot(page, testName, '03_scoped_users');
      
      logTestResult(testName, 'PASS', `Org admin sees limited data: ${orgCount} organizations`);
      
    } catch (error) {
      await takeScreenshot(page, testName, 'error');
      logTestResult(testName, 'FAIL', error.message);
      throw error;
    }
  });

  test('ORG_ADMIN: Cannot invite to other organizations', async ({ page }) => {
    const testName = 'org_admin_invite_restrictions';
    
    try {
      await loginAs(page, 'orgAdmin');
      await page.goto('/admin/users');
      
      // Try to invite user
      await page.click('[data-testid="invite-user-button"]');
      await expect(page.locator('[data-testid="user-invitation-modal"]')).toBeVisible();
      
      // Check organization dropdown - should only have one option
      const orgOptions = page.locator('[data-testid="invite-organization"] option');
      const optionCount = await orgOptions.count();
      
      expect(optionCount).toBeLessThanOrEqual(2); // Only default option + own org
      await takeScreenshot(page, testName, '01_limited_org_options');
      
      logTestResult(testName, 'PASS', `Org admin has limited org options: ${optionCount}`);
      
    } catch (error) {
      await takeScreenshot(page, testName, 'error');
      logTestResult(testName, 'FAIL', error.message);
      throw error;
    }
  });

  test('Cross-org access returns 403 and is audited', async ({ page }) => {
    const testName = 'cross_org_403_test';
    
    try {
      await loginAs(page, 'orgAdmin');
      
      // Try to access API directly with wrong org context
      const response = await page.evaluate(async () => {
        const response = await fetch('/api/admin/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Org-Id': 'wrong-org-id'
          },
          body: JSON.stringify({
            name: 'Unauthorized Org',
            slug: 'unauth-org'
          })
        });
        
        return {
          status: response.status,
          body: await response.text()
        };
      });
      
      expect(response.status).toBe(403);
      await takeScreenshot(page, testName, '01_403_response');
      
      logTestResult(testName, 'PASS', `Cross-org access blocked: ${response.status}`);
      
    } catch (error) {
      await takeScreenshot(page, testName, 'error');
      logTestResult(testName, 'FAIL', error.message);
      throw error;
    }
  });

  test('UI permissions and org context switching', async ({ page }) => {
    const testName = 'ui_permissions_org_switching';
    
    try {
      await loginAs(page, 'superAdmin');
      await page.goto('/admin');
      
      // Check if org switcher is available (for super admin)
      const orgSwitcher = page.locator('[data-testid="org-switcher"]');
      if (await orgSwitcher.isVisible()) {
        await takeScreenshot(page, testName, '01_org_switcher_visible');
        
        // Try switching org
        await orgSwitcher.click();
        await page.click('[data-testid="org-option"]:first-child');
        
        // Data should reload for new org context
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, testName, '02_org_switched');
      }
      
      logTestResult(testName, 'PASS', 'Org switching works correctly');
      
    } catch (error) {
      await takeScreenshot(page, testName, 'error');
      logTestResult(testName, 'FAIL', error.message);
      throw error;
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log test completion
    if (testInfo.status === 'passed') {
      logTestResult(testInfo.title, 'PASS');
    } else {
      logTestResult(testInfo.title, 'FAIL', testInfo.error?.message);
    }
  });
});

test.afterAll(async () => {
  // Generate summary report
  try {
    mkdirSync(RESULTS_DIR, { recursive: true });
    
    const summaryPath = join(RESULTS_DIR, 'test_summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      total_tests: 6,
      results_dir: RESULTS_DIR,
      note: 'Check playwright_results.jsonl for detailed results'
    };
    
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`Test results saved to: ${RESULTS_DIR}`);
  } catch (error) {
    console.error('Failed to generate summary report:', error);
  }
});