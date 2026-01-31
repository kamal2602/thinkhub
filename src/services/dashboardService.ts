import { BaseService, AppError } from './baseService';

export interface DashboardMetrics {
  totalAssets: number;
  assetsByStatus: Record<string, number>;
  agingInventory: {
    over30Days: number;
    over60Days: number;
    over90Days: number;
  };
  monthlyRevenue: number;
  monthlyProfit: number;
  averageMargin: number;
  processingVelocity: number;
  topPerformingLots: Array<{
    lot_number: string;
    roi: number;
    profit: number;
    total_cost: number;
    total_revenue: number;
  }>;
  exceptions: {
    duplicateSerials: number;
    stuckInProcessing: number;
    negativeStock: number;
    recentReturnsSpike: boolean;
  };
  topSuppliers: Array<{
    id: string;
    name: string;
    total_purchases: number;
    total_spent: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    total_orders: number;
    total_revenue: number;
  }>;
}

export class DashboardService extends BaseService {
  async getMetrics(companyId: string): Promise<DashboardMetrics> {
    try {
      const [
        totalAssets,
        assetsByStatus,
        agingInventory,
        monthlyFinancials,
        processingVelocity,
        topLots,
        exceptions,
        topSuppliers,
        topCustomers
      ] = await Promise.all([
        this.getTotalAssets(companyId),
        this.getAssetsByStatus(companyId),
        this.getAgingInventory(companyId),
        this.getMonthlyFinancials(companyId),
        this.getProcessingVelocity(companyId),
        this.getTopPerformingLots(companyId),
        this.getExceptions(companyId),
        this.getTopSuppliers(companyId),
        this.getTopCustomers(companyId)
      ]);

      return {
        totalAssets,
        assetsByStatus,
        agingInventory,
        monthlyRevenue: monthlyFinancials.revenue,
        monthlyProfit: monthlyFinancials.profit,
        averageMargin: monthlyFinancials.margin,
        processingVelocity,
        topPerformingLots: topLots,
        exceptions,
        topSuppliers,
        topCustomers
      };
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to fetch dashboard metrics', error);
    }
  }

  private async getTotalAssets(companyId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (error) this.handleError(error, 'count assets');
    return count || 0;
  }

  private async getAssetsByStatus(companyId: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('assets')
      .select('status')
      .eq('company_id', companyId);

    if (error) this.handleError(error, 'fetch assets by status');

    const statusCounts: Record<string, number> = {};
    data?.forEach(asset => {
      statusCounts[asset.status || 'unknown'] = (statusCounts[asset.status || 'unknown'] || 0) + 1;
    });

    return statusCounts;
  }

  private async getAgingInventory(companyId: string): Promise<{
    over30Days: number;
    over60Days: number;
    over90Days: number;
  }> {
    const now = new Date();
    const date30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const date60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const date90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [over30, over60, over90] = await Promise.all([
      this.supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['ready', 'listed'])
        .lt('created_at', date30),
      this.supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['ready', 'listed'])
        .lt('created_at', date60),
      this.supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['ready', 'listed'])
        .lt('created_at', date90)
    ]);

    return {
      over30Days: over30.count || 0,
      over60Days: over60.count || 0,
      over90Days: over90.count || 0
    };
  }

  private async getMonthlyFinancials(companyId: string): Promise<{
    revenue: number;
    profit: number;
    margin: number;
  }> {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const { data: invoices, error } = await this.supabase
      .from('sales_invoices')
      .select('total_amount, cost_amount')
      .eq('company_id', companyId)
      .gte('invoice_date', firstOfMonth.toISOString());

    if (error) this.handleError(error, 'fetch monthly financials');

    const revenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
    const cost = invoices?.reduce((sum, inv) => sum + (inv.cost_amount || 0), 0) || 0;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, profit, margin };
  }

  private async getProcessingVelocity(companyId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('assets')
      .select('created_at, updated_at, status')
      .eq('company_id', companyId)
      .in('status', ['ready', 'listed', 'sold']);

    if (error) this.handleError(error, 'fetch processing velocity');

    if (!data || data.length === 0) return 0;

    const totalDays = data.reduce((sum, asset) => {
      const created = new Date(asset.created_at);
      const updated = new Date(asset.updated_at);
      const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round(totalDays / data.length);
  }

  private async getTopPerformingLots(companyId: string): Promise<Array<{
    lot_number: string;
    roi: number;
    profit: number;
    total_cost: number;
    total_revenue: number;
  }>> {
    const { data, error } = await this.supabase
      .from('purchase_lots')
      .select('lot_number, total_cost, total_revenue')
      .eq('company_id', companyId)
      .not('total_revenue', 'is', null)
      .order('total_revenue', { ascending: false })
      .limit(5);

    if (error) this.handleError(error, 'fetch top performing lots');

    return (data || []).map(lot => ({
      lot_number: lot.lot_number,
      total_cost: lot.total_cost || 0,
      total_revenue: lot.total_revenue || 0,
      profit: (lot.total_revenue || 0) - (lot.total_cost || 0),
      roi: lot.total_cost > 0 ? ((lot.total_revenue || 0) - lot.total_cost) / lot.total_cost * 100 : 0
    }));
  }

  private async getExceptions(companyId: string): Promise<{
    duplicateSerials: number;
    stuckInProcessing: number;
    negativeStock: number;
    recentReturnsSpike: boolean;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [duplicates, stuck, returns] = await Promise.all([
      this.getDuplicateSerials(companyId),
      this.getStuckInProcessing(companyId),
      this.getRecentReturns(companyId)
    ]);

    return {
      duplicateSerials: duplicates,
      stuckInProcessing: stuck,
      negativeStock: 0,
      recentReturnsSpike: returns > 10
    };
  }

  private async getDuplicateSerials(companyId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('assets')
      .select('serial_number')
      .eq('company_id', companyId);

    if (error) return 0;

    const serialCounts = new Map<string, number>();
    data?.forEach(asset => {
      if (asset.serial_number) {
        serialCounts.set(asset.serial_number, (serialCounts.get(asset.serial_number) || 0) + 1);
      }
    });

    return Array.from(serialCounts.values()).filter(count => count > 1).length;
  }

  private async getStuckInProcessing(companyId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count, error } = await this.supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['testing', 'refurbishing', 'qc_grading'])
      .lt('stage_started_at', thirtyDaysAgo.toISOString());

    if (error) return 0;
    return count || 0;
  }

  private async getRecentReturns(companyId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count, error } = await this.supabase
      .from('returns')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('return_date', thirtyDaysAgo.toISOString());

    if (error) return 0;
    return count || 0;
  }

  private async getTopSuppliers(companyId: string): Promise<Array<{
    id: string;
    name: string;
    total_purchases: number;
    total_spent: number;
  }>> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .select(`
        id,
        name,
        purchase_orders(total_amount)
      `)
      .eq('company_id', companyId);

    if (error) this.handleError(error, 'fetch top suppliers');

    const suppliers = (data || []).map(supplier => {
      const orders = (supplier.purchase_orders as any) || [];
      return {
        id: supplier.id,
        name: supplier.name,
        total_purchases: orders.length,
        total_spent: orders.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0)
      };
    });

    return suppliers.sort((a, b) => b.total_spent - a.total_spent).slice(0, 5);
  }

  private async getTopCustomers(companyId: string): Promise<Array<{
    id: string;
    name: string;
    total_orders: number;
    total_revenue: number;
  }>> {
    const { data, error } = await this.supabase
      .from('customers')
      .select(`
        id,
        name,
        sales_invoices(total_amount)
      `)
      .eq('company_id', companyId);

    if (error) this.handleError(error, 'fetch top customers');

    const customers = (data || []).map(customer => {
      const invoices = (customer.sales_invoices as any) || [];
      return {
        id: customer.id,
        name: customer.name,
        total_orders: invoices.length,
        total_revenue: invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
      };
    });

    return customers.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5);
  }
}

export const dashboardService = new DashboardService();
