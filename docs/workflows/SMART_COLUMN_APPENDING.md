# Smart Column Appending Feature

## Overview
The Smart Column Appending feature allows you to add missing column data to items during an active receiving session without starting over.

## Use Case
You're in the middle of receiving items and realize you forgot to map an important column (like Description, Product Type, or a specification). Instead of canceling and restarting, you can append the missing data.

## How It Works

### Step 1: Start Normal Receiving
1. Go to **Purchases → Smart Receiving**
2. Select a Purchase Order
3. Upload packing list file
4. Map columns (but miss one or more columns)
5. Click "Start Receiving"
6. You're now in the scanning phase

### Step 2: Realize You Missed a Column
While scanning items, you notice important data is missing (e.g., Product Type, Description, RAM specs).

### Step 3: Add Missing Columns
1. Click the **"Add Missing Columns"** button (green button next to Bulk Mode)
2. Upload the same file again (or a new file with matching serial numbers)
3. **Map Columns:**
   - **REQUIRED:** Map the Serial Number column (used to match existing items)
   - **Map ONLY the missing columns** you want to add
   - **Skip columns already imported** by selecting "-- Skip This Column --"

### Step 4: Update Items
1. Review your mappings
2. Click "Update Items"
3. System will:
   - Match each row by Serial Number
   - Update only the mapped columns
   - Show results: "Updated X items. Y serial numbers not found."

### Step 5: Continue Receiving
You're back to the scanning screen with updated data. Continue scanning as normal.

## Example Scenario

**Initial Import:**
- Mapped: Serial Number, Brand, Model, Unit Cost
- Forgot: Product Type, Description, RAM

**File Data:**
```
Serial Number | Brand | Model      | Product Type | Description           | RAM
SN12345      | Dell  | Latitude   | Laptop       | Dell Latitude E7470  | 16GB
SN12346      | HP    | EliteBook  | Laptop       | HP EliteBook 840     | 8GB
```

**First Import Mapping:**
- Serial Number → Serial Number
- Brand → Brand
- Model → Model
- Unit Cost → Unit Cost
- (Product Type, Description, RAM not mapped)

**Append Mapping:**
- Serial Number → Serial Number (REQUIRED)
- Product Type → Product Type / Category
- Description → Description
- RAM → RAM / Memory
- (Skip Brand, Model, Unit Cost - already imported)

**Result:**
- Items with SN12345 and SN12346 now have Product Type, Description, and RAM data
- Brand, Model, Unit Cost remain unchanged
- Continue receiving with complete data

## Key Features

### Matching Logic
- Matches by Serial Number (case-insensitive)
- Only updates items in the current receiving session
- Skips serial numbers not found

### Field Support
- **Direct Fields:** Product Type, Brand, Model, Description, Unit Cost, Quantity, Grade, Supplier SKU, Notes
- **Specifications:** CPU, RAM, Storage, Screen Size, Graphics, OS, Functional Status, Cosmetic Notes
- All 18 configurable fields from Import Field Mappings

### Safety Features
- ✅ Requires Serial Number mapping (prevents accidental updates)
- ✅ Only updates mapped columns (preserves existing data)
- ✅ Shows update summary with counts
- ✅ Non-destructive (doesn't delete existing data)
- ✅ Can cancel at any time

### Multiple Uses
- Can append columns multiple times in the same session
- Each append operation is independent
- Can use different files for different data

## Tips

1. **Keep Original File:** Save your original packing list so you can re-upload it for appending
2. **Map Serials First:** Always ensure Serial Number is mapped in the append screen
3. **Skip Existing Data:** Don't remap columns already imported (no harm, but unnecessary)
4. **Check Results:** Review the update count message to verify success
5. **Add Multiple Columns:** You can map multiple missing columns in one append operation

## When to Use

✅ **Use Smart Column Appending When:**
- You forgot to map important columns during initial import
- Supplier sends additional data in a separate file
- You want to add specifications not in the original file
- You need to update specific fields for all items

❌ **Don't Use When:**
- You haven't started receiving yet (just restart from mapping step)
- Serial numbers don't match between files
- You want to add completely new items (use bonus item scan instead)

## Technical Details

**Database Updates:**
- Updates `expected_receiving_items` table
- Preserves `expected_specs` JSON (merges new specs)
- Real-time UI updates after successful append
- Transaction-safe (each item updated independently)

**Supported File Formats:**
- CSV (.csv)
- Excel (.xlsx, .xls)

**Performance:**
- Processes items sequentially
- Shows progress with toast notifications
- Returns to scan screen after completion
