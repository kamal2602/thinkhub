import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface EngineToggles {
  reseller_enabled: boolean;
  itad_enabled: boolean;
  recycling_enabled: boolean;
  auction_enabled: boolean;
  website_enabled: boolean;
  crm_enabled: boolean;
  consignment_enabled: boolean;
}

export interface Company {
  id: string;
  name: string;
  reseller_enabled: boolean;
  itad_enabled: boolean;
  recycling_enabled: boolean;
  auction_enabled: boolean;
  website_enabled: boolean;
  crm_enabled: boolean;
  consignment_enabled: boolean;
}

export class EngineService extends BaseService {
  /**
   * Get engine toggles for a specific company
   */
  async getEngineToggles(companyId: string): Promise<EngineToggles> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('reseller_enabled, itad_enabled, recycling_enabled, auction_enabled, website_enabled, crm_enabled, consignment_enabled')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch engine toggles');
  }

  /**
   * Update engine toggles for a company
   * Only admins should be able to call this
   */
  async updateEngineToggles(companyId: string, toggles: Partial<EngineToggles>): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('companies')
        .update(toggles)
        .eq('id', companyId);

      if (error) throw error;
    }, 'Failed to update engine toggles');
  }

  /**
   * Check if a specific engine is enabled
   */
  async isEngineEnabled(companyId: string, engine: keyof EngineToggles): Promise<boolean> {
    return this.executeQuery(async () => {
      const toggles = await this.getEngineToggles(companyId);
      return toggles[engine] ?? false;
    }, `Failed to check ${engine} status`);
  }

  /**
   * Get list of active engines for a company
   */
  async getActiveEngines(companyId: string): Promise<string[]> {
    return this.executeQuery(async () => {
      const toggles = await this.getEngineToggles(companyId);
      const activeEngines: string[] = [];

      if (toggles.reseller_enabled) activeEngines.push('reseller');
      if (toggles.itad_enabled) activeEngines.push('itad');
      if (toggles.recycling_enabled) activeEngines.push('recycling');
      if (toggles.auction_enabled) activeEngines.push('auction');
      if (toggles.website_enabled) activeEngines.push('website');
      if (toggles.crm_enabled) activeEngines.push('crm');
      if (toggles.consignment_enabled) activeEngines.push('consignment');

      return activeEngines;
    }, 'Failed to get active engines');
  }
}

export const engineService = new EngineService();
