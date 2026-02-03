import { test, expect } from '../fixtures/auth';
import { createTestCompany, createTestContact, cleanupTestData } from '../fixtures/database';
import path from 'path';

test.describe('Purchase Orders', () => {
  let companyId: string;
  let supplierId: string;

  test.beforeEach(async () => {
    const company = await createTestCompany('PO Test Company');
    companyId = company.id;
    const supplier = await createTestContact(companyId, 'supplier');
    supplierId = supplier.id;
  });

  test.afterEach(async () => {
    await cleanupTestData(companyId);
  });

  test('user can create a purchase order', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('text=Procurement');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click('button:has-text("New Purchase Order")');

    await authenticatedPage.fill('input[name="po_number"]', `PO-${Date.now()}`);
    await authenticatedPage.selectOption('select[name="supplier_id"]', supplierId);
    await authenticatedPage.fill('input[name="total_amount"]', '5000');

    await authenticatedPage.click('button:has-text("Create")');

    await expect(authenticatedPage.locator('text=Purchase order created')).toBeVisible();
  });

  test('user can import PO from Excel', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('text=Procurement');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click('button:has-text("Import")');

    const testFile = path.join(process.cwd(), 'test-data', 'PO-Dell-Laptops-2026-02-03.csv');
    await authenticatedPage.setInputFiles('input[type="file"]', testFile);

    await authenticatedPage.waitForSelector('text=Sheet', { timeout: 5000 });
    await authenticatedPage.click('button:has-text("Import")');

    await expect(authenticatedPage.locator('text=/imported|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('user can view PO details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('text=Procurement');
    await authenticatedPage.waitForTimeout(1000);

    const firstPO = authenticatedPage.locator('tr').nth(1);
    await firstPO.click();

    await expect(authenticatedPage.locator('text=Purchase Order Details')).toBeVisible();
    await expect(authenticatedPage.locator('text=Status')).toBeVisible();
    await expect(authenticatedPage.locator('text=Supplier')).toBeVisible();
  });
});
