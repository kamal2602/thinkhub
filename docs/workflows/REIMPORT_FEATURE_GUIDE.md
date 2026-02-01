# PO Re-import Feature Guide

## Overview

The Re-import feature allows you to correct column mapping mistakes after importing a Purchase Order with expected receiving items. This is useful when you discover that fields were mapped incorrectly during the initial import.

## When to Use Re-import

Use this feature when:
- You imported a PO with wrong column mappings (e.g., CPU data went into RAM field)
- You need to fix the expected receiving items data
- **No receiving has started yet** (no items have been marked as received)

## How It Works

### Step 1: Identify a PO That Needs Correction

Navigate to **Purchase Orders** list and find the PO that was imported with incorrect mappings.

### Step 2: Click "Re-import"

For POs with status `draft` or `submitted`, you'll see a **Re-import** button (orange refresh icon) in the Actions column.

**What happens:**
- System checks if any items have been received yet
- If receiving started: Shows error and blocks re-import
- If no receiving: Opens the PO edit form with a warning banner

### Step 3: Use Bulk Import to Re-upload Data

1. In the PO edit form, click the **Bulk Import from Excel** button
2. Upload the same Excel file (or a corrected version)
3. **Fix your column mappings** - This is where you correct the mistakes
4. Complete the import process

### Step 4: Save the Updated PO

Click **Save** to apply changes.

**What happens behind the scenes:**
1. All existing `expected_receiving_items` are deleted
2. New `expected_receiving_items` are created from the corrected import data
3. The PO number and metadata remain unchanged
4. Success toast confirms completion

## Safety Features

### Receiving Status Check

The system prevents re-import if receiving has started:

```typescript
// Checks performed:
- Total expected items count
- Total received items count
- If any items received → Block re-import
- If no items received → Allow re-import
```

### Visual Warnings

When in re-import mode, you'll see a yellow warning banner:

```
⟳ Re-import PO PO-20251109-0002
Fix your column mappings and upload the corrected file.
The existing expected items will be replaced with the new data.
```

## Example Workflow

### Scenario: RAM and CPU Swapped

**Problem:**
- Imported 262 laptops from supplier
- Mapped supplier column "Memory" → CPU (wrong!)
- Mapped supplier column "Processor" → RAM (wrong!)
- All 262 items now have swapped data

**Solution:**
1. Go to Purchase Orders
2. Find the problematic PO (e.g., PO-20251109-0002)
3. Click **Re-import** button
4. Click **Bulk Import from Excel**
5. Upload the same file
6. In mapping step:
   - Map "Memory" → RAM / Memory (correct)
   - Map "Processor" → CPU / Processor (correct)
7. Complete import and click **Save**
8. All 262 expected items now have correct data

## Technical Details

### Database Operations

When you save a re-imported PO:

```sql
-- 1. Delete old expected items (lines 315-319)
DELETE FROM expected_receiving_items
WHERE purchase_order_id = :po_id;

-- 2. Delete old PO lines (lines 288-292)
DELETE FROM purchase_order_lines
WHERE purchase_order_id = :po_id;

-- 3. Insert new PO lines (lines 308-311)
INSERT INTO purchase_order_lines (...);

-- 4. Insert new expected items (lines 358-363)
INSERT INTO expected_receiving_items (...);
```

### Files Modified

- **PurchaseOrdersList.tsx**: Added re-import button and handler
- **purchaseOrderUtils.ts**: Created utility to check receiving status
- **PurchaseOrderForm.tsx**: Already had delete/recreate logic

## Limitations

1. **Cannot re-import if receiving started**: Once any item is marked as received, re-import is blocked
2. **PO must be draft or submitted**: Closed or cancelled POs cannot be re-imported
3. **Manual corrections required for partial receiving**: If receiving is in progress, you must manually edit individual items

## Alternative: Delete & Re-create

If re-import doesn't meet your needs:

1. Delete the PO entirely (trash icon)
2. Fix your column mappings in Import Intelligence settings
3. Create a new PO by importing again
4. New PO gets a new PO number

**When to use this:**
- You want to completely start over
- The PO has other issues beyond mapping
- You prefer a fresh PO number

## Best Practices

1. **Test mappings first**: Import a small test PO before importing hundreds of items
2. **Save templates**: Use the "Save as Template" feature for frequently-used mappings
3. **Fix mappings in settings**: Update Import Intelligence rules so future imports work correctly
4. **Document corrections**: Add notes to the PO explaining what was fixed
