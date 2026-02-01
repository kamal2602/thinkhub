import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';
import { engineRegistryService } from './engineRegistryService';

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
   * LEGACY: Now reads from engines table instead of companies
   */
  async getEngineToggles(companyId: string): Promise<EngineToggles> {
    return this.executeQuery(async () => {
      const engines = await engineRegistryService.getEngines(companyId);

      const toggles: EngineToggles = {
        reseller_enabled: engines.find(e => e.key === 'reseller')?.is_enabled ?? false,
        itad_enabled: engines.find(e => e.key === 'itad')?.is_enabled ?? false,
        recycling_enabled: engines.find(e => e.key === 'recycling')?.is_enabled ?? false,
        auction_enabled: engines.find(e => e.key === 'auction')?.is_enabled ?? false,
        website_enabled: engines.find(e => e.key === 'website')?.is_enabled ?? false,
        crm_enabled: engines.find(e => e.key === 'crm')?.is_enabled ?? false,
        consignment_enabled: false,
      };

      return toggles;
    }, 'Failed to fetch engine toggles');
  }

  /**
   * Update engine toggles for a company
   * LEGACY: Now updates engines table instead of companies
   */
  async updateEngineToggles(companyId: string, toggles: Partial<EngineToggles>): Promise<void> {
    return this.executeQuery(async () => {
      const updatePromises = [];

      if (toggles.reseller_enabled !== undefined) {
        updatePromises.push(
          engineRegistryService.toggleEngine(companyId, 'reseller', toggles.reseller_enabled)
        );
      }
      if (toggles.itad_enabled !== undefined) {
        updatePromises.push(
          engineRegistryService.toggleEngine(companyId, 'itad', toggles.itad_enabled)
        );
      }
      if (toggles.recycling_enabled !== undefined) {
        updatePromises.push(
          engineRegistryService.toggleEngine(companyId, 'recycling', toggles.recycling_enabled)
        );
      }
      if (toggles.auction_enabled !== undefined) {
        updatePromises.push(
          engineRegistryService.toggleEngine(companyId, 'auction', toggles.auction_enabled)
        );
      }
      if (toggles.website_enabled !== undefined) {
        updatePromises.push(
          engineRegistryService.toggleEngine(companyId, 'website', toggles.website_enabled)
        );
      }
      if (toggles.crm_enabled !== undefined) {
        updatePromises.push(
          engineRegistryService.toggleEngine(companyId, 'crm', toggles.crm_enabled)
        );
      }

      await Promise.all(updatePromises);
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
      const engines = await engineRegistryService.getEnabledEngines(companyId);
      return engines.map(e => e.key);
    }, 'Failed to get active engines');
  }
}

export const engineService = new EngineService();
