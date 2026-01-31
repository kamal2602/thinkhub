import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ITADIntake = Database['public']['Tables']['itad_intakes']['Row'];
type ITADIntakeInsert = Database['public']['Tables']['itad_intakes']['Insert'];
type ITADRevenueSettlement = Database['public']['Tables']['itad_revenue_settlements']['Row'];
type ITADRevenueSettlementInsert = Database['public']['Tables']['itad_revenue_settlements']['Insert'];

export const itadRevenueService = {
  async getIntakes(companyId: string): Promise<ITADIntake[]> {
    const { data, error } = await supabase
      .from('itad_intakes')
      .select(`
        *,
        itad_project:itad_projects(project_name, customer:customers(name)),
        collection_request:collection_requests(estimated_quantity, pickup_date),
        receiving_log:receiving_logs(received_date)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getIntake(id: string): Promise<ITADIntake | null> {
    const { data, error } = await supabase
      .from('itad_intakes')
      .select(`
        *,
        itad_project:itad_projects(*),
        collection_request:collection_requests(*),
        receiving_log:receiving_logs(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createIntake(intake: ITADIntakeInsert): Promise<ITADIntake> {
    const { data, error } = await supabase
      .from('itad_intakes')
      .insert(intake)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateIntake(id: string, updates: Partial<ITADIntakeInsert>): Promise<ITADIntake> {
    const { data, error } = await supabase
      .from('itad_intakes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeIntake(id: string): Promise<ITADIntake> {
    const { data, error } = await supabase
      .from('itad_intakes')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSettlements(companyId: string): Promise<ITADRevenueSettlement[]> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .select(`
        *,
        itad_project:itad_projects(
          project_name,
          customer:customers(name, business_type)
        ),
        approved_by_profile:profiles!approved_by(full_name)
      `)
      .eq('company_id', companyId)
      .order('settlement_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSettlement(id: string): Promise<ITADRevenueSettlement | null> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .select(`
        *,
        itad_project:itad_projects(*),
        approved_by_profile:profiles!approved_by(full_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getSettlementsByProject(projectId: string): Promise<ITADRevenueSettlement[]> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .select('*')
      .eq('itad_project_id', projectId)
      .order('settlement_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createSettlement(settlement: ITADRevenueSettlementInsert): Promise<ITADRevenueSettlement> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .insert(settlement)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSettlement(id: string, updates: Partial<ITADRevenueSettlementInsert>): Promise<ITADRevenueSettlement> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async approveSettlement(id: string, approvedBy: string): Promise<ITADRevenueSettlement> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .update({
        payment_status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markSettlementPaid(id: string, paymentDate: string, paymentMethod: string, paymentReference?: string): Promise<ITADRevenueSettlement> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .update({
        payment_status: 'paid',
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async calculateProjectRevenue(projectId: string): Promise<{
    totalAssets: number;
    refurbishedRevenue: number;
    componentRevenue: number;
    scrapValue: number;
    totalRevenue: number;
  }> {
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('status, selling_price')
      .eq('itad_project_id', projectId);

    if (assetsError) throw assetsError;

    const refurbishedRevenue = assets
      ?.filter(a => a.status === 'sold')
      .reduce((sum, a) => sum + (a.selling_price || 0), 0) || 0;

    const { data: components, error: componentsError } = await supabase
      .from('component_sales')
      .select(`
        selling_price,
        harvested_component:harvested_components_inventory!inner(
          asset:assets!inner(itad_project_id)
        )
      `)
      .eq('harvested_component.asset.itad_project_id', projectId);

    if (componentsError) throw componentsError;

    const componentRevenue = components?.reduce((sum, c) => sum + (c.selling_price || 0), 0) || 0;

    const totalAssets = assets?.length || 0;
    const totalRevenue = refurbishedRevenue + componentRevenue;

    return {
      totalAssets,
      refurbishedRevenue,
      componentRevenue,
      scrapValue: 0,
      totalRevenue
    };
  },

  async generateSettlementForProject(
    projectId: string,
    companyId: string,
    settlementDate: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<ITADRevenueSettlement> {
    const { data: project, error: projectError } = await supabase
      .from('itad_projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError) throw projectError;
    if (!project) throw new Error('Project not found');

    const revenue = await this.calculateProjectRevenue(projectId);

    const { data: assetsCount } = await supabase
      .from('assets')
      .select('id, status', { count: 'exact', head: true })
      .eq('itad_project_id', projectId);

    const { data: refurbishedCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('itad_project_id', projectId)
      .eq('status', 'sold');

    const { data: harvestedCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('itad_project_id', projectId)
      .in('status', ['harvested', 'scrapped']);

    const serviceFeeAmount = project.service_fee || 0;
    const revenueSharePercentage = project.revenue_share_percentage || 0;
    const revenueShareThreshold = project.revenue_share_threshold || 0;

    const revenueSubjectToSharing = Math.max(0, revenue.totalRevenue - revenueShareThreshold);
    const customerRevenueShare = (revenueSubjectToSharing * revenueSharePercentage) / 100;
    const ourNetRevenue = revenue.totalRevenue - customerRevenueShare - serviceFeeAmount;

    const settlement: ITADRevenueSettlementInsert = {
      company_id: companyId,
      itad_project_id: projectId,
      settlement_date: settlementDate,
      settlement_period_start: periodStart || null,
      settlement_period_end: periodEnd || null,

      total_assets_received: assetsCount?.count || 0,
      total_assets_refurbished: refurbishedCount?.count || 0,
      total_assets_harvested: harvestedCount?.count || 0,
      total_assets_scrapped: 0,
      total_components_harvested: 0,

      refurbished_device_revenue: revenue.refurbishedRevenue,
      component_revenue: revenue.componentRevenue,
      scrap_value: revenue.scrapValue,
      other_revenue: 0,

      service_fee_amount: serviceFeeAmount,
      service_fee_percentage: null,
      revenue_share_percentage: revenueSharePercentage,
      revenue_share_threshold: revenueShareThreshold,

      revenue_subject_to_sharing: revenueSubjectToSharing,
      customer_revenue_share: customerRevenueShare,
      our_net_revenue: ourNetRevenue,

      payment_status: 'pending'
    };

    return this.createSettlement(settlement);
  },

  async getCustomerPortalSettlements(customerId: string): Promise<ITADRevenueSettlement[]> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .select(`
        *,
        itad_project:itad_projects!inner(
          project_name,
          itad_customer_id
        )
      `)
      .eq('itad_project.itad_customer_id', customerId)
      .order('settlement_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCustomerTotalRevenue(customerId: string): Promise<{
    totalSettlements: number;
    totalRevenue: number;
    totalPaid: number;
    pendingPayments: number;
  }> {
    const settlements = await this.getCustomerPortalSettlements(customerId);

    const totalSettlements = settlements.length;
    const totalRevenue = settlements.reduce((sum, s) => sum + (s.customer_revenue_share || 0), 0);
    const totalPaid = settlements
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.customer_revenue_share || 0), 0);
    const pendingPayments = totalRevenue - totalPaid;

    return {
      totalSettlements,
      totalRevenue,
      totalPaid,
      pendingPayments
    };
  }
};
