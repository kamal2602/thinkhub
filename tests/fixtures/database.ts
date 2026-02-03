import { supabase } from './auth';

export async function createTestCompany(name: string = 'Test Company') {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name,
      code: `TEST-${Date.now()}`,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTestContact(companyId: string, type: 'customer' | 'supplier' = 'customer') {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      company_id: companyId,
      name: `Test ${type} ${Date.now()}`,
      contact_type: type,
      is_customer: type === 'customer',
      is_supplier: type === 'supplier',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTestPurchaseOrder(companyId: string, supplierId: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      company_id: companyId,
      supplier_id: supplierId,
      po_number: `PO-TEST-${Date.now()}`,
      status: 'draft',
      total_amount: 1000,
      intake_type: 'purchase',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTestProductType(companyId: string, name: string = 'Laptop') {
  const { data, error } = await supabase
    .from('product_types')
    .insert({
      company_id: companyId,
      name,
      category: 'IT Equipment',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cleanupTestData(companyId: string) {
  await supabase.from('assets').delete().eq('company_id', companyId);
  await supabase.from('purchase_orders').delete().eq('company_id', companyId);
  await supabase.from('contacts').delete().eq('company_id', companyId);
  await supabase.from('product_types').delete().eq('company_id', companyId);
  await supabase.from('companies').delete().eq('id', companyId);
}
