# Smart Import Field Mapping System

## Overview

The Smart Import system uses **Import Field Mappings** to automatically suggest which database fields your Excel columns should map to during import.

---

## How It Works

### 1. **Field Mappings Configuration**

Go to **Settings → Import Field Mappings** to manage auto-detection rules.

Each mapping has:
- **Field Name**: Database column (e.g., `specifications.cpu`)
- **Display Label**: What users see (e.g., "CPU / Processor")
- **Keywords**: Column name variations that auto-map to this field

### 2. **Auto-Suggestion Algorithm**

When you upload a file in Smart Import:

```
Your Excel Column → System Checks Keywords → Suggests Best Match
```

**Example:**

Excel has column: `"Processor Type"`

System checks all keywords:
- `product_type` keywords: `['product type', 'category', ...]`
  - Does "processor type" contain "product type"? ❌ NO
  - Does "processor type" contain "category"? ❌ NO

- `specifications.cpu` keywords: `['processor type', 'cpu model', 'processor', ...]`
  - Does "processor type" contain "processor type"? ✅ YES (14 chars)
  - Does "processor type" contain "processor"? ✅ YES (9 chars)

**Best match:** `processor type` (14 chars) → Suggests `specifications.cpu` ✅

---

## Intelligent Matching

### Longest Match Wins

The algorithm prioritizes **longer, more specific phrases**:

| Your Column | Keyword Match | Length | Field Suggested |
|-------------|---------------|--------|-----------------|
| "Processor Type" | "processor type" | 14 chars | `specifications.cpu` ✅ |
| "Processor Type" | "processor" | 9 chars | (ignored - shorter) |
| "Type" | "product type" | ❌ Not contained | - |
| "Category" | "category" | 8 chars | `product_type` ✅ |

### Case-Insensitive

All matching is case-insensitive:
- `"Processor Type"` = `"processor type"` = `"PROCESSOR TYPE"`

---

## Pre-Configured Keywords

The system comes with intelligent defaults:

### Product Information
| Field | Keywords |
|-------|----------|
| Product Type | `product type`, `product category`, `item type`, `device type`, `category` |
| Brand | `brand`, `manufacturer`, `mfr`, `make`, `vendor name`, `oem` |
| Model | `model`, `model number`, `part number`, `part#`, `partnumber`, `product name`, `item` |
| Serial Number | `serial number`, `serial#`, `service tag`, `s/n`, `sn`, `serial` |

### Pricing & Inventory
| Field | Keywords |
|-------|----------|
| Quantity | `quantity`, `qty`, `available`, `avail`, `stock`, `count`, `units` |
| Unit Cost | `unit price`, `unit cost`, `per unit`, `price`, `cost`, `each`, `amount`, `value` |
| Condition/Grade | `cosmetic grade`, `grade`, `condition`, `cosmetic`, `quality`, `rating` |
| Supplier SKU | `supplier sku`, `vendor sku`, `item number`, `item#`, `sku` |

### Specifications
| Field | Keywords |
|-------|----------|
| **CPU/Processor** | `processor type`, `processor model`, `cpu type`, `cpu model`, `processor`, `cpu`, `proc`, `chip` |
| **RAM/Memory** | `memory type`, `ram type`, `memory size`, `ram size`, `ram`, `memory`, `mem` |
| **Storage** | `storage type`, `storage capacity`, `hard drive`, `storage`, `hdd`, `ssd`, `drive`, `disk` |
| Screen Size | `screen size`, `display size`, `screen`, `display`, `lcd`, `monitor` |
| Graphics | `graphics card`, `video card`, `graphics`, `gpu`, `video` |
| Operating System | `operating system`, `os`, `software`, `windows`, `macos` |

---

## Example Scenarios

### Scenario 1: Dell Supplier File

**Your Excel:**
```
Processor Type | Memory Type | Storage Capacity | Category
i7-10th Gen    | 16GB DDR4   | 512GB SSD        | Laptop
```

**Auto-Suggestions:**
- `Processor Type` → `CPU / Processor` ✅ (matches "processor type")
- `Memory Type` → `RAM / Memory` ✅ (matches "memory type")
- `Storage Capacity` → `Storage / HDD / SSD` ✅ (matches "storage capacity")
- `Category` → `Product Type / Category` ✅ (matches "category")

### Scenario 2: HP Supplier File

**Your Excel:**
```
CPU Model      | RAM          | HDD           | Type
i5-11th Gen    | 8GB          | 1TB           | Notebook
```

**Auto-Suggestions:**
- `CPU Model` → `CPU / Processor` ✅ (matches "cpu model")
- `RAM` → `RAM / Memory` ✅ (matches "ram")
- `HDD` → `Storage / HDD / SSD` ✅ (matches "hdd")
- `Type` → `Product Type / Category` ⚠️ (partial match, but no longer phrase available)

---

## Customization

### Adding New Keywords

1. Go to **Settings → Import Field Mappings**
2. Find the field you want to customize
3. In the **Auto-Detection Keywords** section:
   - Type your new keyword (e.g., `"cpu brand"`)
   - Click **Add**
4. Click **Save Changes**

### Creating Custom Fields

1. Click **Add Custom Field**
2. Enter:
   - **Field Name**: Database column (e.g., `specifications.warranty`)
   - **Display Label**: User-facing name (e.g., `"Warranty Period"`)
   - **Type**: Direct or Specification
   - **Keywords**: Add detection keywords
3. Click **Save Changes**

### Best Practices

✅ **DO:**
- Add **longer, more specific phrases** first (e.g., `"processor type"` before `"processor"`)
- Use common supplier variations (e.g., `"s/n"`, `"serial#"`, `"service tag"`)
- Keep keywords lowercase (system handles case conversion)
- Test with real supplier files

❌ **DON'T:**
- Use extremely generic keywords like `"type"` alone
- Duplicate keywords across multiple fields
- Add keywords that could cause conflicts

---

## Product Type Aliases vs. Import Field Mappings

### Different Systems, Different Purposes

| Feature | **Product Type Aliases** | **Import Field Mappings** |
|---------|-------------------------|---------------------------|
| **Purpose** | Normalize VALUES | Suggest FIELD mappings |
| **When** | AFTER import | DURING field mapping |
| **Example** | `"nb"` → `"Laptop"` | `"Processor Type"` → CPU field |
| **Location** | Settings → Product Types | Settings → Import Field Mappings |

### Workflow

```
1. Upload File
   ↓
2. Import Field Mappings suggest column → field mappings
   ↓
3. User confirms/adjusts mappings
   ↓
4. Import data
   ↓
5. Product Type Aliases normalize values
```

**Example:**

Excel has:
```
Category | Processor Type
nb       | i7-10th Gen
```

**Step 1:** Import Field Mappings
- `Category` → `Product Type` field ✅
- `Processor Type` → `CPU` field ✅

**Step 2:** Product Type Aliases
- Value `"nb"` → Normalized to `"Laptop"` ✅

---

## Troubleshooting

### Issue: Wrong field suggested

**Solution:**
1. Check keyword order in Settings → Import Field Mappings
2. Ensure more specific phrases come before generic ones
3. Add your exact column name as a keyword

### Issue: No suggestion for my column

**Solution:**
1. Go to Settings → Import Field Mappings
2. Add your column name as a keyword for the correct field
3. Save changes

### Issue: Multiple fields match my column

**Solution:** The system picks the **longest matching keyword**. If conflicts occur:
1. Remove generic keywords from fields that shouldn't match
2. Add more specific keywords to fields that should match

---

## Migration Applied

A database migration has been applied to improve keyword matching:

**File:** `20251107000000_improve_import_field_mapping_keywords.sql`

**Changes:**
- Updated all default keywords with better variations
- Reordered keywords (longest first)
- Added "processor type", "memory type", "storage capacity", etc.

Your existing companies will automatically get these improvements!

---

## Summary

✅ Import Field Mappings are **editable** in Settings
✅ Keywords are **ordered** longest to shortest
✅ Matching is **case-insensitive**
✅ Algorithm picks **longest match**
✅ Pre-configured with **100+ common variations**
✅ Fully **customizable** per company

**Go try it:** Upload a supplier file and watch the smart suggestions work!
