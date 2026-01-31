import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface StockLevel {
  product_type_id: string;
  product_type_name: string;
  total_stock: number;
  available_stock: number;
  sold_stock: number;
  status_breakdown: {
    ready: number;
    listed: number;
    sold: number;
  };
}

export interface LowStockItem {
  product_type_id: string;
  product_type_name: string;
  current_stock: number;
  threshold: number;
  status: 'critical' | 'warning' | 'ok';
}

export interface AgingInventoryItem {
  asset_id: string;
  serial_number: string;
  brand: string;
  model: string;
  product_type: string;
  days_in_stock: number;
  purchase_price: number;
  status: string;
  age_category: '0-30' | '31-60' | '61-90' | '90+';
}

export interface AgingInventoryData {
  days30: number;
  days60: number;
  days90: number;
  days90plus: number;
  total: number;
  items: AgingInventoryItem[];
}

export interface InventoryValuation {
  total_assets: number;
  total_cost: number;
  total_estimated_value: number;
  by_status: {
    status: string;
    count: number;
    total_cost: number;
  }[];
}

export class InventoryService extends BaseService {
  async getStockLevels(companyId: string): Promise<StockLevel[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          product_type_id,
          product_types(name),
          status
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      const grouped = (data || []).reduce((acc, item) => {
        const ptId = item.product_type_id;
        if (!acc[ptId]) {
          acc[ptId] = {
            product_type_id: ptId,
            product_type_name: item.product_types?.name || 'Unknown',
            total_stock: 0,
            available_stock: 0,
            sold_stock: 0,
            status_breakdown: { ready: 0, listed: 0, sold: 0 }
          };
        }

        acc[ptId].total_stock++;

        if (item.status === 'sold') {
          acc[ptId].sold_stock++;
        } else {
          acc[ptId].available_stock++;
        }

        if (['ready', 'listed', 'sold'].includes(item.status)) {
          acc[ptId].status_breakdown[item.status as 'ready' | 'listed' | 'sold']++;
        }

        return acc;
      }, {} as Record<string, StockLevel>);

      return Object.values(grouped);
    }, 'Failed to fetch stock levels');
  }

  async getLowStockItems(companyId: string, threshold = 10): Promise<LowStockItem[]> {
    return this.executeQuery(async () => {
      const stockLevels = await this.getStockLevels(companyId);

      return stockLevels
        .map(item => ({
          product_type_id: item.product_type_id,
          product_type_name: item.product_type_name,
          current_stock: item.available_stock,
          threshold,
          status: item.available_stock === 0 ? 'critical' :
                  item.available_stock <= threshold / 2 ? 'warning' : 'ok'
        } as LowStockItem))
        .filter(item => item.current_stock <= threshold)
        .sort((a, b) => a.current_stock - b.current_stock);
    }, 'Failed to fetch low stock items');
  }

  async getAgingInventory(companyId: string, categories = [30, 60, 90]): Promise<AgingInventoryData> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          serial_number,
          brand,
          model,
          purchase_price,
          status,
          created_at,
          product_types(name)
        `)
        .eq('company_id', companyId)
        .in('status', ['ready', 'listed', 'refurbishing', 'qc_grading']);

      if (error) throw error;

      const now = new Date();
      const items: AgingInventoryItem[] = (data || []).map(asset => {
        const createdAt = new Date(asset.created_at);
        const daysInStock = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        let ageCategory: '0-30' | '31-60' | '61-90' | '90+' = '0-30';
        if (daysInStock > 90) ageCategory = '90+';
        else if (daysInStock > 60) ageCategory = '61-90';
        else if (daysInStock > 30) ageCategory = '31-60';

        return {
          asset_id: asset.id,
          serial_number: asset.serial_number,
          brand: asset.brand,
          model: asset.model,
          product_type: asset.product_types?.name || 'Unknown',
          days_in_stock: daysInStock,
          purchase_price: asset.purchase_price || 0,
          status: asset.status,
          age_category: ageCategory
        };
      });

      const summary = items.reduce((acc, item) => {
        if (item.days_in_stock <= 30) acc.days30++;
        else if (item.days_in_stock <= 60) acc.days60++;
        else if (item.days_in_stock <= 90) acc.days90++;
        else acc.days90plus++;
        acc.total++;
        return acc;
      }, { days30: 0, days60: 0, days90: 0, days90plus: 0, total: 0 });

      return { ...summary, items };
    }, 'Failed to fetch aging inventory');
  }

  async getInventoryValuation(companyId: string): Promise<InventoryValuation> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, purchase_price, status, sale_price')
        .eq('company_id', companyId);

      if (error) throw error;

      const assets = data || [];
      const byStatus = assets.reduce((acc, asset) => {
        if (!acc[asset.status]) {
          acc[asset.status] = { status: asset.status, count: 0, total_cost: 0 };
        }
        acc[asset.status].count++;
        acc[asset.status].total_cost += asset.purchase_price || 0;
        return acc;
      }, {} as Record<string, { status: string; count: number; total_cost: number }>);

      const totalCost = assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
      const totalEstimatedValue = assets.reduce((sum, a) => sum + (a.sale_price || a.purchase_price || 0), 0);

      return {
        total_assets: assets.length,
        total_cost: totalCost,
        total_estimated_value: totalEstimatedValue,
        by_status: Object.values(byStatus)
      };
    }, 'Failed to fetch inventory valuation');
  }

  async getInventoryTurnoverRate(companyId: string, days = 90): Promise<number> {
    return this.executeQuery(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: soldAssets, error: soldError } = await supabase
        .from('assets')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'sold')
        .gte('updated_at', startDate.toISOString());

      if (soldError) throw soldError;

      const { data: allAssets, error: allError } = await supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (allError) throw allError;

      const soldCount = soldAssets?.length || 0;
      const totalCount = allAssets || 0;

      return totalCount > 0 ? (soldCount / totalCount) * 100 : 0;
    }, 'Failed to calculate inventory turnover rate');
  }

  async getStockMovements(companyId: string, days = 30): Promise<any[]> {
    return this.executeQuery(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          assets(serial_number, brand, model),
          from_location:locations!stock_movements_from_location_id_fkey(name),
          to_location:locations!stock_movements_to_location_id_fkey(name),
          profiles(full_name)
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch stock movements');
  }

  async getNegativeStockWarnings(companyId: string): Promise<any[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('product_types')
        .select(`
          id,
          name,
          minimum_stock_level
        `)
        .eq('company_id', companyId);

      if (error) throw error;

      const warnings = [];
      for (const pt of data || []) {
        const { count, error: countError } = await supabase
          .from('assets')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('product_type_id', pt.id)
          .neq('status', 'sold');

        if (!countError && count !== null && count < (pt.minimum_stock_level || 0)) {
          warnings.push({
            product_type_id: pt.id,
            product_type_name: pt.name,
            current_stock: count,
            minimum_level: pt.minimum_stock_level,
            shortage: (pt.minimum_stock_level || 0) - count
          });
        }
      }

      return warnings;
    }, 'Failed to fetch negative stock warnings');
  }
}

export const inventoryService = new InventoryService();
