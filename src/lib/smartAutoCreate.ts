import { supabase } from './supabase';
import { createImportIntelligenceService } from './importIntelligence';

export interface AutoCreateResult {
  id: string;
  name: string;
  wasCreated: boolean;
  aliasesCreated: string[];
}

export interface PendingEntity {
  type: 'product_type' | 'supplier' | 'customer' | 'location';
  originalValue: string;
  normalizedValue: string;
}

export class SmartAutoCreateService {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  normalizeValue(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async findOrCreateProductType(
    originalValue: string,
    aliases: string[] = []
  ): Promise<AutoCreateResult> {
    const normalized = this.normalizeValue(originalValue);

    const { data: existing } = await supabase
      .from('product_types')
      .select('id, name')
      .eq('company_id', this.companyId)
      .ilike('name', normalized)
      .maybeSingle();

    if (existing) {
      if (aliases.length > 0) {
        await this.createAliasesForProductType(existing.id, aliases);
      }
      return {
        id: existing.id,
        name: existing.name,
        wasCreated: false,
        aliasesCreated: aliases,
      };
    }

    const { data: newProductType, error } = await supabase
      .from('product_types')
      .insert({
        company_id: this.companyId,
        name: normalized,
        is_active: true,
      })
      .select('id, name')
      .single();

    if (error) throw error;

    if (aliases.length > 0) {
      await this.createAliasesForProductType(newProductType.id, aliases);
    }

    await this.createIntelligenceRule('product_type', originalValue, newProductType.id, 'product_types');

    return {
      id: newProductType.id,
      name: newProductType.name,
      wasCreated: true,
      aliasesCreated: aliases,
    };
  }

  async linkToExistingProductType(
    originalValue: string,
    existingId: string,
    createAlias: boolean
  ): Promise<void> {
    if (createAlias) {
      await this.createAliasesForProductType(existingId, [originalValue]);
    }
    await this.createIntelligenceRule('product_type', originalValue, existingId, 'product_types');
  }


  async findOrCreateSupplier(
    originalValue: string,
    aliases: string[] = []
  ): Promise<AutoCreateResult> {
    const normalized = this.normalizeValue(originalValue);

    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('company_id', this.companyId)
      .ilike('name', normalized)
      .maybeSingle();

    if (existing) {
      if (aliases.length > 0) {
        await this.createIntelligenceRulesForSupplier(existing.id, aliases);
      }
      return {
        id: existing.id,
        name: existing.name,
        wasCreated: false,
        aliasesCreated: aliases,
      };
    }

    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert({
        company_id: this.companyId,
        name: normalized,
      })
      .select('id, name')
      .single();

    if (error) throw error;

    await this.createIntelligenceRule('supplier', originalValue, newSupplier.id, 'suppliers');

    if (aliases.length > 0) {
      await this.createIntelligenceRulesForSupplier(newSupplier.id, aliases);
    }

    return {
      id: newSupplier.id,
      name: newSupplier.name,
      wasCreated: true,
      aliasesCreated: aliases,
    };
  }

  async findOrCreateCustomer(
    originalValue: string,
    aliases: string[] = []
  ): Promise<AutoCreateResult> {
    const normalized = this.normalizeValue(originalValue);

    const { data: existing } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', this.companyId)
      .ilike('name', normalized)
      .maybeSingle();

    if (existing) {
      if (aliases.length > 0) {
        await this.createIntelligenceRulesForCustomer(existing.id, aliases);
      }
      return {
        id: existing.id,
        name: existing.name,
        wasCreated: false,
        aliasesCreated: aliases,
      };
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        company_id: this.companyId,
        name: normalized,
      })
      .select('id, name')
      .single();

    if (error) throw error;

    await this.createIntelligenceRule('customer', originalValue, newCustomer.id, 'customers');

    if (aliases.length > 0) {
      await this.createIntelligenceRulesForCustomer(newCustomer.id, aliases);
    }

    return {
      id: newCustomer.id,
      name: newCustomer.name,
      wasCreated: true,
      aliasesCreated: aliases,
    };
  }

  async findOrCreateLocation(
    originalValue: string,
    aliases: string[] = []
  ): Promise<AutoCreateResult> {
    const normalized = this.normalizeValue(originalValue);

    const { data: existing } = await supabase
      .from('locations')
      .select('id, name')
      .eq('company_id', this.companyId)
      .ilike('name', normalized)
      .maybeSingle();

    if (existing) {
      if (aliases.length > 0) {
        await this.createIntelligenceRulesForLocation(existing.id, aliases);
      }
      return {
        id: existing.id,
        name: existing.name,
        wasCreated: false,
        aliasesCreated: aliases,
      };
    }

    const { data: newLocation, error } = await supabase
      .from('locations')
      .insert({
        company_id: this.companyId,
        name: normalized,
      })
      .select('id, name')
      .single();

    if (error) throw error;

    await this.createIntelligenceRule('location', originalValue, newLocation.id, 'locations');

    if (aliases.length > 0) {
      await this.createIntelligenceRulesForLocation(newLocation.id, aliases);
    }

    return {
      id: newLocation.id,
      name: newLocation.name,
      wasCreated: true,
      aliasesCreated: aliases,
    };
  }

  private async createAliasesForProductType(productTypeId: string, aliases: string[]): Promise<void> {
    const { data: existing } = await supabase
      .from('product_type_aliases')
      .select('alias')
      .eq('product_type_id', productTypeId);

    const existingAliases = new Set((existing || []).map(a => a.alias.toLowerCase()));
    const newAliases = aliases.filter(alias => !existingAliases.has(alias.toLowerCase()));

    if (newAliases.length === 0) return;

    await supabase
      .from('product_type_aliases')
      .insert(
        newAliases.map(alias => ({
          company_id: this.companyId,
          product_type_id: productTypeId,
          alias: alias,
        }))
      );

    for (const alias of newAliases) {
      await this.createIntelligenceRule('product_type', alias, productTypeId, 'product_types');
    }
  }

  private async createIntelligenceRule(
    fieldName: string,
    inputValue: string,
    referenceId: string,
    referenceTable: string
  ): Promise<void> {
    const intelligenceService = await createImportIntelligenceService(this.companyId);
    await intelligenceService.createValueLookupRule(
      fieldName,
      inputValue,
      referenceId,
      referenceTable
    );
  }


  private async createIntelligenceRulesForSupplier(supplierId: string, aliases: string[]): Promise<void> {
    for (const alias of aliases) {
      await this.createIntelligenceRule('supplier', alias, supplierId, 'suppliers');
    }
  }

  private async createIntelligenceRulesForCustomer(customerId: string, aliases: string[]): Promise<void> {
    for (const alias of aliases) {
      await this.createIntelligenceRule('customer', alias, customerId, 'customers');
    }
  }

  private async createIntelligenceRulesForLocation(locationId: string, aliases: string[]): Promise<void> {
    for (const alias of aliases) {
      await this.createIntelligenceRule('location', alias, locationId, 'locations');
    }
  }
}

export async function createSmartAutoCreateService(companyId: string): Promise<SmartAutoCreateService> {
  return new SmartAutoCreateService(companyId);
}
