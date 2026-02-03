import { test, expect } from '../fixtures/auth';
import { createTestCompany, createTestProductType, cleanupTestData, supabase } from '../fixtures/database';

test.describe('Asset Processing', () => {
  let companyId: string;
  let productTypeId: string;

  test.beforeEach(async () => {
    const company = await createTestCompany('Processing Test Company');
    companyId = company.id;
    const productType = await createTestProductType(companyId, 'Test Laptop');
    productTypeId = productType.id;
  });

  test.afterEach(async () => {
    await cleanupTestData(companyId);
  });

  test('user can scan and create asset', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('text=Processing');
    await authenticatedPage.waitForTimeout(1000);

    const serialNumber = `SN-${Date.now()}`;
    await authenticatedPage.fill('input[placeholder*="Scan"]', serialNumber);
    await authenticatedPage.press('input[placeholder*="Scan"]', 'Enter');

    await authenticatedPage.waitForSelector('text=New Asset', { timeout: 5000 });

    await authenticatedPage.selectOption('select[name="product_type_id"]', productTypeId);
    await authenticatedPage.fill('input[name="brand"]', 'Dell');
    await authenticatedPage.fill('input[name="model"]', 'Latitude 5420');

    await authenticatedPage.click('button:has-text("Save")');

    await expect(authenticatedPage.locator(`text=${serialNumber}`)).toBeVisible();
  });

  test('user can update asset status', async ({ authenticatedPage }) => {
    const serialNumber = `SN-${Date.now()}`;
    const { data: asset } = await supabase
      .from('assets')
      .insert({
        company_id: companyId,
        product_type_id: productTypeId,
        serial_number: serialNumber,
        brand: 'Dell',
        model: 'Latitude 5420',
        processing_stage: 'receiving',
      })
      .select()
      .single();

    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.click('text=Processing');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click(`tr:has-text("${serialNumber}")`);

    await authenticatedPage.selectOption('select[name="processing_stage"]', 'testing');
    await authenticatedPage.click('button:has-text("Save")');

    await expect(authenticatedPage.locator('text=testing')).toBeVisible();
  });

  test('user can bulk update assets', async ({ authenticatedPage }) => {
    await supabase.from('assets').insert([
      {
        company_id: companyId,
        product_type_id: productTypeId,
        serial_number: `SN-BULK-1-${Date.now()}`,
        brand: 'HP',
        model: 'EliteBook',
        processing_stage: 'receiving',
      },
      {
        company_id: companyId,
        product_type_id: productTypeId,
        serial_number: `SN-BULK-2-${Date.now()}`,
        brand: 'HP',
        model: 'EliteBook',
        processing_stage: 'receiving',
      },
    ]);

    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.click('text=Processing');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click('input[type="checkbox"]', { position: { x: 10, y: 10 } });
    await authenticatedPage.click('button:has-text("Bulk")');
    await authenticatedPage.selectOption('select[name="processing_stage"]', 'testing');
    await authenticatedPage.click('button:has-text("Apply")');

    await expect(authenticatedPage.locator('text=updated successfully')).toBeVisible();
  });
});
