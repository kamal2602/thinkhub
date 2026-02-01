import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

export const contactService = {
  async getByCustomer(customerId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  async getBySupplier(supplierId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false })
      .order('full_name');

    if (error) throw error;
    return data || [];
  },

  async create(contact: ContactInsert): Promise<Contact> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...contact,
        company_id: profile?.company_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ContactUpdate): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setPrimary(id: string, customerId?: string, supplierId?: string): Promise<void> {
    if (customerId) {
      await supabase
        .from('contacts')
        .update({ is_primary: false })
        .eq('customer_id', customerId);
    }

    if (supplierId) {
      await supabase
        .from('contacts')
        .update({ is_primary: false })
        .eq('supplier_id', supplierId);
    }

    const { error } = await supabase
      .from('contacts')
      .update({ is_primary: true })
      .eq('id', id);

    if (error) throw error;
  },
};
