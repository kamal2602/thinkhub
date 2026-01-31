import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  currency?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export interface CreateSupplierInput {
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  currency?: string;
  notes?: string;
}

export interface SupplierStats {
  total_orders: number;
  total_spent: number;
  active_orders: number;
  average_order_value: number;
  quality_score?: number;
  last_order_date?: string;
}

export interface SupplierWithStats extends Supplier {
  stats?: SupplierStats;
}

export class SupplierService extends BaseService {
  async getSuppliers(companyId: string, filters?: {
    isActive?: boolean;
    search?: string;
  }): Promise<Supplier[]> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 'Failed to fetch suppliers');
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch supplier');
  }

  async getSupplierWithStats(id: string): Promise<SupplierWithStats | null> {
    return this.executeQuery(async () => {
      const supplier = await this.getSupplierById(id);
      if (!supplier) return null;

      const stats = await this.getSupplierStats(id);

      return {
        ...supplier,
        stats
      };
    }, 'Failed to fetch supplier with stats');
  }

  async createSupplier(input: CreateSupplierInput, userId: string): Promise<Supplier> {
    return this.executeQuery(async () => {
      const code = await this.generateSupplierCode(input.company_id, input.name);

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          ...input,
          code,
          is_active: true,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to create supplier');
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to update supplier');
  }

  async deactivateSupplier(id: string): Promise<Supplier> {
    return this.updateSupplier(id, { is_active: false });
  }

  async activateSupplier(id: string): Promise<Supplier> {
    return this.updateSupplier(id, { is_active: true });
  }

  async deleteSupplier(id: string): Promise<void> {
    return this.executeQuery(async () => {
      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .eq('supplier_id', id);

      if (orders && orders > 0) {
        throw new Error('Cannot delete supplier with existing purchase orders. Deactivate instead.');
      }

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'Failed to delete supplier');
  }

  async getSupplierStats(supplierId: string): Promise<SupplierStats> {
    return this.executeQuery(async () => {
      const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select('id, status, total_amount, order_date')
        .eq('supplier_id', supplierId);

      if (error) throw error;

      const stats = (orders || []).reduce((acc, order) => {
        acc.total_orders++;
        acc.total_spent += order.total_amount || 0;
        if (['submitted', 'approved', 'partially_received'].includes(order.status)) {
          acc.active_orders++;
        }
        if (!acc.last_order_date || order.order_date > acc.last_order_date) {
          acc.last_order_date = order.order_date;
        }
        return acc;
      }, {
        total_orders: 0,
        total_spent: 0,
        active_orders: 0,
        last_order_date: undefined as string | undefined
      });

      const averageOrderValue = stats.total_orders > 0
        ? stats.total_spent / stats.total_orders
        : 0;

      return {
        ...stats,
        average_order_value: averageOrderValue
      };
    }, 'Failed to fetch supplier stats');
  }

  async getTopSuppliers(companyId: string, limit = 10, sortBy: 'volume' | 'spending' = 'spending'): Promise<SupplierWithStats[]> {
    return this.executeQuery(async () => {
      const suppliers = await this.getSuppliers(companyId, { isActive: true });

      const suppliersWithStats = await Promise.all(
        suppliers.map(async (supplier) => {
          const stats = await this.getSupplierStats(supplier.id);
          return { ...supplier, stats };
        })
      );

      suppliersWithStats.sort((a, b) => {
        if (sortBy === 'volume') {
          return (b.stats?.total_orders || 0) - (a.stats?.total_orders || 0);
        }
        return (b.stats?.total_spent || 0) - (a.stats?.total_spent || 0);
      });

      return suppliersWithStats.slice(0, limit);
    }, 'Failed to fetch top suppliers');
  }

  private async generateSupplierCode(companyId: string, name: string): Promise<string> {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');

    const { data, error } = await supabase
      .from('suppliers')
      .select('code')
      .eq('company_id', companyId)
      .like('code', `${prefix}%`)
      .order('code', { ascending: false })
      .limit(1);

    if (error) throw error;

    const lastCode = data?.[0];
    if (!lastCode) {
      return `${prefix}001`;
    }

    const lastNumber = parseInt(lastCode.code.substring(3) || '0');
    const nextNumber = lastNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  async searchSuppliers(companyId: string, searchTerm: string): Promise<Supplier[]> {
    return this.getSuppliers(companyId, { search: searchTerm, isActive: true });
  }

  async importSuppliers(companyId: string, suppliers: CreateSupplierInput[], userId: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    for (let i = 0; i < suppliers.length; i++) {
      try {
        await this.createSupplier(suppliers[i], userId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

export const supplierService = new SupplierService();
