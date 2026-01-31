# Quick Add System Fields - Feature Guide

## Overview

The **Quick Add System Field** dropdown helps users quickly configure import intelligence rules by auto-filling field names, display labels, and smart keywords for common system fields.

## Key Features

### 1. Smart Field Classification

Fields are organized into three categories:

#### 📋 REQUIRED FIELDS (System - Locked)
These are **hardcoded database columns** that CANNOT be renamed:
- `serial_number` - Unique identifier for each item
- `product_type` - Category (Laptop, Desktop, etc.)
- `brand` - Manufacturer name
- `model` - Model name or number
- `unit_cost` - Price per unit

**Why Locked?** These field names match the actual database schema and application code. Changing them would break the system.

#### 📦 OPTIONAL DIRECT FIELDS (System - Locked)
Additional database columns that are optional but locked:
- `quantity_ordered` - Number of items
- `supplier_sku` - Supplier part number
- `description` - Item description
- `expected_condition` - Grade/Condition

#### ⚙️ HARDWARE SPECIFICATIONS (Customizable)
These are stored in `other_specs` JSONB and CAN be customized:
- `specifications.cpu` - Processor model
- `specifications.ram` - Memory size
- `specifications.storage` - HDD/SSD capacity
- `specifications.screen_size` - Display size
- `specifications.graphics` - GPU model
- `specifications.os` - Operating system

**Why Customizable?** These are stored as key-value pairs in `other_specs`, so you can use any field name you want (e.g., `specifications.processor` vs `specifications.cpu`).

---

## How to Use

### Step 1: Add New Column Mapping Rule

1. Go to **Settings → Import Intelligence**
2. Ensure you're on the **Column Mapping** tab
3. Click **+ New Rule**

### Step 2: Use Quick Add Dropdown

At the top of the modal, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Quick Add System Field (Optional)                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ -- Choose a common field to auto-fill --            ▼ │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ 📋 REQUIRED FIELDS (System)                                 │
│   • Serial Number (serial_number)                           │
│   • Product Type (product_type)                             │
│   • Brand (brand)                                           │
│   • Model (model)                                           │
│   • Unit Cost (unit_cost)                                   │
│                                                              │
│ 📦 OPTIONAL DIRECT FIELDS (System)                          │
│   • Quantity (quantity_ordered)                             │
│   • Supplier SKU (supplier_sku)                             │
│   • Description (description)                               │
│   • Grade / Condition (expected_condition)                  │
│                                                              │
│ ⚙️ HARDWARE SPECIFICATIONS (Customizable)                   │
│   • CPU (specifications.cpu)                                │
│   • RAM (specifications.ram)                                │
│   • Storage (specifications.storage)                        │
│   • Screen Size (specifications.screen_size)                │
│   • Graphics (specifications.graphics)                      │
│   • Operating System (specifications.os)                    │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Select a Field

#### Example: Adding Serial Number (Locked Field)

1. Select **Serial Number (serial_number)** from dropdown
2. You'll see a preview box:

```
┌─────────────────────────────────────────────────────────────┐
│ Serial Number                                                │
│ Unique identifier for each item                             │
│                                                              │
│ 🔒 System field - field name cannot be changed              │
└─────────────────────────────────────────────────────────────┘
```

3. The form auto-fills:
   - **System Field**: `serial_number` (🔒 Locked - grayed out, cannot edit)
   - **Display Label**: `Serial Number` (editable)
   - **Keywords**: `serial number, serial#, service tag, s/n, sn, serial` (editable)

4. You'll see this notice:

```
🔒 This is a required system field. The field name cannot be changed
   as it matches database columns and code. You can customize the
   keywords below to match your supplier's column names.
```

#### Example: Adding RAM (Customizable Field)

1. Select **RAM (specifications.ram)** from dropdown
2. You'll see a preview box:

```
┌─────────────────────────────────────────────────────────────┐
│ RAM                                                          │
│ Memory size                                                  │
│                                                              │
│ ✏️ Specification - field name can be customized             │
└─────────────────────────────────────────────────────────────┘
```

3. The form auto-fills:
   - **System Field**: `specifications.ram` (✏️ Editable - you can change to `specifications.memory`)
   - **Display Label**: `RAM` (editable)
   - **Keywords**: `memory type, ram type, memory size, ram size, ram, memory, mem` (editable)

---

## What Gets Auto-Filled

When you select a system field from the dropdown:

| What | Description | Can Edit? |
|------|-------------|-----------|
| **Field Name** | The system field identifier (e.g., `serial_number` or `specifications.ram`) | ❌ NO for direct fields<br>✅ YES for specifications |
| **Display Label** | Human-readable name shown in UI | ✅ Always editable |
| **Keywords** | Auto-mapping keywords for supplier columns | ✅ Always editable |
| **Description** | Internal metadata explaining the field | ✅ Always editable |

---

## Visual Indicators

### 🔒 Locked System Field (Orange Badge)
```
System Field *  [🔒 Locked]
┌──────────────────────────────────────┐
│ serial_number                        │  ← Grayed out, cannot type
└──────────────────────────────────────┘

🔒 This is a required system field. The field name
   cannot be changed...
```

### ✏️ Editable Specification Field (Normal Input)
```
System Field *
┌──────────────────────────────────────┐
│ specifications.ram                   │  ← Can edit
└──────────────────────────────────────┘

Format: specifications.fieldname (plural)
```

---

## Purpose of Import Intelligence

**Import Intelligence is NOT for renaming system fields.**

It's for:

### 1. **Column Mapping** (What You're Configuring Here)
Maps supplier column names → your system fields

**Example:**
```
Supplier's Excel:          Our System:
─────────────────          ────────────
"Item Serial"       →      serial_number
"S/N"               →      serial_number
"Service Tag"       →      serial_number

"Manufacturer"      →      brand
"MFG"               →      brand
"Make"              →      brand
```

The keywords tell the system: "When you see a column called 'Item Serial' or 'S/N', map it to `serial_number`"

### 2. **Value Normalization** (Different Tab)
Normalizes supplier values → your database records

**Example:**
```
Supplier Says:          We Normalize To:
──────────────          ────────────────
"Dell Laptop"     →     "Laptop" (product type)
"Notebooks"       →     "Laptop"
"Portable PC"     →     "Laptop"
```

### 3. **Component Parsing** (Different Tab)
Extracts structured data from text

**Example:**
```
Supplier Value:         Parsed As:
───────────────         ──────────
"2x8GB DDR4"     →      2 components of 8GB DDR4 each
"512GB SSD"      →      1 component of 512GB SSD
```

---

## Benefits

✅ **Prevents Typos** - No more `serail_number` or `sereal_number`

✅ **Consistent Keywords** - Pre-populated with common variations

✅ **Clear Locked vs Editable** - Visual indicators show what can be changed

✅ **Faster Setup** - One click instead of manually typing everything

✅ **Comprehensive Coverage** - All essential fields pre-configured

✅ **Guided Experience** - Descriptions explain what each field does

✅ **Prevents Breaking Changes** - Locked fields protect database integrity

---

## FAQ

**Q: Why can't I change `serial_number` to `serial`?**

A: `serial_number` is a database column name hardcoded in the schema and application code. Changing it would break the system.

**Q: Can I add custom fields?**

A: Yes! Custom fields go in `other_specs` and must start with `specifications.` (e.g., `specifications.warranty_months`)

**Q: What if my supplier uses "SN" instead of "Serial Number"?**

A: That's what keywords are for! Add "SN" to the keywords list: `serial, sn, s/n, SN#, serial no`

**Q: Can I customize specification names?**

A: Yes! `specifications.ram` can be changed to `specifications.memory` since they're stored in `other_specs` JSONB.

**Q: What if I don't see a field I need?**

A: Use the manual form below the dropdown to create a custom field.

---

## Technical Details

### Database Schema

**Direct Fields** (locked) are actual table columns:
```sql
CREATE TABLE expected_receiving_items (
  serial_number text,          -- ← Hardcoded column name
  product_type text,           -- ← Hardcoded column name
  brand text,                  -- ← Hardcoded column name
  model text,                  -- ← Hardcoded column name
  unit_cost numeric,           -- ← Hardcoded column name
  other_specs jsonb            -- ← Custom specs stored here
);
```

**Specifications** (editable) are stored in `other_specs`:
```json
{
  "cpu": "Intel i7-8650U",
  "ram": "16GB DDR4",
  "storage": "512GB SSD"
}
```

You can use ANY key names in `other_specs`, so these are customizable.

---

## Summary

The **Quick Add System Field** dropdown:

1. ⚡ **Speeds up configuration** with one-click field selection
2. 🔒 **Protects system integrity** by locking critical database fields
3. ✏️ **Allows customization** of specifications stored in JSONB
4. 🎯 **Prevents errors** with pre-validated field names and keywords
5. 📚 **Educates users** about field types and purposes
6. 🚀 **Improves onboarding** for new companies setting up import intelligence

Users get a guided, error-proof experience while maintaining system stability!
