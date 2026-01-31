import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  website?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  currency?: string;
  notes?: string;
  is_active: boolean;
  customer_type?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateCustomerInput {
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  currency?: string;
  notes?: string;
  customer_type?: string;
}

export interface CustomerStats {
  total_orders: number;
  total_revenue: number;
  total_items_sold: number;
  active_orders: number;
  average_order_value: number;
  last_order_date?: string;
  outstanding_balance?: number;
}

export interface CustomerWithStats extends Customer {
  stats?: CustomerStats;
}

export class CustomerService extends BaseService {
  async getCustomers(companyId: string, filters?: {
    isActive?: boolean;
    customerType?: string;
    search?: string;
  }): Promise<Customer[]> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.customerType) {
        query = query.eq('customer_type', filters.customerType);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 'Failed to fetch customers');
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch customer');
  }

  async getCustomerWithStats(id: string): Promise<CustomerWithStats | null> {
    return this.executeQuery(async () => {
      const customer = await this.getCustomerById(id);
      if (!customer) return null;

      const stats = await this.getCustomerStats(id);

      return {
        ...customer,
        stats
      };
    }, 'Failed to fetch customer with stats');
  }

  async createCustomer(input: CreateCustomerInput, userId: string): Promise<Customer> {
    return this.executeQuery(async () => {
      const code = await this.generateCustomerCode(input.company_id, input.name);

      const { data, error } = await supabase
        .from('customers')
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
    }, 'Failed to create customer');
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to update customer');
  }

  async deactivateCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { is_active: false });
  }

  async activateCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { is_active: true });
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.executeQuery(async () => {
      const { data: invoices } = await supabase
        .from('sales_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id);

      if (invoices && invoices > 0) {
        throw new Error('Cannot delete customer with existing invoices. Deactivate instead.');
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'Failed to delete customer');
  }

  async getCustomerStats(customerId: string): Promise<CustomerStats> {
    return this.executeQuery(async () => {
      const { data: invoices, error } = await supabase
        .from('sales_invoices')
        .select(`
          id,
          status,
          total_amount,
          invoice_date,
          sales_invoice_items(quantity)
        `)
        .eq('customer_id', customerId);

      if (error) throw error;

      const stats = (invoices || []).reduce((acc, invoice) => {
        acc.total_orders++;
        acc.total_revenue += invoice.total_amount || 0;

        const itemsCount = invoice.sales_invoice_items?.reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0
        ) || 0;
        acc.total_items_sold += itemsCount;

        if (['draft', 'sent', 'partially_paid'].includes(invoice.status)) {
          acc.active_orders++;
        }

        if (invoice.status !== 'paid') {
          acc.outstanding_balance = (acc.outstanding_balance || 0) + (invoice.total_amount || 0);
        }

        if (!acc.last_order_date || invoice.invoice_date > acc.last_order_date) {
          acc.last_order_date = invoice.invoice_date;
        }

        return acc;
      }, {
        total_orders: 0,
        total_revenue: 0,
        total_items_sold: 0,
        active_orders: 0,
        outstanding_balance: 0,
        last_order_date: undefined as string | undefined
      });

      const averageOrderValue = stats.total_orders > 0
        ? stats.total_revenue / stats.total_orders
        : 0;

      return {
        ...stats,
        average_order_value: averageOrderValue
      };
    }, 'Failed to fetch customer stats');
  }

  async getTopCustomers(companyId: string, limit = 10, sortBy: 'revenue' | 'orders' = 'revenue'): Promise<CustomerWithStats[]> {
    return this.executeQuery(async () => {
      const customers = await this.getCustomers(companyId, { isActive: true });

      const customersWithStats = await Promise.all(
        customers.map(async (customer) => {
          const stats = await this.getCustomerStats(customer.id);
          return { ...customer, stats };
        })
      );

      customersWithStats.sort((a, b) => {
        if (sortBy === 'orders') {
          return (b.stats?.total_orders || 0) - (a.stats?.total_orders || 0);
        }
        return (b.stats?.total_revenue || 0) - (a.stats?.total_revenue || 0);
      });

      return customersWithStats.slice(0, limit);
    }, 'Failed to fetch top customers');
  }

  private async generateCustomerCode(companyId: string, name: string): Promise<string> {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'C');

    const { data, error } = await supabase
      .from('customers')
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

  async searchCustomers(companyId: string, searchTerm: string): Promise<Customer[]> {
    return this.getCustomers(companyId, { search: searchTerm, isActive: true });
  }

  async importCustomers(companyId: string, customers: CreateCustomerInput[], userId: string): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    for (let i = 0; i < customers.length; i++) {
      try {
        await this.createCustomer(customers[i], userId);
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

  async getCustomerOutstandingBalance(customerId: string): Promise<number> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('total_amount, amount_paid')
        .eq('customer_id', customerId)
        .neq('status', 'paid');

      if (error) throw error;

      return (data || []).reduce((sum, invoice) => {
        return sum + ((invoice.total_amount || 0) - (invoice.amount_paid || 0));
      }, 0);
    }, 'Failed to fetch customer outstanding balance');
  }
}

export const customerService = new CustomerService();
