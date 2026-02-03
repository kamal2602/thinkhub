# Playwright E2E Testing Guide

## Overview

ThinkHub uses Playwright for end-to-end testing to ensure critical workflows work correctly across all browsers.

## Getting Started

### Installation

Playwright is already installed. To install browsers:

```bash
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## Test Structure

### Test Files

All tests are located in the `tests/` directory:

```
tests/
├── fixtures/
│   ├── auth.ts          # Authentication helpers
│   └── database.ts      # Database test data helpers
├── e2e/
│   ├── auth.spec.ts            # Login/logout tests
│   ├── purchase-orders.spec.ts # PO workflow tests
│   ├── asset-processing.spec.ts # Asset processing tests
│   ├── sales-invoices.spec.ts  # Sales invoice tests
│   └── permissions.spec.ts     # Permission tests
```

### Writing Tests

#### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Button');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

#### Using Authentication

```typescript
import { test, expect } from '../fixtures/auth';

test.describe('Authenticated Feature', () => {
  test('can access protected page', async ({ authenticatedPage }) => {
    // authenticatedPage is already logged in
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
  });
});
```

#### Creating Test Data

```typescript
import { createTestCompany, createTestContact } from '../fixtures/database';

test('can create purchase order', async ({ authenticatedPage }) => {
  const company = await createTestCompany();
  const supplier = await createTestContact(company.id, 'supplier');

  // Use the test data...
});
```

## Test Patterns

### Locator Strategies

```typescript
// By text content
await page.click('text=Submit');

// By role and name
await page.click('button:has-text("Submit")');

// By placeholder
await page.fill('input[placeholder="Enter email"]', 'test@example.com');

// By test ID
await page.click('[data-testid="submit-button"]');

// By CSS selector
await page.click('.submit-button');
```

### Waiting for Elements

```typescript
// Wait for element to be visible
await page.waitForSelector('text=Success', { timeout: 5000 });

// Wait for URL change
await page.waitForURL('**/dashboard', { timeout: 5000 });

// Wait for network request
await page.waitForResponse(response =>
  response.url().includes('/api/') && response.status() === 200
);
```

### Assertions

```typescript
// Element visibility
await expect(page.locator('text=Success')).toBeVisible();
await expect(page.locator('text=Error')).not.toBeVisible();

// Element text
await expect(page.locator('h1')).toHaveText('Dashboard');
await expect(page.locator('.total')).toContainText('$1,000');

// URL
await expect(page).toHaveURL(/.*dashboard/);

// Element count
await expect(page.locator('.item')).toHaveCount(5);
```

## Testing Critical Workflows

### Purchase Order Import

```typescript
test('imports PO from Excel', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await authenticatedPage.click('text=Procurement');
  await authenticatedPage.click('button:has-text("Import")');

  const testFile = path.join(process.cwd(), 'test-data', 'PO-Test.csv');
  await authenticatedPage.setInputFiles('input[type="file"]', testFile);

  await authenticatedPage.click('button:has-text("Import")');
  await expect(authenticatedPage.locator('text=imported')).toBeVisible();
});
```

### Asset Scanning

```typescript
test('scans and creates asset', async ({ authenticatedPage }) => {
  const serialNumber = `SN-${Date.now()}`;

  await authenticatedPage.goto('/dashboard');
  await authenticatedPage.click('text=Processing');

  await authenticatedPage.fill('input[placeholder*="Scan"]', serialNumber);
  await authenticatedPage.press('input[placeholder*="Scan"]', 'Enter');

  await expect(authenticatedPage.locator(`text=${serialNumber}`)).toBeVisible();
});
```

### Sales Invoice Creation

```typescript
test('creates sales invoice', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await authenticatedPage.click('text=Sales');
  await authenticatedPage.click('button:has-text("New Invoice")');

  const invoiceNumber = `INV-${Date.now()}`;
  await authenticatedPage.fill('input[name="invoice_number"]', invoiceNumber);
  await authenticatedPage.selectOption('select[name="customer_id"]', customerId);

  await authenticatedPage.click('button:has-text("Create Invoice")');
  await expect(authenticatedPage.locator('text=Invoice created')).toBeVisible();
});
```

## Best Practices

### 1. Use Unique Test Data

Always generate unique identifiers for test data:

```typescript
const uniqueEmail = `test-${Date.now()}@example.com`;
const uniquePO = `PO-${Date.now()}`;
```

### 2. Clean Up Test Data

Always clean up after tests:

```typescript
test.afterEach(async () => {
  await cleanupTestData(companyId);
});
```

### 3. Use Page Objects for Complex Pages

```typescript
class ProcessingPage {
  constructor(private page: Page) {}

  async scanAsset(serialNumber: string) {
    await this.page.fill('input[placeholder*="Scan"]', serialNumber);
    await this.page.press('input[placeholder*="Scan"]', 'Enter');
  }

  async waitForAssetTable() {
    await this.page.waitForSelector('table');
  }
}
```

### 4. Handle Flaky Tests

```typescript
// Use retries for flaky operations
await test.step('load data', async () => {
  await page.reload();
  await expect(page.locator('.data')).toBeVisible({ timeout: 10000 });
});
```

### 5. Test Accessibility

```typescript
// Check for accessible labels
await expect(page.locator('input[aria-label="Email"]')).toBeVisible();

// Check keyboard navigation
await page.keyboard.press('Tab');
await page.keyboard.press('Enter');
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Tests

### Visual Debugging

```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Run specific test in debug mode
npx playwright test tests/e2e/auth.spec.ts --debug
```

### Screenshots and Videos

```typescript
// Take screenshot
await page.screenshot({ path: 'screenshot.png' });

// Take full page screenshot
await page.screenshot({ path: 'full.png', fullPage: true });
```

### Trace Viewer

Traces are automatically captured on first retry. View them with:

```bash
npx playwright show-trace trace.zip
```

## Environment Variables

Set these in `.env` for test execution:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Common Issues

### Issue: Tests timeout

**Solution**: Increase timeout in playwright.config.ts:

```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

### Issue: Element not found

**Solution**: Add explicit waits:

```typescript
await page.waitForSelector('text=Element', { timeout: 5000 });
```

### Issue: Tests fail in CI but pass locally

**Solution**:
- Check environment variables
- Use headless mode locally to debug: `npm run test:e2e:headed`
- Add more explicit waits
- Check for race conditions
