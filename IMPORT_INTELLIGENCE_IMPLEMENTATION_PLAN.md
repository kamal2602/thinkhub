# 🧠 Import Intelligence Implementation Plan

## Option 3: Fully Implement Import Intelligence

**Goal:** Create a unified, database-driven import system that handles column mapping, value lookup, and component parsing.

---

## 📊 Current State Analysis

### What We Have Now

#### ✅ Import Field Mappings (`import_field_mappings`)
**Purpose:** Column header → System field mapping

**Example:**
```sql
{
  field_name: 'brand',
  field_label: 'Brand',
  auto_map_keywords: ['brand', 'manufacturer', 'mfr']
}
```

**Usage:** SmartPOImport, SmartReceivingWorkflow

---

#### ✅ Product Type Aliases (`product_type_aliases`)
**Purpose:** CSV value → Product Type lookup

**Example:**
```sql
{
  product_type_id: '<Laptops UUID>',
  alias: 'notebook'
}
```

**Usage:** Product Types UI, manual entry

---

#### ✅ Component Parser (`src/lib/componentParser.ts`)
**Purpose:** Parse component strings into structured data

**Examples:**
```typescript
"2x8GB"      → [{ capacity: "8GB", qty: 1 }, { capacity: "8GB", qty: 1 }]
"16GB"       → [{ capacity: "16GB", qty: 1 }]
"256GB/1TB"  → [{ capacity: "256GB", qty: 1 }, { capacity: "1TB", qty: 1 }]
```

**Status:** Built but NOT used in workflows ❌

---

#### ✅ Import Intelligence Rules (`import_intelligence_rules`)
**Table exists with 3 rule types:**
- `column_mapping` - Map CSV columns
- `value_lookup` - Map CSV values to DB records
- `component_pattern` - Smart parsing configuration

**Status:** Table exists, UI exists, but NOT integrated ❌

---

### The Problem
We have **THREE overlapping systems**:
1. Import Field Mappings (column mapping only)
2. Product Type Aliases (value lookup for product_types only)
3. Import Intelligence (comprehensive but unused)

Plus a component parser that's not integrated anywhere.

---

## 🎯 Implementation Goals

### Phase 1: Unified System
- ✅ Single source of truth for all import intelligence
- ✅ Replace Import Field Mappings usage
- ✅ Replace Product Type Aliases usage
- ✅ Integrate component parsing
- ✅ Support multi-table value lookup

### Phase 2: Enhanced Features
- ✅ Smart value normalization
- ✅ Learning from user mappings
- ✅ Supplier-specific mapping profiles
- ✅ Component auto-extraction

### Phase 3: Advanced Intelligence
- ✅ Fuzzy matching
- ✅ Confidence scoring
- ✅ Suggested mappings
- ✅ Mapping history and analytics

---

## 📐 Detailed Implementation Plan

## Phase 1: Foundation (Days 1-3)

### 1.1 Database Migration
**File:** `20251108_010000_migrate_to_import_intelligence.sql`

**Actions:**
```sql
-- Migrate Import Field Mappings → column_mapping rules
INSERT INTO import_intelligence_rules (
  company_id, rule_type, applies_to_field,
  input_keywords, priority, is_active
)
SELECT
  company_id,
  'column_mapping',
  field_name,
  auto_map_keywords,
  sort_order * 10, -- Priority based on sort order
  is_active
FROM import_field_mappings;

-- Migrate Product Type Aliases → value_lookup rules
INSERT INTO import_intelligence_rules (
  company_id, rule_type, applies_to_field,
  input_keywords, output_reference_id, output_reference_table,
  priority, is_active
)
SELECT
  pta.company_id,
  'value_lookup',
  'product_type',
  jsonb_build_array(pta.alias),
  pta.product_type_id,
  'product_types',
  100, -- High priority for exact matches
  true
FROM product_type_aliases pta;

-- Add component_pattern rules for spec fields
INSERT INTO import_intelligence_rules (
  company_id, rule_type, applies_to_field,
  parse_with_function, priority, is_active,
  metadata
)
SELECT DISTINCT
  company_id,
  'component_pattern',
  'specifications.ram',
  'parseComponentPattern',
  50,
  true,
  '{"auto_extract": true, "create_records": true}'
FROM companies;

-- Repeat for storage
INSERT INTO import_intelligence_rules (
  company_id, rule_type, applies_to_field,
  parse_with_function, priority, is_active,
  metadata
)
SELECT DISTINCT
  company_id,
  'component_pattern',
  'specifications.storage',
  'parseComponentPattern',
  50,
  true,
  '{"auto_extract": true, "create_records": true}'
FROM companies;
```

**Note:** Keep old tables for backward compatibility during transition

---

### 1.2 Service Layer: Import Intelligence Service
**File:** `src/lib/importIntelligenceService.ts`

**Purpose:** Unified service for all import intelligence operations

```typescript
import { supabase } from './supabase';
import { parseComponentPattern } from './componentParser';

interface IntelligenceRule {
  id: string;
  rule_type: 'column_mapping' | 'value_lookup' | 'component_pattern';
  applies_to_field: string;
  input_keywords: string[];
  output_value?: string;
  output_reference_id?: string;
  output_reference_table?: string;
  parse_with_function?: string;
  priority: number;
  is_active: boolean;
  metadata?: any;
}

export class ImportIntelligenceService {
  private companyId: string;
  private rules: IntelligenceRule[] = [];

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  // Load all rules for the company
  async loadRules() {
    const { data, error } = await supabase
      .from('import_intelligence_rules')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!error && data) {
      this.rules = data;
    }
  }

  // Map CSV column headers to system fields
  async mapColumns(csvHeaders: string[]): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();

    const columnRules = this.rules.filter(r => r.rule_type === 'column_mapping');

    for (const header of csvHeaders) {
      const normalizedHeader = header.toLowerCase().trim();

      // Find best matching rule
      for (const rule of columnRules) {
        for (const keyword of rule.input_keywords) {
          if (normalizedHeader.includes(keyword.toLowerCase())) {
            mapping.set(header, rule.applies_to_field);
            break;
          }
        }
        if (mapping.has(header)) break;
      }
    }

    return mapping;
  }

  // Lookup value and return database record ID
  async lookupValue(
    fieldName: string,
    value: string
  ): Promise<{ id: string; table: string } | null> {
    const normalizedValue = value.toLowerCase().trim();

    const lookupRules = this.rules.filter(
      r => r.rule_type === 'value_lookup' && r.applies_to_field === fieldName
    );

    // Sort by priority (highest first)
    lookupRules.sort((a, b) => b.priority - a.priority);

    for (const rule of lookupRules) {
      for (const keyword of rule.input_keywords) {
        if (normalizedValue === keyword.toLowerCase()) {
          return {
            id: rule.output_reference_id!,
            table: rule.output_reference_table!
          };
        }
      }
    }

    return null;
  }

  // Parse component string (RAM, Storage, etc.)
  async parseComponent(
    fieldName: string,
    value: string
  ): Promise<Array<{ capacity: string; quantity: number }>> {
    const patternRules = this.rules.filter(
      r => r.rule_type === 'component_pattern' && r.applies_to_field === fieldName
    );

    if (patternRules.length === 0) {
      // No parsing rule, return as-is
      return [{ capacity: value, quantity: 1 }];
    }

    const rule = patternRules[0]; // Use highest priority rule

    if (rule.parse_with_function === 'parseComponentPattern') {
      return parseComponentPattern(value);
    }

    // Fallback
    return [{ capacity: value, quantity: 1 }];
  }

  // Process entire CSV row using all intelligence
  async processRow(
    row: Record<string, any>,
    columnMapping: Map<string, string>
  ): Promise<Record<string, any>> {
    const processed: Record<string, any> = {};

    for (const [csvColumn, systemField] of columnMapping) {
      const value = row[csvColumn];

      if (!value) continue;

      // Check if value lookup needed
      const lookupResult = await this.lookupValue(systemField, value);
      if (lookupResult) {
        processed[systemField + '_id'] = lookupResult.id;
        continue;
      }

      // Check if component parsing needed
      if (systemField.includes('specifications.')) {
        const components = await this.parseComponent(systemField, value);
        if (components.length > 0) {
          processed[systemField] = components;
          continue;
        }
      }

      // Regular value
      processed[systemField] = value;
    }

    return processed;
  }
}

// Export singleton factory
export const createImportIntelligence = (companyId: string) => {
  return new ImportIntelligenceService(companyId);
};
```

---

### 1.3 Update SmartPOImport
**File:** `src/components/purchases/SmartPOImport.tsx`

**Changes:**
```typescript
// Replace current import field mappings logic

import { createImportIntelligence } from '../../lib/importIntelligenceService';

// In component:
const [intelligence, setIntelligence] = useState<ImportIntelligenceService | null>(null);

useEffect(() => {
  if (selectedCompany) {
    const service = createImportIntelligence(selectedCompany.id);
    service.loadRules().then(() => {
      setIntelligence(service);
    });
  }
}, [selectedCompany]);

// In handleFileUpload:
const columnMapping = await intelligence.mapColumns(headers);

// When processing rows:
for (const row of parsedData) {
  const processed = await intelligence.processRow(row, columnMapping);

  // Extract product_type_id if lookup was successful
  const productTypeId = processed.product_type_id || null;

  // Extract components if parsed
  const ramComponents = processed['specifications.ram'] || [];
  const storageComponents = processed['specifications.storage'] || [];

  // Create PO line with processed data
  // ...
}
```

---

### 1.4 Update SmartReceivingWorkflow
**File:** `src/components/receiving/SmartReceivingWorkflow.tsx`

**Similar changes as SmartPOImport**

---

## Phase 2: Enhanced Features (Days 4-6)

### 2.1 Multi-Table Value Lookup

**Add rules for:**

#### Brand Lookup
```sql
-- Example: "Dell" → brands table lookup
INSERT INTO import_intelligence_rules (
  company_id, rule_type, applies_to_field,
  input_keywords, output_reference_table, priority
) VALUES (
  '<company_id>',
  'value_lookup',
  'brand',
  '["dell", "dell inc", "dell computer"]',
  'brands', -- Create brands table if needed
  100
);
```

#### CPU Lookup
```sql
-- Example: "i5-8250U" → components table
INSERT INTO import_intelligence_rules (
  company_id, rule_type, applies_to_field,
  input_keywords, output_reference_id, output_reference_table,
  priority
) VALUES (
  '<company_id>',
  'value_lookup',
  'specifications.cpu',
  '["i5-8250u", "intel i5 8250u", "core i5-8250u"]',
  '<cpu_component_id>',
  'components',
  100
);
```

---

### 2.2 Learning from User Corrections

**Track when users manually override mappings:**

```typescript
// When user changes imported value
async saveMapping(
  fieldName: string,
  originalValue: string,
  correctedId: string,
  referenceTable: string
) {
  // Create new rule
  await supabase.from('import_intelligence_rules').insert({
    company_id: this.companyId,
    rule_type: 'value_lookup',
    applies_to_field: fieldName,
    input_keywords: [originalValue.toLowerCase()],
    output_reference_id: correctedId,
    output_reference_table: referenceTable,
    priority: 90, // Learned rules have lower priority than manual
    is_active: true,
    metadata: { learned: true, learned_at: new Date() }
  });
}
```

---

### 2.3 Supplier-Specific Profiles

**Add supplier_id to rules:**

```sql
ALTER TABLE import_intelligence_rules
ADD COLUMN supplier_id uuid REFERENCES suppliers(id);

-- Example: Supplier A always uses "NB" for notebooks
INSERT INTO import_intelligence_rules (
  company_id, supplier_id, rule_type, applies_to_field,
  input_keywords, output_reference_id, output_reference_table,
  priority
) VALUES (
  '<company_id>',
  '<supplier_a_id>',
  'value_lookup',
  'product_type',
  '["nb"]',
  '<laptops_id>',
  'product_types',
  120 -- Higher priority than generic rules
);
```

---

### 2.4 Component Auto-Extraction

**During receiving, auto-create component records:**

```typescript
// In SmartReceivingWorkflow, when processing received items:

if (processed['specifications.ram']) {
  const ramComponents = processed['specifications.ram'];

  for (const component of ramComponents) {
    // Create component record
    await supabase.from('asset_components').insert({
      asset_id: assetId,
      component_type: 'RAM',
      capacity: component.capacity,
      quantity: component.quantity,
      source: 'import_parsed',
      created_at: new Date()
    });
  }
}
```

---

## Phase 3: Advanced Intelligence (Days 7-10)

### 3.1 Fuzzy Matching

**Use Levenshtein distance for similarity:**

```typescript
function levenshtein(a: string, b: string): number {
  // Implementation of edit distance algorithm
  // Return similarity score 0-100
}

async lookupValueFuzzy(
  fieldName: string,
  value: string,
  threshold: number = 80
): Promise<Array<{ id: string; table: string; confidence: number }>> {
  const results = [];

  for (const rule of this.lookupRules[fieldName]) {
    for (const keyword of rule.input_keywords) {
      const score = levenshtein(value, keyword);
      if (score >= threshold) {
        results.push({
          id: rule.output_reference_id!,
          table: rule.output_reference_table!,
          confidence: score
        });
      }
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}
```

---

### 3.2 Confidence Scoring

**Show confidence in UI:**

```typescript
interface ImportPreview {
  row: number;
  field: string;
  originalValue: string;
  mappedValue: string;
  confidence: 'high' | 'medium' | 'low';
  suggestions?: Array<{ value: string; confidence: number }>;
}

// In UI, show color-coded confidence:
// 🟢 High (90-100%) - Auto-apply
// 🟡 Medium (70-89%) - Suggest, require confirmation
// 🔴 Low (<70%) - Show multiple options
```

---

### 3.3 Suggested Mappings

**UI improvement in SmartPOImport:**

```typescript
// After parsing CSV, before import:
const preview = [];

for (const row of parsedData) {
  for (const [field, value] of Object.entries(row)) {
    const fuzzyMatches = await intelligence.lookupValueFuzzy(field, value);

    if (fuzzyMatches.length > 0) {
      preview.push({
        row: rowIndex,
        field,
        originalValue: value,
        mappedValue: fuzzyMatches[0].name,
        confidence: fuzzyMatches[0].confidence >= 90 ? 'high' :
                    fuzzyMatches[0].confidence >= 70 ? 'medium' : 'low',
        suggestions: fuzzyMatches.slice(1, 4) // Top 3 alternatives
      });
    }
  }
}

// Show preview table with editable mappings
```

---

### 3.4 Mapping Analytics

**Track and report on mapping effectiveness:**

```sql
CREATE TABLE import_mapping_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  rule_id uuid REFERENCES import_intelligence_rules(id),

  total_applications integer DEFAULT 0,
  successful_applications integer DEFAULT 0,
  user_corrections integer DEFAULT 0,

  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Track rule effectiveness
-- Suggest removing low-performing rules
-- Highlight high-value rules
```

---

## 🔄 Migration Strategy

### Week 1: Parallel Running
- ✅ Deploy Import Intelligence
- ✅ Run BOTH old and new systems
- ✅ Compare results
- ✅ Fix discrepancies

### Week 2: Transition
- ✅ Default to Import Intelligence
- ✅ Keep old system as fallback
- ✅ Monitor for issues

### Week 3: Deprecation
- ✅ Remove old system usage
- ✅ Mark old tables as deprecated
- ✅ Keep tables for data reference

### Week 4: Cleanup
- ✅ Remove fallback code
- ✅ Archive old tables
- ✅ Full cutover complete

---

## ✅ Testing Checklist

### Unit Tests
- ☑ Column mapping with keywords
- ☑ Value lookup (exact match)
- ☑ Value lookup (fuzzy match)
- ☑ Component parsing
- ☑ Multi-table lookup
- ☑ Rule priority ordering

### Integration Tests
- ☑ PO import with intelligence
- ☑ Receiving with auto-component extraction
- ☑ Learning from corrections
- ☑ Supplier-specific rules

### User Acceptance Tests
- ☑ Import known-good CSV
- ☑ Verify all mappings correct
- ☑ Verify components extracted
- ☑ Verify lookups resolved
- ☑ Test fuzzy matching
- ☑ Test suggestions

---

## 📊 Success Metrics

### Target Metrics
- **Auto-Mapping Rate:** >90% of columns mapped automatically
- **Value Lookup Success:** >85% of product types resolved
- **Component Extraction:** >80% of RAM/Storage parsed correctly
- **User Corrections:** <10% of imports require manual fixes
- **Import Speed:** <5 seconds for 100-row CSV

---

## 🚨 Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Keep old tables intact
- Test migration on copy first
- Verify record counts match

### Risk 2: Performance Degradation
**Mitigation:**
- Add indexes to import_intelligence_rules
- Cache rules in memory
- Batch database lookups

### Risk 3: Complex Rules Break Imports
**Mitigation:**
- Graceful fallbacks
- Log all failures
- Admin UI to disable problematic rules

---

## 📝 Documentation Updates

### For Users
- Update First-Time Setup Guide
- Create Import Intelligence Guide
- Video tutorials for CSV imports

### For Developers
- API documentation
- Rule schema reference
- Service layer architecture

---

## 🎯 Deliverables

### Phase 1
1. ✅ Migration script
2. ✅ ImportIntelligenceService
3. ✅ Updated SmartPOImport
4. ✅ Updated SmartReceivingWorkflow
5. ✅ Basic testing

### Phase 2
1. ✅ Multi-table lookup support
2. ✅ Learning from corrections
3. ✅ Supplier-specific rules
4. ✅ Component auto-extraction

### Phase 3
1. ✅ Fuzzy matching
2. ✅ Confidence scoring
3. ✅ Suggested mappings UI
4. ✅ Analytics dashboard

---

## 🔮 Future Enhancements

### V2 Features
- AI-powered column detection
- Natural language rule creation
- Import templates per supplier
- Bulk rule management
- Rule versioning and rollback

### V3 Features
- Multi-file import (zip upload)
- Image-based data extraction (OCR)
- API integrations (direct supplier feeds)
- Predictive mapping (ML-based)

---

**Ready to implement! 🚀**

**Estimated Timeline:** 2-3 weeks for full implementation
**Complexity:** High
**Impact:** Very High
**Value:** Transforms import experience from manual to intelligent
