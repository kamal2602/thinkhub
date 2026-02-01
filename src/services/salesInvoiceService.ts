import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  company_id: string;
  status: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  currency: string;
  sales_order_id?: string; // Optional link to sales order
  notes?: string;
  terms?: string;
  created_at: string;
  created_by: string;
}

export interface SalesInvoiceItem {
  id: string;
  sales_invoice_id: string;
  asset_id?: string;
  component_sale_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_rate?: number;
  total_price: number;
}

export interface CreateSalesInvoiceInput {
  customer_id: string;
  company_id: string;
  invoice_date: string;
  due_date?: string;
  currency?: string;
  sales_order_id?: string; // Optional link to sales order
  notes?: string;
  terms?: string;
  items: Omit<SalesInvoiceItem, 'id' | 'sales_invoice_id'>[];
}

export interface SalesInvoiceWithDetails extends SalesInvoice {
  customer: any;
  items: any[];
}

export class SalesInvoiceService extends BaseService {
  async getSalesInvoices(companyId: string, filters?: {
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<SalesInvoiceWithDetails[]> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('sales_invoices')
        .select(`
          *,
          customers(id, name, code, email),
          sales_invoice_items(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.startDate) {
        query = query.gte('invoice_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('invoice_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 'Failed to fetch sales invoices');
  }

  async getSalesInvoiceById(id: string): Promise<SalesInvoiceWithDetails | null> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          customers(id, name, code, email, phone, billing_address, billing_city, billing_state, billing_postal_code, billing_country),
          sales_invoice_items(
            *,
            assets(serial_number, brand, model),
            component_sales(component_type, component_description)
          ),
          profiles(full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch sales invoice');
  }

  /**
   * Convenience method for creating invoice without items (items added separately)
   * Used by auction settlement and other flows that build invoices incrementally
   */
  async createInvoice(params: {
    company_id: string;
    customer_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string;
    total_amount: number;
    paid_amount?: number;
    payment_status?: string;
    sales_channel?: string;
    sales_order_id?: string;
    notes?: string;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .insert({
        ...params,
        status: params.payment_status || 'draft',
        subtotal: params.total_amount,
        tax_amount: 0,
        discount_amount: 0,
        amount_paid: params.paid_amount || 0,
        currency: 'USD'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add a single item to an existing invoice
   */
  async addInvoiceItem(params: {
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    cost_price?: number;
    asset_id?: string;
    component_id?: string;
  }): Promise<any> {
    const totalPrice = params.quantity * params.unit_price;

    const { data, error } = await supabase
      .from('sales_invoice_items')
      .insert({
        invoice_id: params.invoice_id,
        item_id: params.asset_id || params.component_id, // Legacy field
        description: params.description,
        quantity: params.quantity,
        unit_price: params.unit_price,
        total_price: totalPrice,
        cost_price: params.cost_price
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createSalesInvoice(input: CreateSalesInvoiceInput, userId: string): Promise<SalesInvoice> {
    return this.executeQuery(async () => {
      const invoiceNumber = await this.generateInvoiceNumber(input.company_id);

      const subtotal = input.items.reduce((sum, item) => sum + item.total_price, 0);
      const taxAmount = input.items.reduce((sum, item) => {
        const tax = item.total_price * (item.tax_rate || 0) / 100;
        return sum + tax;
      }, 0);
      const discountAmount = input.items.reduce((sum, item) => {
        const discount = item.total_price * (item.discount_rate || 0) / 100;
        return sum + discount;
      }, 0);
      const totalAmount = subtotal + taxAmount - discountAmount;

      const { data: invoice, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: input.customer_id,
          company_id: input.company_id,
          status: 'draft',
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          amount_paid: 0,
          currency: input.currency || 'USD',
          sales_order_id: input.sales_order_id,
          notes: input.notes,
          terms: input.terms,
          created_by: userId
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const items = input.items.map(item => ({
        ...item,
        sales_invoice_id: invoice.id
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return invoice;
    }, 'Failed to create sales invoice');
  }

  async updateSalesInvoice(id: string, updates: Partial<SalesInvoice>): Promise<SalesInvoice> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to update sales invoice');
  }

  async sendInvoice(id: string): Promise<SalesInvoice> {
    return this.updateSalesInvoice(id, {
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  }

  async recordPayment(id: string, amount: number, paymentDate: string): Promise<SalesInvoice> {
    return this.executeQuery(async () => {
      const invoice = await this.getSalesInvoiceById(id);
      if (!invoice) throw new Error('Invoice not found');

      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= invoice.total_amount ? 'paid' : 'partially_paid';

      const { data, error } = await supabase
        .from('sales_invoices')
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_at
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('payment_records').insert({
        sales_invoice_id: id,
        amount,
        payment_date: paymentDate,
        payment_method: 'manual',
        notes: 'Payment recorded manually'
      });

      return data;
    }, 'Failed to record payment');
  }

  async voidInvoice(id: string): Promise<SalesInvoice> {
    return this.updateSalesInvoice(id, {
      status: 'void',
      voided_at: new Date().toISOString()
    });
  }

  async deleteSalesInvoice(id: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .delete()
        .eq('sales_invoice_id', id);

      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('sales_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'Failed to delete sales invoice');
  }

  async updateInvoiceItem(itemId: string, updates: Partial<SalesInvoiceItem>): Promise<SalesInvoiceItem> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('sales_invoice_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      await this.recalculateInvoiceTotals(data.sales_invoice_id);

      return data;
    }, 'Failed to update invoice item');
  }

  async deleteInvoiceItem(itemId: string): Promise<void> {
    return this.executeQuery(async () => {
      const { data: item } = await supabase
        .from('sales_invoice_items')
        .select('sales_invoice_id')
        .eq('id', itemId)
        .single();

      const { error } = await supabase
        .from('sales_invoice_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      if (item) {
        await this.recalculateInvoiceTotals(item.sales_invoice_id);
      }
    }, 'Failed to delete invoice item');
  }

  private async recalculateInvoiceTotals(invoiceId: string): Promise<void> {
    const { data: items } = await supabase
      .from('sales_invoice_items')
      .select('total_price, tax_rate, discount_rate')
      .eq('sales_invoice_id', invoiceId);

    const subtotal = (items || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
    const taxAmount = (items || []).reduce((sum, item) => {
      const tax = (item.total_price || 0) * (item.tax_rate || 0) / 100;
      return sum + tax;
    }, 0);
    const discountAmount = (items || []).reduce((sum, item) => {
      const discount = (item.total_price || 0) * (item.discount_rate || 0) / 100;
      return sum + discount;
    }, 0);
    const totalAmount = subtotal + taxAmount - discountAmount;

    await supabase
      .from('sales_invoices')
      .update({
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount
      })
      .eq('id', invoiceId);
  }

  private async generateInvoiceNumber(companyId: string): Promise<string> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const lastInvoice = data?.[0];
    if (!lastInvoice) {
      return 'INV-000001';
    }

    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[1] || '0');
    const nextNumber = lastNumber + 1;
    return `INV-${nextNumber.toString().padStart(6, '0')}`;
  }

  async getSalesStats(companyId: string, startDate?: string, endDate?: string): Promise<any> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('sales_invoices')
        .select('id, status, total_amount, invoice_date')
        .eq('company_id', companyId);

      if (startDate) query = query.gte('invoice_date', startDate);
      if (endDate) query = query.lte('invoice_date', endDate);

      const { data, error } = await query;
      if (error) throw error;

      const stats = (data || []).reduce((acc, invoice) => {
        acc.total_count++;
        acc.total_revenue += invoice.total_amount || 0;
        acc.by_status[invoice.status] = (acc.by_status[invoice.status] || 0) + 1;

        if (invoice.status === 'paid') {
          acc.paid_count++;
          acc.paid_amount += invoice.total_amount || 0;
        } else if (invoice.status === 'partially_paid' || invoice.status === 'sent') {
          acc.outstanding_count++;
          acc.outstanding_amount += invoice.total_amount || 0;
        }

        return acc;
      }, {
        total_count: 0,
        total_revenue: 0,
        paid_count: 0,
        paid_amount: 0,
        outstanding_count: 0,
        outstanding_amount: 0,
        by_status: {} as Record<string, number>
      });

      return stats;
    }, 'Failed to fetch sales stats');
  }

  async getOverdueInvoices(companyId: string): Promise<SalesInvoiceWithDetails[]> {
    return this.executeQuery(async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          customers(id, name, code, email),
          sales_invoice_items(*)
        `)
        .eq('company_id', companyId)
        .in('status', ['sent', 'partially_paid'])
        .lt('due_date', today)
        .order('due_date');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch overdue invoices');
  }
}

export const salesInvoiceService = new SalesInvoiceService();
