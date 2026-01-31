import { supabase } from './supabase';
import { isPassthroughField } from './passthroughFields';

export interface EntityVariant {
  originalValue: string;
  normalizedValue: string;
  count: number;
  rowIndices: number[];
}

export interface EntityGroup {
  field: string;
  variants: EntityVariant[];
  suggestedCanonical: string;
  existingMatches: Array<{ id: string; name: string; similarity: number }>;
}

export interface NormalizationDecision {
  field: string;
  variants: string[];
  action: 'create_new' | 'link_existing' | 'skip';
  canonicalName?: string;
  existingId?: string;
  saveAsAliases: boolean;
  createIntelligenceRules: boolean;
}

export interface NormalizedMapping {
  field: string;
  originalValue: string;
  resolvedValue: string;
  resolvedId?: string;
}

export class EntityNormalizationService {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  normalizeModelName(value: string): string {
    // No normalization - keep the original value exactly as-is, just trim whitespace
    return value.trim();
  }

  normalizeValue(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  analyzeEntityField(
    fieldName: string,
    rows: any[]
  ): EntityGroup | null {
    if (isPassthroughField(fieldName)) {
      return null;
    }

    const valueCounts = new Map<string, { count: number; rowIndices: number[]; originalValues: Set<string> }>();

    rows.forEach((row, index) => {
      const value = row[fieldName];
      if (!value || typeof value !== 'string') return;

      const normalized = fieldName === 'model'
        ? this.normalizeModelName(value)
        : this.normalizeValue(value);

      if (!valueCounts.has(normalized)) {
        valueCounts.set(normalized, { count: 0, rowIndices: [], originalValues: new Set() });
      }

      const entry = valueCounts.get(normalized)!;
      entry.count++;
      entry.rowIndices.push(index);
      entry.originalValues.add(value);
    });

    if (valueCounts.size === 0) return null;

    // For model field, we should NOT group different models together
    // This function should only return a group for non-model fields
    if (fieldName === 'model') {
      return null;
    }

    const variants: EntityVariant[] = Array.from(valueCounts.entries()).map(([normalized, data]) => ({
      originalValue: Array.from(data.originalValues).join(', '),
      normalizedValue: normalized,
      count: data.count,
      rowIndices: data.rowIndices,
    }));

    const suggestedCanonical = variants.sort((a, b) => b.count - a.count)[0].normalizedValue;

    return {
      field: fieldName,
      variants,
      suggestedCanonical,
      existingMatches: [],
    };
  }

  analyzeModelField(rows: any[]): EntityGroup[] {
    return this.analyzeModelLikeField('model', rows);
  }

  analyzeCPUField(rows: any[]): EntityGroup[] {
    return this.analyzeModelLikeField('specifications.cpu', rows);
  }

  private analyzeModelLikeField(fieldName: string, rows: any[]): EntityGroup[] {
    if (isPassthroughField(fieldName)) {
      return [];
    }

    const valueCounts = new Map<string, { count: number; rowIndices: number[]; originalValues: Set<string> }>();

    rows.forEach((row, index) => {
      const value = row[fieldName];
      if (!value || typeof value !== 'string') return;

      const normalized = this.normalizeModelName(value);

      if (!valueCounts.has(normalized)) {
        valueCounts.set(normalized, { count: 0, rowIndices: [], originalValues: new Set() });
      }

      const entry = valueCounts.get(normalized)!;
      entry.count++;
      entry.rowIndices.push(index);
      entry.originalValues.add(value);
    });

    if (valueCounts.size === 0) return [];

    // Create separate groups for each value that appears more than once
    const groups: EntityGroup[] = [];

    for (const [normalized, data] of valueCounts.entries()) {
      // Only create a group if this value appears more than once OR has variations
      if (data.count > 1 || data.originalValues.size > 1) {
        const variant: EntityVariant = {
          originalValue: Array.from(data.originalValues).join(', '),
          normalizedValue: normalized,
          count: data.count,
          rowIndices: data.rowIndices,
        };

        groups.push({
          field: fieldName,
          variants: [variant],
          suggestedCanonical: normalized,
          existingMatches: [],
        });
      }
    }

    return groups;
  }

  async checkExistingEntities(
    fieldName: string,
    variants: EntityVariant[]
  ): Promise<Array<{ id: string; name: string; similarity: number }>> {
    let tableName: string;
    let nameColumn = 'name';

    switch (fieldName) {
      case 'product_type':
        tableName = 'product_types';
        break;
      case 'supplier':
        tableName = 'suppliers';
        break;
      case 'brand':
        return [];
      case 'model':
        return [];
      case 'specifications.cpu':
        return [];
      case 'location':
        tableName = 'locations';
        break;
      default:
        return [];
    }

    // Build query
    let query = supabase
      .from(tableName)
      .select('id, name')
      .eq('company_id', this.companyId);

    // Only filter by is_active if the table has this column (suppliers do, product_types don't)
    if (fieldName === 'supplier') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    const matches: Array<{ id: string; name: string; similarity: number }> = [];

    data.forEach(existing => {
      variants.forEach(variant => {
        const similarity = this.calculateSimilarity(
          variant.normalizedValue.toLowerCase(),
          existing.name.toLowerCase()
        );

        if (similarity > 0.6) {
          matches.push({
            id: existing.id,
            name: existing.name,
            similarity,
          });
        }
      });
    });

    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    if (longer.includes(shorter)) return 0.8;
    if (shorter.includes(longer)) return 0.8;

    const distance = this.levenshteinDistance(str1, str2);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async applyNormalizationDecision(
    decision: NormalizationDecision
  ): Promise<NormalizedMapping[]> {
    const mappings: NormalizedMapping[] = [];

    if (decision.action === 'skip') {
      decision.variants.forEach(variant => {
        mappings.push({
          field: decision.field,
          originalValue: variant,
          resolvedValue: variant,
        });
      });
      return mappings;
    }

    let resolvedId: string | undefined;
    let resolvedValue: string;

    if (decision.action === 'create_new' && decision.canonicalName) {
      const result = await this.createEntity(decision.field, decision.canonicalName);
      if (result) {
        resolvedId = result.id;
        resolvedValue = result.name;
      } else {
        resolvedValue = decision.canonicalName;
      }
    } else if (decision.action === 'link_existing' && decision.existingId) {
      resolvedId = decision.existingId;
      const entity = await this.getEntityById(decision.field, decision.existingId);
      resolvedValue = entity?.name || decision.canonicalName || decision.variants[0];
    } else {
      resolvedValue = decision.canonicalName || decision.variants[0];
    }

    if (decision.saveAsAliases && resolvedValue) {
      await this.saveAliases(decision.field, decision.variants, resolvedValue, resolvedId);
    }

    if (decision.createIntelligenceRules && resolvedValue) {
      await this.saveIntelligenceRules(decision.field, decision.variants, resolvedValue, resolvedId);
    }

    decision.variants.forEach(variant => {
      mappings.push({
        field: decision.field,
        originalValue: variant,
        resolvedValue,
        resolvedId,
      });
    });

    return mappings;
  }

  private async createEntity(
    fieldName: string,
    name: string
  ): Promise<{ id: string; name: string } | null> {
    let tableName: string;

    switch (fieldName) {
      case 'product_type':
        tableName = 'product_types';
        break;
      case 'supplier':
        tableName = 'suppliers';
        break;
      case 'location':
        tableName = 'locations';
        break;
      default:
        return null;
    }

    // First check if entity already exists
    const { data: existing } = await supabase
      .from(tableName)
      .select('id, name')
      .eq('company_id', this.companyId)
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      console.log(`${fieldName} "${name}" already exists, reusing ID:`, existing.id);
      return existing;
    }

    // Create new entity
    const insertData: any = {
      company_id: this.companyId,
      name,
    };

    // Add sort_order for product_types
    if (fieldName === 'product_type') {
      const { data: maxSort } = await supabase
        .from('product_types')
        .select('sort_order')
        .eq('company_id', this.companyId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      insertData.sort_order = (maxSort?.sort_order || 0) + 1;
    }

    // Add is_active for suppliers (they have this column)
    if (fieldName === 'supplier') {
      insertData.is_active = true;
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select('id, name')
      .single();

    if (error) {
      console.error(`Error creating ${fieldName} "${name}":`, error);
      return null;
    }

    console.log(`Created new ${fieldName} "${name}" with ID:`, data.id);
    return data;
  }

  private async getEntityById(
    fieldName: string,
    id: string
  ): Promise<{ id: string; name: string } | null> {
    let tableName: string;

    switch (fieldName) {
      case 'product_type':
        tableName = 'product_types';
        break;
      case 'supplier':
        tableName = 'suppliers';
        break;
      case 'location':
        tableName = 'locations';
        break;
      default:
        return null;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('id, name')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  private async saveAliases(
    fieldName: string,
    variants: string[],
    canonicalName: string,
    entityId?: string
  ): Promise<void> {
    if (fieldName === 'product_type' && entityId) {
      const aliases = variants
        .filter(v => v.toLowerCase() !== canonicalName.toLowerCase())
        .map(variant => ({
          company_id: this.companyId,
          product_type_id: entityId,
          alias: variant,
        }));

      if (aliases.length > 0) {
        await supabase
          .from('product_type_aliases')
          .insert(aliases);
      }
    } else if (fieldName === 'model') {
      const brand = '';

      const aliases = variants
        .filter(v => v.toLowerCase() !== canonicalName.toLowerCase())
        .map(variant => {
          const brandName = brand || 'Unknown';
          return {
            company_id: this.companyId,
            brand: brandName,
            variant_name: variant,
            canonical_name: canonicalName,
            full_model_name: `${brandName} ${canonicalName}`,
          };
        });

      if (aliases.length > 0) {
        await supabase
          .from('model_aliases')
          .insert(aliases);
      }
    }
  }

  private async saveIntelligenceRules(
    fieldName: string,
    variants: string[],
    canonicalValue: string,
    entityId?: string
  ): Promise<void> {
    const rules = variants.map(variant => ({
      company_id: this.companyId,
      rule_type: 'value_lookup' as const,
      applies_to_field: fieldName,
      input_keywords: [variant.toLowerCase()],
      output_value: canonicalValue,
      output_reference_id: entityId,
      output_reference_table: this.getTableName(fieldName),
      priority: 100,
      is_active: true,
    }));

    console.log('[EntityNormalization] Saving intelligence rules:', rules);

    if (rules.length > 0) {
      const { data, error } = await supabase
        .from('import_intelligence_rules')
        .insert(rules)
        .select();

      if (error) {
        console.error('[EntityNormalization] Error saving intelligence rules:', error);
      } else {
        console.log('[EntityNormalization] Successfully saved intelligence rules:', data);
      }
    }
  }

  private getTableName(fieldName: string): string | null {
    switch (fieldName) {
      case 'product_type':
        return 'product_types';
      case 'supplier':
        return 'suppliers';
      case 'location':
        return 'locations';
      default:
        return null;
    }
  }

  async checkAutoNormalization(
    fieldName: string,
    value: string
  ): Promise<{ resolvedValue: string; resolvedId?: string; autoApplied: boolean }> {
    if (isPassthroughField(fieldName)) {
      return { resolvedValue: value, autoApplied: false };
    }

    const normalized = fieldName === 'model'
      ? this.normalizeModelName(value)
      : this.normalizeValue(value);

    if (fieldName === 'product_type') {
      const { data: alias } = await supabase
        .from('product_type_aliases')
        .select('product_type_id, product_types(id, name)')
        .eq('company_id', this.companyId)
        .ilike('alias', normalized)
        .maybeSingle();

      if (alias && alias.product_types) {
        return {
          resolvedValue: (alias.product_types as any).name,
          resolvedId: (alias.product_types as any).id,
          autoApplied: true,
        };
      }
    } else if (fieldName === 'model') {
      const { data: alias } = await supabase
        .from('model_aliases')
        .select('canonical_name')
        .eq('company_id', this.companyId)
        .ilike('variant_name', normalized)
        .maybeSingle();

      if (alias) {
        return {
          resolvedValue: alias.canonical_name,
          autoApplied: true,
        };
      }
    }

    const { data: rules } = await supabase
      .from('import_intelligence_rules')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('rule_type', 'value_lookup')
      .eq('applies_to_field', fieldName)
      .eq('is_active', true);

    const rule = rules?.find(r => {
      const keywords = r.input_keywords as string[];
      return keywords?.some(k => k.toLowerCase() === normalized.toLowerCase());
    });

    if (rule) {
      return {
        resolvedValue: rule.output_value || normalized,
        resolvedId: rule.output_reference_id,
        autoApplied: true,
      };
    }

    return { resolvedValue: normalized, autoApplied: false };
  }
}
