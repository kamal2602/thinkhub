# 🔄 RESTORE POINT: Before Removing Hardcoded Fields
**Date:** 2025-11-08
**Purpose:** Backup before removing all hardcoded SYSTEM_FIELDS and AUTO_MAP_RULES
**Status:** ✅ SAFE RESTORE POINT

---

## 📋 Current State Summary

### Working Features:
- ✅ SmartPOImport and SmartReceivingWorkflow both working
- ✅ Database-first strategy implemented
- ✅ No duplicate fields in dropdowns
- ✅ Brand prefix removed from model normalization
- ✅ All 19 standard fields available
- ✅ Build passes successfully

### Current Strategy:
- **Database has fields?** → Use database fields only
- **Database empty?** → Fall back to hardcoded SYSTEM_FIELDS and AUTO_MAP_RULES

---

## 📄 File Backups

### File 1: SmartPOImport.tsx (Lines 50-95)

```typescript
const SYSTEM_FIELDS = [
  { value: '', label: '-- Skip This Column --' },
  { value: 'product_type', label: 'Product Type / Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'model', label: 'Model' },
  { value: 'serial_number', label: 'Serial Number' },
  { value: 'quantity_ordered', label: 'Quantity' },
  { value: 'unit_cost', label: 'Unit Cost / Price' },
  { value: 'description', label: 'Description' },
  { value: 'expected_condition', label: 'Grade / Condition' },
  { value: 'supplier_sku', label: 'Supplier SKU' },
  { value: 'specifications.cpu', label: 'CPU / Processor' },
  { value: 'specifications.ram', label: 'RAM / Memory' },
  { value: 'specifications.storage', label: 'Storage / HDD / SSD' },
  { value: 'specifications.screen_size', label: 'Screen Size' },
  { value: 'specifications.graphics', label: 'Graphics' },
  { value: 'specifications.os', label: 'Operating System' },
  { value: 'specifications.functional_notes', label: 'Functional Status' },
  { value: 'specifications.cosmetic_notes', label: 'Cosmetic Notes' },
  { value: 'notes', label: 'Notes / Comments' },
];

const AUTO_MAP_RULES: Record<string, string[]> = {
  product_type: ['product', 'type', 'category', 'item type', 'product type'],
  brand: ['brand', 'manufacturer', 'mfr', 'make', 'vendor'],
  model: ['model', 'part', 'part number', 'part#', 'model number', 'model#'],
  serial_number: ['serial', 'serial number', 'serial#', 's/n', 'sn', 'service tag', 'asset tag'],
  quantity_ordered: ['qty', 'quantity', 'available', 'avail', 'stock', 'count', 'units', 'quantity ordered'],
  unit_cost: ['price', 'cost', 'unit price', 'unit cost', 'each', 'ea'],
  description: ['description', 'desc', 'details', 'item description', 'product description'],
  expected_condition: ['grade', 'condition', 'cosmetic', 'quality', 'expected condition'],
  supplier_sku: ['supplier sku', 'vendor sku', 'sku', 'item#', 'item number'],
  'specifications.cpu': ['cpu', 'processor', 'proc', 'intel', 'amd', 'ryzen'],
  'specifications.ram': ['ram', 'memory', 'mem', 'gb ram', 'memory size'],
  'specifications.storage': ['storage', 'hdd', 'ssd', 'drive', 'hard drive', 'disk'],
  'specifications.screen_size': ['screen', 'display', 'lcd', 'monitor', 'screen size'],
  'specifications.graphics': ['graphics', 'gpu', 'video', 'video card', 'graphics card'],
  'specifications.os': ['os', 'operating system', 'windows', 'macos', 'linux', 'software'],
  'specifications.functional_notes': ['functional', 'function', 'test', 'working', 'condition'],
  'specifications.cosmetic_notes': ['cosmetic', 'appearance', 'physical', 'scratches', 'dents'],
  notes: ['notes', 'comments', 'remarks', 'memo', 'additional info'],
};
```

### File 2: SmartReceivingWorkflow.tsx (Lines 82-118)

```typescript
const SYSTEM_FIELDS = [
  { value: '', label: '-- Skip This Column --' },
  { value: 'serial_number', label: 'Serial Number' },
  { value: 'brand', label: 'Brand' },
  { value: 'model', label: 'Model' },
  { value: 'product_type', label: 'Product Type' },
  { value: 'quantity_ordered', label: 'Quantity' },
  { value: 'unit_cost', label: 'Unit Cost' },
  { value: 'description', label: 'Description' },
  { value: 'expected_condition', label: 'Grade / Condition' },
  { value: 'supplier_sku', label: 'Supplier SKU' },
  { value: 'specifications.cpu', label: 'CPU / Processor' },
  { value: 'specifications.ram', label: 'RAM / Memory' },
  { value: 'specifications.storage', label: 'Storage / HDD / SSD' },
  { value: 'specifications.screen_size', label: 'Screen Size' },
  { value: 'specifications.graphics', label: 'Graphics' },
  { value: 'specifications.os', label: 'Operating System' },
  { value: 'specifications.functional_notes', label: 'Functional Status' },
  { value: 'specifications.cosmetic_notes', label: 'Cosmetic Notes' },
  { value: 'notes', label: 'Notes / Comments' },
];

const AUTO_MAP_RULES: Record<string, string[]> = {
  serial_number: ['serial', 'serial number', 'serial#', 's/n', 'sn', 'service tag'],
  brand: ['brand', 'manufacturer', 'mfr', 'make'],
  model: ['model', 'part', 'part number', 'sku'],
  quantity_ordered: ['qty', 'quantity', 'available', 'avail', 'stock', 'count', 'units'],
  unit_cost: ['price', 'cost', 'unit price', 'unit cost'],
  description: ['description', 'desc', 'details', 'item description'],
  expected_condition: ['grade', 'condition', 'cosmetic', 'quality'],
  supplier_sku: ['supplier sku', 'vendor sku', 'sku'],
  'specifications.cpu': ['cpu', 'processor', 'proc'],
  'specifications.ram': ['ram', 'memory', 'mem'],
  'specifications.storage': ['storage', 'hdd', 'ssd', 'drive'],
  'specifications.screen_size': ['screen', 'display', 'lcd'],
  'specifications.graphics': ['graphics', 'gpu', 'video'],
  'specifications.os': ['os', 'operating system', 'windows', 'macos'],
  'specifications.functional_notes': ['functional', 'function', 'test', 'working'],
  'specifications.cosmetic_notes': ['cosmetic', 'appearance', 'physical'],
  notes: ['notes', 'comments', 'remarks', 'memo'],
};
```

---

## 🔧 loadCustomFields() Function Backup

### SmartPOImport.tsx (Lines 135-165)

```typescript
const loadCustomFields = async () => {
  const { data, error } = await supabase
    .from('import_field_mappings')
    .select('*')
    .eq('company_id', selectedCompany?.id)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error loading custom fields:', error);
    return;
  }

  if (data && data.length > 0) {
    const customFieldsList = data.map(field => ({
      value: field.field_name,
      label: field.field_label,
    }));

    const fieldsToUse = [
      { value: '', label: '-- Skip This Column --' },
      ...customFieldsList
    ];
    setSystemFields(fieldsToUse);

    const customRules: Record<string, string[]> = {};
    data.forEach(field => {
      if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
        customRules[field.field_name] = field.auto_map_keywords;
      }
    });
    setAutoMapRules(customRules);
  } else {
    setSystemFields(SYSTEM_FIELDS);
    setAutoMapRules(AUTO_MAP_RULES);
  }
};
```

### SmartReceivingWorkflow.tsx (Lines 208-260)

```typescript
const loadCustomFields = async () => {
  const { data, error } = await supabase
    .from('import_field_mappings')
    .select('*')
    .eq('company_id', selectedCompany?.id)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error loading custom fields:', error);
    return;
  }

  const { data: fieldAliases } = await supabase
    .from('field_aliases')
    .select('system_field, alias')
    .eq('company_id', selectedCompany?.id);

  if (data && data.length > 0) {
    const customFieldsList = data.map(field => ({
      value: field.field_name,
      label: field.field_label,
    }));

    const fieldsToUse = [
      { value: '', label: '-- Skip This Column --' },
      ...customFieldsList
    ];
    setSystemFields(fieldsToUse);

    const customRules = { ...AUTO_MAP_RULES };
    data.forEach(field => {
      if (field.auto_map_keywords && Array.isArray(field.auto_map_keywords)) {
        customRules[field.field_name] = field.auto_map_keywords;
      }
    });

    if (fieldAliases && fieldAliases.length > 0) {
      fieldAliases.forEach(alias => {
        if (!customRules[alias.system_field]) {
          customRules[alias.system_field] = [];
        }
        customRules[alias.system_field].push(alias.alias.toLowerCase());
      });
    }

    setAutoMapRules(customRules);
  } else {
    setSystemFields(SYSTEM_FIELDS);
    setAutoMapRules(AUTO_MAP_RULES);
  }
};
```

---

## 🎯 What Will Change After Removing Hardcoded

### Changes:
1. **Remove:** `const SYSTEM_FIELDS = [...]` from both files
2. **Remove:** `const AUTO_MAP_RULES = {...}` from both files
3. **Update:** `loadCustomFields()` to ONLY use database, no fallback
4. **Add:** Error handling if database is empty

### New Behavior:
- ✅ 100% database-driven
- ✅ No hardcoded fields at all
- ✅ Forces companies to set up their fields (one-time setup)
- ✅ Every company can customize completely

### Risk Assessment:
- **Low Risk:** You're in testing phase
- **Easy Rollback:** This document provides exact code to restore
- **Benefit:** Cleaner codebase, truly dynamic system

---

## 📝 How to Restore If Needed

### Option 1: Copy/Paste from This Document
1. Open the files mentioned above
2. Copy the constants from this document
3. Paste them back at the line numbers indicated
4. Run `npm run build`

### Option 2: Use Previous Commit
(Note: Git repository not initialized, so manual restore from this document)

---

## ✅ Pre-Removal Checklist

- [x] Build passes successfully
- [x] No TypeScript errors
- [x] Both import workflows working
- [x] Database fields loading correctly
- [x] No duplicate fields showing
- [x] Brand prefix removed
- [x] Complete backup documented
- [x] Line numbers recorded
- [x] Full code preserved

---

## 🚀 Ready to Proceed

This restore point captures the **current working state** before removing hardcoded fields.

If any issues arise after removal, use this document to restore the exact code.

**Next Step:** Remove hardcoded SYSTEM_FIELDS and AUTO_MAP_RULES from both files.

---

**END OF RESTORE POINT**
