import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ComponentHarvesting = Database['public']['Tables']['component_harvesting']['Row'];
type ComponentHarvestingInsert = Database['public']['Tables']['component_harvesting']['Insert'];
type ComponentHarvestingItem = Database['public']['Tables']['component_harvesting_items']['Row'];
type ComponentHarvestingItemInsert = Database['public']['Tables']['component_harvesting_items']['Insert'];

export const componentHarvestingService = {
  async getHarvestings(companyId: string): Promise<ComponentHarvesting[]> {
    const { data, error } = await supabase
      .from('component_harvesting')
      .select(`
        *,
        source_asset:assets(serial_number, brand, model),
        component_harvesting_items(count)
      `)
      .eq('company_id', companyId)
      .order('harvest_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getHarvesting(id: string): Promise<ComponentHarvesting | null> {
    const { data, error } = await supabase
      .from('component_harvesting')
      .select(`
        *,
        source_asset:assets(*),
        source_purchase_lot:purchase_lots(*),
        component_harvesting_items(
          *,
          component:harvested_components_inventory(*)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createHarvesting(harvesting: ComponentHarvestingInsert): Promise<ComponentHarvesting> {
    const { data, error } = await supabase
      .from('component_harvesting')
      .insert(harvesting)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateHarvesting(id: string, updates: Partial<ComponentHarvestingInsert>): Promise<ComponentHarvesting> {
    const { data, error } = await supabase
      .from('component_harvesting')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addHarvestingItem(item: ComponentHarvestingItemInsert): Promise<ComponentHarvestingItem> {
    const { data, error } = await supabase
      .from('component_harvesting_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addHarvestingItems(items: ComponentHarvestingItemInsert[]): Promise<ComponentHarvestingItem[]> {
    const { data, error } = await supabase
      .from('component_harvesting_items')
      .insert(items)
      .select();

    if (error) throw error;
    return data || [];
  },

  async updateHarvestingItem(id: string, updates: Partial<ComponentHarvestingItemInsert>): Promise<ComponentHarvestingItem> {
    const { data, error } = await supabase
      .from('component_harvesting_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeHarvestingItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('component_harvesting_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getHarvestingItems(harvestingId: string): Promise<ComponentHarvestingItem[]> {
    const { data, error } = await supabase
      .from('component_harvesting_items')
      .select(`
        *,
        component:harvested_components_inventory(*)
      `)
      .eq('harvesting_id', harvestingId);

    if (error) throw error;
    return data || [];
  },

  async completeHarvesting(id: string): Promise<ComponentHarvesting> {
    const { data, error } = await supabase
      .from('component_harvesting')
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

  async allocateCostsByMethod(
    harvestingId: string,
    method: 'equal_split' | 'by_weight' | 'by_market_value' | 'by_percentage'
  ): Promise<void> {
    const harvesting = await this.getHarvesting(harvestingId);
    if (!harvesting) throw new Error('Harvesting not found');

    const items = await this.getHarvestingItems(harvestingId);
    if (items.length === 0) return;

    const totalCost = harvesting.total_cost_to_allocate;

    switch (method) {
      case 'equal_split': {
        const costPerItem = totalCost / items.length;
        for (const item of items) {
          await this.updateHarvestingItem(item.id, {
            allocated_cost: costPerItem,
            allocated_percentage: (100 / items.length)
          });
        }
        break;
      }

      case 'by_weight': {
        const totalWeight = items.reduce((sum, item) => sum + (item.weight_kg || 0), 0);
        if (totalWeight === 0) throw new Error('No weight data available');

        for (const item of items) {
          const weight = item.weight_kg || 0;
          const percentage = (weight / totalWeight) * 100;
          const allocatedCost = (totalCost * percentage) / 100;
          await this.updateHarvestingItem(item.id, {
            allocated_cost: allocatedCost,
            allocated_percentage: percentage
          });
        }
        break;
      }

      case 'by_market_value': {
        const totalMarketValue = items.reduce((sum, item) => sum + (item.market_value_at_harvest || 0), 0);
        if (totalMarketValue === 0) throw new Error('No market value data available');

        for (const item of items) {
          const marketValue = item.market_value_at_harvest || 0;
          const percentage = (marketValue / totalMarketValue) * 100;
          const allocatedCost = (totalCost * percentage) / 100;
          await this.updateHarvestingItem(item.id, {
            allocated_cost: allocatedCost,
            allocated_percentage: percentage
          });
        }
        break;
      }

      case 'by_percentage': {
        const totalPercentage = items.reduce((sum, item) => sum + (item.allocated_percentage || 0), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new Error('Percentages must sum to 100%');
        }

        for (const item of items) {
          const percentage = item.allocated_percentage || 0;
          const allocatedCost = (totalCost * percentage) / 100;
          await this.updateHarvestingItem(item.id, {
            allocated_cost: allocatedCost
          });
        }
        break;
      }
    }

    await this.updateHarvesting(harvestingId, { allocation_method: method });
  },

  async startHarvestingForAsset(
    companyId: string,
    assetId: string,
    createdBy: string
  ): Promise<ComponentHarvesting> {
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('po_unit_cost, refurbishment_cost, purchase_lot_id')
      .eq('id', assetId)
      .maybeSingle();

    if (assetError) throw assetError;
    if (!asset) throw new Error('Asset not found');

    const totalAssetCost = asset.po_unit_cost || 0;
    const totalRefurbCost = asset.refurbishment_cost || 0;

    const harvesting: ComponentHarvestingInsert = {
      company_id: companyId,
      source_asset_id: assetId,
      source_purchase_lot_id: asset.purchase_lot_id,
      total_asset_cost: totalAssetCost,
      total_refurb_cost: totalRefurbCost,
      allocation_method: 'manual',
      harvest_date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      created_by: createdBy
    };

    return this.createHarvesting(harvesting);
  },

  async getHarvestingsByAsset(assetId: string): Promise<ComponentHarvesting[]> {
    const { data, error } = await supabase
      .from('component_harvesting')
      .select('*')
      .eq('source_asset_id', assetId)
      .order('harvest_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getHarvestingsByLot(lotId: string): Promise<ComponentHarvesting[]> {
    const { data, error } = await supabase
      .from('component_harvesting')
      .select(`
        *,
        source_asset:assets(serial_number, brand, model)
      `)
      .eq('source_purchase_lot_id', lotId)
      .order('harvest_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
