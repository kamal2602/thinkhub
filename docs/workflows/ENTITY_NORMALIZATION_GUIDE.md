# Entity Normalization During PO Import

## Overview

The Smart PO Import now includes an intelligent **Entity Normalization** step that helps you standardize product types, suppliers, brands, and models **before** they enter your system. This feature learns from your decisions and automatically applies them to future imports.

## How It Works

### The Import Flow

```
Step 1: Upload Excel File
    ↓
Step 2: Map Columns
    ↓
Step 3: Normalize Entities ← NEW!
    ↓
Step 4: Import Items
```

### Step 3: Normalize Entities

After mapping columns, the system analyzes your data and:

1. **Auto-applies** previously learned normalizations
2. **Detects** new variants that need your decision
3. **Suggests** matches with existing entities
4. **Learns** from your choices for future imports

---

## Example Scenario

### Your Excel File Contains:

| Brand | Model | Product Type |
|-------|-------|--------------|
| Dell | Latitude 5420 | Notebook |
| Dell | latitude 5420 | LAPTOP |
| Dell | E5420 | laptop |
| Dell | 5420 | Notebook |

### What Happens:

#### **First Import (Learning Phase)**

**Step 3: Normalize Entities** screen appears:

##### Product Type Normalization
```
Found 2 unique product types:

Group 1: "Laptop" (2 items)
  • "LAPTOP" (1 item)
  • "laptop" (1 item)

Group 2: "Notebook" (2 items)
  • "Notebook" (2 items)

Options:
⚪ Create new product type: "Laptop"
⚪ Link to existing: [Select ▼]
⚪ Merge with "Notebook" (same product type)

☑ Save all variants as aliases
☑ Create Import Intelligence rules
```

**Your Decision:**
- Select: "Merge with Laptop"
- Canonical Name: `Laptop`
- ✓ Save aliases
- ✓ Create intelligence rules

**Result:**
- Creates product type: "Laptop"
- Saves aliases: "LAPTOP", "laptop", "Notebook"
- Creates intelligence rules for future auto-detection

##### Model Normalization
```
Found 4 model variants for Brand: Dell

Variants:
  • "Latitude 5420" (1 item)
  • "latitude 5420" (1 item)
  • "E5420" (1 item)
  • "5420" (1 item)

These appear to be the same model.

Canonical Name: [Latitude E5420]

☑ Save all 4 variants as aliases
☑ Create Import Intelligence rules
```

**Your Decision:**
- Canonical Name: `Latitude E5420`
- ✓ Save aliases
- ✓ Create intelligence rules

**Result:**
- All 4 variants → "Latitude E5420"
- Saves model aliases in database
- Creates intelligence rules

---

#### **Second Import (Auto-Apply Phase)**

Next week you import another file with:

| Brand | Model | Product Type |
|-------|-------|--------------|
| Dell | latitude 5420 | LAPTOP |
| Dell | E5420 | Notebook |
| HP | EliteBook 840 | laptop |

**Step 3: Normalize Entities** screen:

```
✓ Auto-normalized 5 entities (from previous imports)

  • "LAPTOP" → "Laptop" (auto)
  • "Notebook" → "Laptop" (auto)
  • "laptop" → "Laptop" (auto)
  • "latitude 5420" → "Latitude E5420" (auto)
  • "E5420" → "Latitude E5420" (auto)

0 new entities require your attention

[Continue to Import →]
```

**No user input needed!** All variants automatically normalized using rules from first import.

---

## What Gets Normalized

### Fields That Are Normalized:

1. **Product Type** - `product_type`
2. **Supplier** - `supplier`
3. **Brand** - `brand`
4. **Model** - `model`

### Fields That Are NOT Normalized (Passthrough):

1. **Comments/Notes** - `cosmetic_notes`, any field with "note" or "comment"
2. **Serial Numbers** - `serial_number`
3. **Custom free-text fields**

---

## The Intelligence System

### What Gets Saved:

#### 1. Product Type Aliases Table
```sql
product_type_aliases
├── product_type_id → points to "Laptop"
└── alias_name → "notebook", "LAPTOP", "laptop computer"
```

#### 2. Model Aliases Table
```sql
model_aliases
├── brand → "Dell"
├── canonical_name → "Latitude E5420"
└── variant_name → "latitude 5420", "E5420", "5420"
```

#### 3. Import Intelligence Rules
```sql
import_intelligence_rules
├── rule_type → "value_lookup"
├── applies_to_field → "model", "product_type"
├── input_keywords → ["dell latitude 5420"]
└── output_value → "Latitude E5420"
```

---

## Benefits

### ✅ One-Time Learning
- Teach the system once
- Auto-applies to all future imports
- No repeated decisions

### ✅ Data Consistency
- All imports use same canonical names
- No duplicate product types
- Clean, standardized database

### ✅ Time Savings
- **Month 1:** 5 minutes normalizing 10 variants
- **Month 2:** 1 minute (8/10 auto-recognized)
- **Month 6:** 15 seconds (19/20 auto-recognized)

### ✅ Company-Specific Learning
- Your rules don't affect other companies
- System learns YOUR naming conventions
- Adapts to YOUR suppliers' formats

---

## Best Practices

### 1. Be Consistent with Canonical Names
- ✓ Good: "Laptop", "Desktop", "Server"
- ✗ Avoid: "laptop", "Laptop Computer", "Laptops"

### 2. Always Save Aliases
- Helps with future supplier variations
- Builds comprehensive intelligence

### 3. Create Intelligence Rules
- Enables auto-recognition
- Reduces future manual work

### 4. Review Auto-Normalizations
- Check the summary before final import
- Ensure accuracy

---

## Common Scenarios

### Scenario 1: Same Product, Different Names
**Problem:** Supplier uses "Notebook" and "Laptop" interchangeably

**Solution:**
1. First import: Merge both to "Laptop" with aliases
2. Future imports: Both auto-convert to "Laptop"

### Scenario 2: Model Number Variations
**Problem:** Dell E5420 appears as "E5420", "5420", "Latitude 5420"

**Solution:**
1. First import: Normalize to "Latitude E5420" with all variants as aliases
2. Future imports: All variants auto-recognize

### Scenario 3: Supplier Changes Format
**Problem:** Supplier switches from "LAPTOP" to "Notebook" next month

**Solution:**
- System prompts for new variant
- Link to existing "Laptop"
- Adds "Notebook" as new alias
- Future imports include this variant

---

## Technical Details

### Auto-Normalization Check Order:

1. **Product Type Aliases** - Checks `product_type_aliases` table
2. **Model Aliases** - Checks `model_aliases` table
3. **Import Intelligence Rules** - Checks `import_intelligence_rules` table
4. **No Match** - Prompts user for decision

### Similarity Matching:

System uses Levenshtein distance to find potential matches:
- 100% similarity: Exact match
- 80%+ similarity: Strong match (suggested)
- 60-79% similarity: Possible match (shown)
- <60% similarity: Not shown

### Performance:

- Normalization analysis: ~1-2 seconds per 100 rows
- Auto-apply: Instant (database lookup)
- User decisions: Saved in <100ms

---

## Troubleshooting

### Q: Normalization step shows no entities
**A:** This means all values were auto-normalized from previous imports. Check the summary at Step 4.

### Q: Want to change a previous normalization decision
**A:** Go to Settings → Import Intelligence, find the rule, and update or delete it.

### Q: Accidentally merged wrong entities
**A:**
1. Delete the alias from Settings → Model Aliases or Product Type Aliases
2. Re-import the file

### Q: Can I skip normalization?
**A:** Yes, click "Skip all remaining" or select "Keep as-is" for each entity.

---

## Future Enhancements

Planned features:
- [ ] Bulk edit existing assets with new normalization rules
- [ ] Export/import normalization rules between companies
- [ ] AI-powered similarity matching
- [ ] Normalization for customer names
- [ ] Normalization preview before upload

---

## Summary

The Entity Normalization feature transforms your import workflow from:

**Before:**
```
Import → Discover duplicates → Manual cleanup → Update assets
```

**After:**
```
Import → Teach once → Auto-apply forever
```

This one-time setup creates long-term data quality and saves hours of manual work.
