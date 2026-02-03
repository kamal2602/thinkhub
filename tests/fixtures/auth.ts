import { test as base, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type TestUser = {
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'staff';
  companyId?: string;
};

export async function createTestUser(user: TestUser) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (authError) throw authError;

  if (user.companyId) {
    const { error: accessError } = await supabase
      .from('user_company_access')
      .insert({
        user_id: authData.user.id,
        company_id: user.companyId,
        role: user.role,
      });

    if (accessError) throw accessError;
  }

  return authData.user;
}

export async function deleteTestUser(email: string) {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);

  if (user) {
    await supabase.auth.admin.deleteUser(user.id);
  }
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 5000 });
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      role: 'admin' as const,
    };

    await createTestUser(testUser);
    await loginUser(page, testUser.email, testUser.password);
    await use(page);
    await deleteTestUser(testUser.email);
  },
});

export { expect } from '@playwright/test';
