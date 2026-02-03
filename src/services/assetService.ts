import { BaseService, AppError } from './baseService';
import type { Database } from '../lib/database.types';

type Asset = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

export interface AssetFilters {
  status?: string;
  search?: string;
  brandId?: string;
  productTypeId?: string;
  locationId?: string;
  purchaseLotId?: string;
  processingStage?: string;
  intakeType?: 'resale' | 'itad' | 'recycling';
  limit?: number;
  offset?: number;
}

export class AssetService extends BaseService {
  async getAssetsByCompany(
    companyId: string,
    filters?: AssetFilters
  ): Promise<{ data: Asset[]; count: number }> {
    try {
      let query = this.supabase
        .from('assets')
        .select(`
          *,
          product_types(id, name),
          profiles(id, full_name),
          purchase_lots(id, lot_number)
        `, { count: 'exact' })
        .eq('company_id', companyId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.processingStage) {
        query = query.eq('processing_stage', filters.processingStage);
      }

      if (filters?.search) {
        query = query.or(`serial_number.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
      }

      if (filters?.brandId) {
        query = query.eq('brand_id', filters.brandId);
      }

      if (filters?.productTypeId) {
        query = query.eq('product_type_id', filters.productTypeId);
      }

      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      if (filters?.purchaseLotId) {
        query = query.eq('purchase_lot_id', filters.purchaseLotId);
      }

      if (filters?.intakeType) {
        query = query.eq('intake_type', filters.intakeType);
      }

      if (filters?.limit) {
        query = query.range(
          filters.offset || 0,
          (filters.offset || 0) + filters.limit - 1
        );
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) {
        this.handleError(error, 'fetch assets');
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to fetch assets', error);
    }
  }

  async getAssetById(id: string): Promise<Asset | null> {
    try {
      const { data, error } = await this.supabase
        .from('assets')
        .select(`
          *,
          product_types(id, name),
          profiles(id, full_name),
          purchase_lots(id, lot_number),
          locations(id, name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.handleError(error, 'fetch asset');
      }

      return data;
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to fetch asset', error);
    }
  }

  async createAsset(asset: AssetInsert): Promise<Asset> {
    try {
      const { data, error } = await this.supabase
        .from('assets')
        .insert([asset])
        .select()
        .single();

      if (error) {
        this.handleError(error, 'create asset');
      }

      if (!data) {
        throw new AppError('No data returned after creating asset');
      }

      return data;
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to create asset', error);
    }
  }

  async updateAsset(id: string, updates: AssetUpdate): Promise<Asset> {
    try {
      const { data, error } = await this.supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.handleError(error, 'update asset');
      }

      if (!data) {
        throw new AppError('Asset not found');
      }

      return data;
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to update asset', error);
    }
  }

  async deleteAsset(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) {
        this.handleError(error, 'delete asset');
      }
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to delete asset', error);
    }
  }

  async bulkCreateAssets(
    assets: AssetInsert[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<Asset[]> {
    const batchSize = 100;
    const results: Asset[] = [];

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);

      try {
        const { data, error } = await this.supabase
          .from('assets')
          .insert(batch)
          .select();

        if (error) {
          console.error(`Batch ${i / batchSize + 1} failed:`, error);
          throw error;
        }

        if (data) {
          results.push(...data);
        }

        onProgress?.(Math.min(i + batchSize, assets.length), assets.length);
      } catch (error) {
        throw new AppError(
          `Bulk import failed at row ${i + 1}`,
          error
        );
      }
    }

    return results;
  }

  async bulkUpdateAssets(
    updates: Array<{ id: string; updates: AssetUpdate }>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < updates.length; i++) {
      const { id, updates: assetUpdates } = updates[i];
      await this.updateAsset(id, assetUpdates);
      onProgress?.(i + 1, updates.length);
    }
  }

  async updateAssetStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<Asset> {
    return this.updateAsset(id, {
      status,
      processing_notes: notes,
      stage_started_at: new Date().toISOString()
    });
  }

  async getAgingInventory(companyId: string, daysThreshold: number): Promise<Asset[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const { data, error } = await this.supabase
        .from('assets')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['ready', 'listed'])
        .lt('created_at', thresholdDate.toISOString());

      if (error) {
        this.handleError(error, 'fetch aging inventory');
      }

      return data || [];
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to fetch aging inventory', error);
    }
  }

  async getStuckInProcessing(companyId: string, daysThreshold: number): Promise<Asset[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const { data, error } = await this.supabase
        .from('assets')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['testing', 'refurbishing', 'qc_grading'])
        .lt('stage_started_at', thresholdDate.toISOString());

      if (error) {
        this.handleError(error, 'fetch stuck assets');
      }

      return data || [];
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError('Failed to fetch stuck assets', error);
    }
  }
}

export const assetService = new AssetService();
