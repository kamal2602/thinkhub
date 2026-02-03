import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, supabase } from '../fixtures/auth';

test.describe('Authentication', () => {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.afterEach(async () => {
    await deleteTestUser(testEmail);
  });

  test('user can register and login', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Sign Up');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign Up")');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('user can logout', async ({ page }) => {
    await createTestUser({ email: testEmail, password: testPassword, role: 'admin' });

    await page.goto('/');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 5000 });

    await page.click('[aria-label="User menu"]');
    await page.click('text=Sign Out');

    await expect(page).toHaveURL('/');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/Invalid|Error|incorrect/i')).toBeVisible();
  });
});
