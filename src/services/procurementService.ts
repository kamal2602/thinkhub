import { supabase } from '../lib/supabase';

export type IntakeType = 'resale' | 'itad' | 'recycling';
export type CommercialModel = 'we_buy' | 'client_pays' | 'hybrid';
export type ProcessingIntent = 'resale' | 'recycle' | 'hybrid';
export type SourceChannel = 'manual' | 'excel' | 'portal' | 'website' | 'api';

export interface CreateIntakeParams {
  companyId: string;
  intakeType: IntakeType;
  commercialModel: CommercialModel;
  processingIntent: ProcessingIntent;

  // For resale (we_buy):
  supplierId?: string;

  // For ITAD/Recycling (client_pays):
  clientPartyId?: string;

  // Common:
  expectedDeliveryDate?: string;
  notes?: string;
  sourceChannel?: SourceChannel;

  // ITAD specific:
  itadProjectName?: string;
  serviceFee?: number;
  revenueSharePercentage?: number;

  // Recycling specific:
  expectedWeightKg?: number;
}

export class ProcurementService {
  /**
   * Create a new intake (resale, ITAD, or recycling)
   * This is the SINGLE entry point for all inbound flows
   */
  async createIntake(params: CreateIntakeParams) {
    const {
      companyId,
      intakeType,
      commercialModel,
      processingIntent,
      supplierId,
      clientPartyId,
      expectedDeliveryDate,
      notes,
      sourceChannel = 'manual',
      itadProjectName,
      serviceFee,
      revenueSharePercentage,
      expectedWeightKg
    } = params;

    // 1. Generate PO number
    const poNumber = await this.generatePONumber(companyId, intakeType);

    // 2. Create purchase_order
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        company_id: companyId,
        po_number: poNumber,
        intake_type: intakeType,
        commercial_model: commercialModel,
        processing_intent: processingIntent,
        supplier_id: supplierId,
        client_party_id: clientPartyId,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: expectedDeliveryDate,
        status: 'draft',
        source_channel: sourceChannel,
        notes: notes
      })
      .select()
      .single();

    if (poError) throw poError;

    // 3. Create purchase_lot explicitly
    const { data: lot, error: lotError } = await supabase
      .from('purchase_lots')
      .insert({
        company_id: companyId,
        lot_number: `LOT-${poNumber}`,
        purchase_order_id: po.id,
        purchase_date: po.order_date,
        receiving_status: 'waiting',
        expected_weight_kg: expectedWeightKg
      })
      .select()
      .single();

    if (lotError) throw lotError;

    // 4. Create detail records based on type
    if (intakeType === 'itad') {
      await this.createITADProjectDetail(po.id, companyId, {
        projectName: itadProjectName,
        customerId: clientPartyId!,
        serviceFee,
        revenueSharePercentage
      });
    }

    if (intakeType === 'recycling') {
      await this.createRecyclingOrderDetail(po.id, companyId, {
        contactId: clientPartyId || supplierId,
        expectedWeightKg,
        processingIntent
      });
    }

    return {
      purchaseOrder: po,
      purchaseLot: lot
    };
  }

  private async generatePONumber(companyId: string, intakeType: IntakeType) {
    const prefix = intakeType === 'itad' ? 'ITAD' : intakeType === 'recycling' ? 'REC' : 'PO';

    const { count } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('intake_type', intakeType);

    return `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`;
  }

  private async createITADProjectDetail(
    purchaseOrderId: string,
    companyId: string,
    params: {
      projectName?: string;
      customerId: string;
      serviceFee?: number;
      revenueSharePercentage?: number;
    }
  ) {
    const projectNumber = purchaseOrderId.slice(-8);

    const { data, error } = await supabase
      .from('itad_projects')
      .insert({
        company_id: companyId,
        purchase_order_id: purchaseOrderId,
        project_number: projectNumber,
        project_name: params.projectName || `ITAD Project ${projectNumber}`,
        itad_customer_id: params.customerId,
        service_fee: params.serviceFee || 0,
        revenue_share_percentage: params.revenueSharePercentage || 0,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async createRecyclingOrderDetail(
    purchaseOrderId: string,
    companyId: string,
    params: {
      contactId?: string;
      expectedWeightKg?: number;
      processingIntent: ProcessingIntent;
    }
  ) {
    const orderNumber = purchaseOrderId.slice(-8);

    const { data, error } = await supabase
      .from('recycling_orders')
      .insert({
        company_id: companyId,
        purchase_order_id: purchaseOrderId,
        order_number: orderNumber,
        contact_id: params.contactId,
        expected_weight: params.expectedWeightKg,
        processing_intent: params.processingIntent === 'resale' ? 'hybrid_resale' : 'recycle_only',
        order_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get incoming batches for receiving
   * Used by Receiving app to show unified list
   */
  async getInboundBatches(companyId: string, filters?: {
    intakeType?: IntakeType;
    status?: string;
  }) {
    let query = supabase
      .from('purchase_lots')
      .select(`
        *,
        purchase_order:purchase_orders(
          id,
          po_number,
          intake_type,
          commercial_model,
          supplier:suppliers(id, name),
          client:contacts!client_party_id(id, name)
        )
      `)
      .eq('company_id', companyId)
      .order('purchase_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('receiving_status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter by intake_type in memory (Supabase doesn't support nested filtering in this query)
    let filteredData = data || [];
    if (filters?.intakeType) {
      filteredData = filteredData.filter((lot: any) =>
        lot.purchase_order?.intake_type === filters.intakeType
      );
    }

    return filteredData.map((lot: any) => ({
      ...lot,
      counterpartyName: lot.purchase_order?.supplier?.name || lot.purchase_order?.client?.name || 'Unknown'
    }));
  }

  /**
   * Get purchase order with full details
   */
  async getPurchaseOrder(id: string) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name),
        client:contacts!client_party_id(id, name),
        lots:purchase_lots(id, lot_number, receiving_status, expected_qty, expected_weight_kg, actual_weight_kg),
        itad_project:itad_projects(id, project_name, project_number, service_fee, status),
        recycling_order:recycling_orders(id, order_number, expected_weight, total_weight, status)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all purchase orders with filtering
   */
  async getPurchaseOrders(companyId: string, filters?: {
    intakeType?: IntakeType;
    status?: string;
  }) {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name),
        client:contacts!client_party_id(id, name)
      `)
      .eq('company_id', companyId)
      .order('order_date', { ascending: false });

    if (filters?.intakeType) {
      query = query.eq('intake_type', filters.intakeType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
  }
}

export const procurementService = new ProcurementService();
