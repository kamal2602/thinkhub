import { test, expect } from '@playwright/test';
import { createTestUser, loginUser, deleteTestUser } from '../fixtures/auth';
import { createTestCompany } from '../fixtures/database';

test.describe('User Permissions', () => {
  let companyId: string;
  const adminEmail = `admin-${Date.now()}@example.com`;
  const staffEmail = `staff-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  test.beforeAll(async () => {
    const company = await createTestCompany('Permissions Test Company');
    companyId = company.id;

    await createTestUser({ email: adminEmail, password, role: 'admin', companyId });
    await createTestUser({ email: staffEmail, password, role: 'staff', companyId });
  });

  test.afterAll(async () => {
    await deleteTestUser(adminEmail);
    await deleteTestUser(staffEmail);
  });

  test('admin can access settings', async ({ page }) => {
    await loginUser(page, adminEmail, password);
    await page.goto('/dashboard');

    await page.click('text=Settings');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.locator('text=System Configuration')).toBeVisible();
  });

  test('staff cannot access user management', async ({ page }) => {
    await loginUser(page, staffEmail, password);
    await page.goto('/dashboard');

    const settingsButton = page.locator('text=Settings');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await expect(page.locator('text=User Management')).not.toBeVisible();
    }
  });

  test('admin can create users', async ({ page }) => {
    await loginUser(page, adminEmail, password);
    await page.goto('/dashboard');

    await page.click('text=Settings');
    await page.click('text=Users');
    await page.click('button:has-text("New User")');

    const newUserEmail = `newuser-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', newUserEmail);
    await page.fill('input[type="password"]', password);
    await page.selectOption('select[name="role"]', 'staff');

    await page.click('button:has-text("Create")');

    await expect(page.locator(`text=${newUserEmail}`)).toBeVisible();

    await deleteTestUser(newUserEmail);
  });

  test('staff can access their assigned modules', async ({ page }) => {
    await loginUser(page, staffEmail, password);
    await page.goto('/dashboard');

    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Inventory')).toBeVisible();
  });
});
