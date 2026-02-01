import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Address = Database['public']['Tables']['addresses']['Row'];
type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

export const addressService = {
  async getByCustomer(customerId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('address_type');

    if (error) throw error;
    return data || [];
  },

  async getBySupplier(supplierId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false })
      .order('address_type');

    if (error) throw error;
    return data || [];
  },

  async create(address: AddressInsert): Promise<Address> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        ...address,
        company_id: profile?.company_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: AddressUpdate): Promise<Address> {
    const { data, error } = await supabase
      .from('addresses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setPrimary(id: string, customerId?: string, supplierId?: string): Promise<void> {
    if (customerId) {
      await supabase
        .from('addresses')
        .update({ is_primary: false })
        .eq('customer_id', customerId);
    }

    if (supplierId) {
      await supabase
        .from('addresses')
        .update({ is_primary: false })
        .eq('supplier_id', supplierId);
    }

    const { error } = await supabase
      .from('addresses')
      .update({ is_primary: true })
      .eq('id', id);

    if (error) throw error;
  },
};
