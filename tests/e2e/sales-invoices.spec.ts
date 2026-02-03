import { test, expect } from '../fixtures/auth';
import { createTestCompany, createTestContact, createTestProductType, cleanupTestData, supabase } from '../fixtures/database';

test.describe('Sales Invoices', () => {
  let companyId: string;
  let customerId: string;
  let productTypeId: string;
  let assetId: string;

  test.beforeEach(async () => {
    const company = await createTestCompany('Invoice Test Company');
    companyId = company.id;
    const customer = await createTestContact(companyId, 'customer');
    customerId = customer.id;
    const productType = await createTestProductType(companyId, 'Test Desktop');
    productTypeId = productType.id;

    const { data: asset } = await supabase
      .from('assets')
      .insert({
        company_id: companyId,
        product_type_id: productTypeId,
        serial_number: `SN-INV-${Date.now()}`,
        brand: 'HP',
        model: 'ProDesk',
        processing_stage: 'ready_for_sale',
        sale_price: 500,
      })
      .select()
      .single();

    assetId = asset.id;
  });

  test.afterEach(async () => {
    await cleanupTestData(companyId);
  });

  test('user can create sales invoice', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('text=Sales');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click('button:has-text("New Invoice")');

    const invoiceNumber = `INV-${Date.now()}`;
    await authenticatedPage.fill('input[name="invoice_number"]', invoiceNumber);
    await authenticatedPage.selectOption('select[name="customer_id"]', customerId);

    await authenticatedPage.click('button:has-text("Add Item")');
    await authenticatedPage.fill('input[name="quantity"]', '1');
    await authenticatedPage.fill('input[name="unit_price"]', '500');

    await authenticatedPage.click('button:has-text("Create Invoice")');

    await expect(authenticatedPage.locator('text=Invoice created')).toBeVisible();
    await expect(authenticatedPage.locator(`text=${invoiceNumber}`)).toBeVisible();
  });

  test('user can view invoice details', async ({ authenticatedPage }) => {
    const { data: invoice } = await supabase
      .from('sales_invoices')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        invoice_number: `INV-TEST-${Date.now()}`,
        total_amount: 500,
        status: 'draft',
      })
      .select()
      .single();

    await supabase.from('sales_invoice_items').insert({
      invoice_id: invoice.id,
      asset_id: assetId,
      quantity: 1,
      unit_price: 500,
      total_price: 500,
    });

    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.click('text=Sales');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click(`text=${invoice.invoice_number}`);

    await expect(authenticatedPage.locator('text=Invoice Details')).toBeVisible();
    await expect(authenticatedPage.locator('text=500')).toBeVisible();
  });

  test('invoice calculates total correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    await authenticatedPage.click('text=Sales');
    await authenticatedPage.waitForTimeout(1000);

    await authenticatedPage.click('button:has-text("New Invoice")');

    await authenticatedPage.fill('input[name="invoice_number"]', `INV-${Date.now()}`);
    await authenticatedPage.selectOption('select[name="customer_id"]', customerId);

    await authenticatedPage.click('button:has-text("Add Item")');
    await authenticatedPage.fill('input[name="quantity"]', '3');
    await authenticatedPage.fill('input[name="unit_price"]', '250');

    await expect(authenticatedPage.locator('text=750')).toBeVisible();
  });
});
