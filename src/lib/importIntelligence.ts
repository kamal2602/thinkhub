import { supabase } from './supabase';
import { parseComponentPattern, extractTechnologyType, getComponentType } from './componentParser';

export interface ImportIntelligenceRule {
  id: string;
  company_id: string;
  rule_type: 'column_mapping' | 'value_lookup' | 'component_pattern';
  applies_to_field: string;
  input_keywords: string[];
  priority: number;
  output_value?: string;
  output_reference_id?: string;
  output_reference_table?: string;
  parse_with_function?: string;
  metadata?: any;
  is_active: boolean;
}

export interface ColumnMappingSuggestion {
  columnName: string;
  suggestedField: string;
  confidence: number;
  matchedKeyword?: string;
}

export interface ValueLookupResult {
  originalValue: string;
  normalizedValue?: string;
  referenceId?: string;
  referenceTable?: string;
  matchedRule?: ImportIntelligenceRule;
}

export interface ComponentParseResult {
  originalValue: string;
  components: Array<{
    capacity: string;
    quantity: number;
    technology?: string;
    componentType?: string;
  }>;
  parseFunction?: string;
}

export class ImportIntelligenceService {
  private companyId: string;
  private rules: ImportIntelligenceRule[] = [];
  private columnMappingRules: ImportIntelligenceRule[] = [];
  private valueLookupRules: Map<string, ImportIntelligenceRule[]> = new Map();
  private componentPatternRules: Map<string, ImportIntelligenceRule[]> = new Map();

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  async loadRules(): Promise<void> {
    console.log('[Intelligence] Loading rules for company:', this.companyId);

    const { data, error } = await supabase
      .from('import_intelligence_rules')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('[Intelligence] Error loading import intelligence rules:', error);
      return;
    }

    console.log('[Intelligence] Loaded rules from database:', data);
    this.rules = data || [];
    this.organizeRules();
    console.log('[Intelligence] Organized value lookup rules:', this.valueLookupRules);
  }

  private organizeRules(): void {
    this.columnMappingRules = [];
    this.valueLookupRules.clear();
    this.componentPatternRules.clear();

    this.rules.forEach(rule => {
      switch (rule.rule_type) {
        case 'column_mapping':
          this.columnMappingRules.push(rule);
          break;

        case 'value_lookup':
          const field = rule.applies_to_field;
          if (!this.valueLookupRules.has(field)) {
            this.valueLookupRules.set(field, []);
          }
          this.valueLookupRules.get(field)!.push(rule);
          break;

        case 'component_pattern':
          const patternField = rule.applies_to_field;
          if (!this.componentPatternRules.has(patternField)) {
            this.componentPatternRules.set(patternField, []);
          }
          this.componentPatternRules.get(patternField)!.push(rule);
          break;
      }
    });
  }

  suggestColumnMapping(columnName: string): ColumnMappingSuggestion {
    const normalized = columnName.toLowerCase().trim();
    let bestMatch: ColumnMappingSuggestion = {
      columnName,
      suggestedField: '',
      confidence: 0,
    };

    for (const rule of this.columnMappingRules) {
      const keywords = rule.input_keywords || [];

      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();

        if (normalized === keywordLower) {
          return {
            columnName,
            suggestedField: rule.output_value || '',
            confidence: 1.0,
            matchedKeyword: keyword,
          };
        }

        if (normalized.includes(keywordLower)) {
          const confidence = keywordLower.length / normalized.length;
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              columnName,
              suggestedField: rule.output_value || '',
              confidence,
              matchedKeyword: keyword,
            };
          }
        }

        if (keywordLower.includes(normalized)) {
          const confidence = normalized.length / keywordLower.length * 0.8;
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              columnName,
              suggestedField: rule.output_value || '',
              confidence,
              matchedKeyword: keyword,
            };
          }
        }
      }
    }

    return bestMatch;
  }

  async lookupValue(fieldName: string, inputValue: string): Promise<ValueLookupResult> {
    const normalized = inputValue.toLowerCase().trim();
    const rulesForField = this.valueLookupRules.get(fieldName) || [];

    console.log(`[Intelligence] Lookup for field "${fieldName}", value "${inputValue}" (normalized: "${normalized}")`);
    console.log(`[Intelligence] Found ${rulesForField.length} rules for field "${fieldName}"`);

    for (const rule of rulesForField) {
      const keywords = rule.input_keywords || [];
      console.log(`[Intelligence] Checking rule with keywords:`, keywords);

      for (const keyword of keywords) {
        console.log(`[Intelligence] Comparing "${normalized}" === "${keyword.toLowerCase()}"`);
        if (normalized === keyword.toLowerCase()) {
          console.log(`[Intelligence] ✓ MATCH FOUND!`, {
            referenceId: rule.output_reference_id,
            referenceTable: rule.output_reference_table,
            outputValue: rule.output_value
          });
          return {
            originalValue: inputValue,
            normalizedValue: rule.output_value,
            referenceId: rule.output_reference_id,
            referenceTable: rule.output_reference_table,
            matchedRule: rule,
          };
        }
      }
    }

    console.log(`[Intelligence] ✗ No match found for "${inputValue}"`);
    return {
      originalValue: inputValue,
    };
  }

  parseComponentValue(fieldName: string, inputValue: string): ComponentParseResult {
    const rulesForField = this.componentPatternRules.get(fieldName) || [];

    for (const rule of rulesForField) {
      if (rule.parse_with_function === 'parseComponentPattern') {
        const parsed = parseComponentPattern(inputValue);
        const components = parsed.map(comp => {
          const result: any = {
            capacity: comp.capacity,
            quantity: comp.quantity,
          };

          if (rule.metadata?.extract_technology) {
            const tech = extractTechnologyType(comp.capacity);
            if (tech) result.technology = tech;
          }

          if (rule.metadata?.component_type) {
            result.componentType = rule.metadata.component_type;
          } else {
            result.componentType = getComponentType(comp.capacity);
          }

          return result;
        });

        return {
          originalValue: inputValue,
          components,
          parseFunction: rule.parse_with_function,
        };
      }
    }

    return {
      originalValue: inputValue,
      components: [{
        capacity: inputValue,
        quantity: 1,
      }],
    };
  }

  async suggestBulkColumnMappings(columnNames: string[]): Promise<ColumnMappingSuggestion[]> {
    return columnNames.map(col => this.suggestColumnMapping(col));
  }

  async createValueLookupRule(
    fieldName: string,
    inputValue: string,
    targetReferenceId: string,
    targetReferenceTable: string
  ): Promise<void> {
    const { error } = await supabase
      .from('import_intelligence_rules')
      .insert({
        company_id: this.companyId,
        rule_type: 'value_lookup',
        applies_to_field: fieldName,
        input_keywords: [inputValue.toLowerCase()],
        output_reference_id: targetReferenceId,
        output_reference_table: targetReferenceTable,
        priority: 100,
        is_active: true,
      });

    if (error) {
      console.error('Error creating value lookup rule:', error);
      throw error;
    }

    await this.loadRules();
  }

  async updateRulePriority(ruleId: string, newPriority: number): Promise<void> {
    const { error } = await supabase
      .from('import_intelligence_rules')
      .update({ priority: newPriority })
      .eq('id', ruleId);

    if (error) {
      console.error('Error updating rule priority:', error);
      throw error;
    }

    await this.loadRules();
  }

  async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('import_intelligence_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Error deleting rule:', error);
      throw error;
    }

    await this.loadRules();
  }

  getFieldsWithComponentParsing(): string[] {
    return Array.from(this.componentPatternRules.keys());
  }

  getFieldsWithValueLookup(): string[] {
    return Array.from(this.valueLookupRules.keys());
  }

  async exportRulesToJSON(): Promise<string> {
    return JSON.stringify(this.rules, null, 2);
  }

  async importRulesFromJSON(jsonString: string): Promise<void> {
    const rules = JSON.parse(jsonString);

    const { error } = await supabase
      .from('import_intelligence_rules')
      .insert(
        rules.map((rule: any) => ({
          ...rule,
          company_id: this.companyId,
          id: undefined,
        }))
      );

    if (error) {
      console.error('Error importing rules:', error);
      throw error;
    }

    await this.loadRules();
  }
}

export async function createImportIntelligenceService(companyId: string): Promise<ImportIntelligenceService> {
  const service = new ImportIntelligenceService(companyId);
  await service.loadRules();
  return service;
}
