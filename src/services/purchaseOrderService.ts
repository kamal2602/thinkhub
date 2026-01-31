import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  company_id: string;
  status: string;
  total_amount: number;
  currency: string;
  order_date: string;
  expected_delivery_date?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  product_type_id: string;
  serial_number?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  brand?: string;
  model?: string;
  condition?: string;
  notes?: string;
}

export interface CreatePurchaseOrderInput {
  supplier_id: string;
  company_id: string;
  order_date: string;
  expected_delivery_date?: string;
  currency?: string;
  notes?: string;
  lines: Omit<PurchaseOrderLine, 'id' | 'purchase_order_id'>[];
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: any;
  lines: any[];
  purchase_lot?: any;
}

export class PurchaseOrderService extends BaseService {
  async getPurchaseOrders(companyId: string, filters?: {
    status?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseOrderWithDetails[]> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(id, name, code),
          purchase_order_lines(*),
          purchase_lots(id, lot_number, status)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.startDate) {
        query = query.gte('order_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('order_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 'Failed to fetch purchase orders');
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrderWithDetails | null> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(id, name, code, email, phone),
          purchase_order_lines(
            *,
            product_types(id, name)
          ),
          purchase_lots(id, lot_number, status),
          profiles(full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch purchase order');
  }

  async createPurchaseOrder(input: CreatePurchaseOrderInput, userId: string): Promise<PurchaseOrder> {
    return this.executeQuery(async () => {
      const poNumber = await this.generatePONumber(input.company_id);

      const totalAmount = input.lines.reduce((sum, line) => sum + line.total_price, 0);

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: input.supplier_id,
          company_id: input.company_id,
          status: 'draft',
          total_amount: totalAmount,
          currency: input.currency || 'USD',
          order_date: input.order_date,
          expected_delivery_date: input.expected_delivery_date,
          notes: input.notes,
          created_by: userId
        })
        .select()
        .single();

      if (poError) throw poError;

      const lines = input.lines.map(line => ({
        ...line,
        purchase_order_id: po.id
      }));

      const { error: linesError } = await supabase
        .from('purchase_order_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return po;
    }, 'Failed to create purchase order');
  }

  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to update purchase order');
  }

  async submitPurchaseOrder(id: string, userId: string): Promise<PurchaseOrder> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to submit purchase order');
  }

  async approvePurchaseOrder(id: string, userId: string): Promise<PurchaseOrder> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to approve purchase order');
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error: linesError } = await supabase
        .from('purchase_order_lines')
        .delete()
        .eq('purchase_order_id', id);

      if (linesError) throw linesError;

      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'Failed to delete purchase order');
  }

  async addPurchaseOrderLine(poId: string, line: Omit<PurchaseOrderLine, 'id' | 'purchase_order_id'>): Promise<PurchaseOrderLine> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('purchase_order_lines')
        .insert({
          ...line,
          purchase_order_id: poId
        })
        .select()
        .single();

      if (error) throw error;

      await this.updatePOTotal(poId);

      return data;
    }, 'Failed to add purchase order line');
  }

  async updatePurchaseOrderLine(lineId: string, updates: Partial<PurchaseOrderLine>): Promise<PurchaseOrderLine> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('purchase_order_lines')
        .update(updates)
        .eq('id', lineId)
        .select()
        .single();

      if (error) throw error;

      await this.updatePOTotal(data.purchase_order_id);

      return data;
    }, 'Failed to update purchase order line');
  }

  async deletePurchaseOrderLine(lineId: string): Promise<void> {
    return this.executeQuery(async () => {
      const { data: line } = await supabase
        .from('purchase_order_lines')
        .select('purchase_order_id')
        .eq('id', lineId)
        .single();

      const { error } = await supabase
        .from('purchase_order_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      if (line) {
        await this.updatePOTotal(line.purchase_order_id);
      }
    }, 'Failed to delete purchase order line');
  }

  private async updatePOTotal(poId: string): Promise<void> {
    const { data: lines } = await supabase
      .from('purchase_order_lines')
      .select('total_price')
      .eq('purchase_order_id', poId);

    const total = (lines || []).reduce((sum, line) => sum + (line.total_price || 0), 0);

    await supabase
      .from('purchase_orders')
      .update({ total_amount: total })
      .eq('id', poId);
  }

  private async generatePONumber(companyId: string): Promise<string> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const lastPO = data?.[0];
    if (!lastPO) {
      return 'PO-000001';
    }

    const lastNumber = parseInt(lastPO.po_number.split('-')[1] || '0');
    const nextNumber = lastNumber + 1;
    return `PO-${nextNumber.toString().padStart(6, '0')}`;
  }

  async getPurchaseOrderStats(companyId: string, startDate?: string, endDate?: string): Promise<any> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('purchase_orders')
        .select('id, status, total_amount, order_date')
        .eq('company_id', companyId);

      if (startDate) query = query.gte('order_date', startDate);
      if (endDate) query = query.lte('order_date', endDate);

      const { data, error } = await query;
      if (error) throw error;

      const stats = (data || []).reduce((acc, po) => {
        acc.total_count++;
        acc.total_amount += po.total_amount || 0;
        acc.by_status[po.status] = (acc.by_status[po.status] || 0) + 1;
        return acc;
      }, {
        total_count: 0,
        total_amount: 0,
        by_status: {} as Record<string, number>
      });

      return stats;
    }, 'Failed to fetch purchase order stats');
  }
}

export const purchaseOrderService = new PurchaseOrderService();
