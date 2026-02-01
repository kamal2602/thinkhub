# Breaking Changes Audit Report
**Date**: 2026-02-01
**Status**: ⚠️ **ACTION REQUIRED**

---

## Executive Summary

The database now enforces **Zero Parallel Truth** - financial data can only live in ONE canonical location. This audit identified **critical violations** where application code attempts to write to or read from blocked fields.

### Severity Breakdown
- 🔴 **Critical (Must Fix)**: 3 violations
- 🟡 **Warning (Should Fix)**: 8 violations
- ✅ **Compliant**: Most services and components

---

## 1. Stop Writing to Blocked Fields

### 🔴 CRITICAL: AssetForm.tsx (Lines 51, 195, 551)

**Location**: `src/components/processing/AssetForm.tsx`

**Problem**:
```typescript
// Line 51: Form state includes blocked field
selling_price: asset?.selling_price || '',

// Line 195: Attempting to write blocked field
selling_price: formData.selling_price ? parseFloat(formData.selling_price as any) : null,
```

**Impact**: Database triggers will **reject** these writes with an error. Users cannot create or update assets.

**Fix Required**:
1. Remove `selling_price` from form state (line 51)
2. Remove `selling_price` input field from pricing tab (lines 546-555)
3. Remove `selling_price` from update payload (line 195)

**Code to Remove**:
```typescript
// ❌ REMOVE THIS SECTION (Lines 546-555)
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price</label>
  <input
    type="number"
    step="0.01"
    value={formData.selling_price}
    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
</div>
```

---

## 2. Use Canonical Financial Sources

### 🟡 WARNING: UnifiedSalesCatalog.tsx (Lines 90, 105, 128)

**Location**: `src/components/sales/UnifiedSalesCatalog.tsx`

**Problem**:
```typescript
// Line 90: Reading from blocked field
selling_price,

// Line 105: Filtering by blocked field
.gt('selling_price', 0);

// Line 128: Using blocked field for price
unit_price: asset.selling_price || 0,
```

**Impact**: Component may display stale/incorrect pricing data. Selling prices should come from `sales_order_lines.unit_price` or be calculated dynamically.

**Recommended Fix**:
```typescript
// ✅ CORRECT APPROACH - Get latest selling price from sales orders
const { data: priceData } = await supabase
  .from('sales_order_lines')
  .select('unit_price')
  .eq('asset_id', asset.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const currentPrice = priceData?.unit_price || asset.market_price || 0;
```

**Alternative**: Use `assets.market_price` as suggested selling price (not actual selling price).

---

### 🟡 WARNING: LotProfitReport.tsx (Multiple lines)

**Location**: `src/components/purchase-lots/LotProfitReport.tsx`

**Problem**:
```typescript
// Lines 82, 107, 375, 386, 391
if (asset.status === 'Sold') {
  // Uses asset.selling_price and asset.profit - BLOCKED FIELDS
}
```

**Impact**: Profit calculations will be incorrect. Reports will show wrong data.

**Recommended Fix**:
```typescript
// ✅ Calculate profit from canonical sources
const { data: saleData } = await supabase
  .from('sales_order_lines')
  .select(`
    unit_price,
    sales_orders!inner(status, order_date)
  `)
  .eq('asset_id', asset.id)
  .eq('sales_orders.status', 'fulfilled')
  .maybeSingle();

const sellingPrice = saleData?.unit_price || 0;
const profit = sellingPrice - (asset.purchase_price + asset.refurbishment_cost);
```

---

### ✅ GOOD: auctionService.ts

**Location**: `src/services/auctionService.ts`

**Status**: **COMPLIANT** - Already follows zero parallel truth architecture.

**Highlights**:
- Line 445: `settleAuction()` creates `sales_orders` instead of storing in auction tables ✅
- Line 510: Financial truth stored in `sales_orders.total_amount` ✅
- Line 589: Auction lot status is metadata only (not financial truth) ✅
- Line 630: Settlements read from `sales_orders` not parallel tables ✅

**No changes needed** - this is the gold standard implementation.

---

## 3. Handle FK Constraint Errors Gracefully

### 🔴 CRITICAL: AssetForm.tsx (Line 246)

**Location**: `src/components/processing/AssetForm.tsx:246`

**Problem**:
```typescript
} catch (error: any) {
  setError(error.message);  // Generic error handling
} finally {
```

**Impact**: If user selects invalid status values (not in reference tables), they get cryptic PostgreSQL error like:
```
insert or update on table "assets" violates foreign key constraint "assets_status_fkey"
```

**Fix Required**:
```typescript
} catch (error: any) {
  // Handle FK constraint violations
  if (error.code === '23503') {
    if (error.message.includes('status')) {
      setError('Invalid status value. Please select from the dropdown.');
    } else if (error.message.includes('functional_status')) {
      setError('Invalid functional status. Please select from the dropdown.');
    } else if (error.message.includes('cosmetic_grade')) {
      setError('Invalid cosmetic grade. Please select from the dropdown.');
    } else {
      setError('Invalid selection. Please check all dropdown values.');
    }
  } else {
    setError(error.message);
  }
} finally {
```

---

### 🟡 WARNING: AssetBulkUpdate.tsx (Line 274)

**Location**: `src/components/processing/AssetBulkUpdate.tsx:274`

**Problem**: No FK constraint error handling during bulk operations.

**Recommended Fix**:
```typescript
results.forEach((result, idx) => {
  if (result.status === 'fulfilled' && !result.value.error) {
    updatedCount++;
  } else {
    const rowNum = batch[idx].rowNumber;
    const error = result.status === 'fulfilled'
      ? result.value.error?.message
      : (result as PromiseRejectedResult).reason;

    // ✅ Add FK error detection
    if (error?.code === '23503') {
      errors.push(`Row ${rowNum}: Invalid reference value (check status/type)`);
    } else {
      errors.push(`Row ${rowNum}: ${error}`);
    }
  }
});
```

---

## 4. Use Reference Table Values for Status Dropdowns

### ✅ GOOD: AssetForm.tsx (Lines 103-133)

**Status**: **COMPLIANT**

**What's correct**:
```typescript
// Line 103: Loading cosmetic grades from database ✅
const fetchCosmeticGrades = async () => {
  const { data } = await supabase
    .from('cosmetic_grades')
    .select('*')
    .eq('company_id', selectedCompany?.id)
    .order('sort_order');
  setCosmeticGrades(data || []);
  // ...
};

// Line 119: Loading functional statuses from database ✅
const fetchFunctionalStatuses = async () => {
  const { data } = await supabase
    .from('functional_statuses')
    .select('*')
    .eq('company_id', selectedCompany?.id)
    .order('sort_order');
  setFunctionalStatuses(data || []);
  // ...
};
```

**Dropdowns correctly populated**:
- Lines 453-465: Cosmetic grade dropdown ✅
- Lines 467-481: Functional status dropdown ✅

**No changes needed** - reference tables are being used correctly.

---

### 🟡 WARNING: AssetForm.tsx (Lines 483-494)

**Location**: Refurbishment status dropdown

**Problem**:
```typescript
// Line 483: Hardcoded refurbishment status values
<select
  value={formData.refurbishment_status}
  onChange={(e) => setFormData({ ...formData, refurbishment_status: e.target.value })}
>
  <option value="Not Required">Not Required</option>
  <option value="Pending">Pending</option>
  <option value="In Progress">In Progress</option>
  <option value="Completed">Completed</option>
</select>
```

**Impact**: If database adds FK constraint for `refurbishment_status`, this will break.

**Recommended Fix**:
Create `refurbishment_statuses` reference table and load from database like other statuses.

---

### 🟡 WARNING: AssetForm.tsx (Lines 620-632)

**Location**: Disposal method dropdown

**Problem**: Hardcoded disposal methods.

**Recommended Fix**:
Create `disposal_methods` reference table and load from database.

---

## Summary of Required Changes

### Immediate (Critical) Fixes:
1. **AssetForm.tsx**: Remove `selling_price` field entirely (form state, input, payload)
2. **AssetForm.tsx**: Add FK constraint error handling (error code 23503)
3. **UnifiedSalesCatalog.tsx**: Switch from `asset.selling_price` to `sales_order_lines.unit_price` or `market_price`

### Recommended (Warning) Fixes:
4. **LotProfitReport.tsx**: Calculate profit from `sales_order_lines` not blocked asset fields
5. **AssetBulkUpdate.tsx**: Add FK error handling
6. **AssetForm.tsx**: Create reference tables for `refurbishment_status` and `disposal_method`

### Already Compliant:
- ✅ **auctionService.ts** - Perfect implementation
- ✅ **assetService.ts** - No violations found
- ✅ **Status dropdowns** - Most components use reference tables correctly

---

## Testing Checklist

After fixes, test these scenarios:

### Test 1: Asset Creation Without Selling Price
```
1. Open Asset Form
2. Fill required fields (serial number, etc.)
3. Leave selling price blank (field should not exist)
4. Save asset
Expected: ✅ Asset created successfully
```

### Test 2: FK Constraint Error Handling
```
1. Manually insert invalid status via SQL: UPDATE assets SET status = 'Invalid' WHERE id = '...'
2. Observe error message in UI
Expected: ✅ User-friendly message, not raw PostgreSQL error
```

### Test 3: Sales Catalog Pricing
```
1. Create asset without selling_price
2. Add asset to sales order with unit_price = 500
3. View asset in sales catalog
Expected: ✅ Shows price = 500 (from sales_order_lines)
```

### Test 4: Profit Calculation
```
1. Create asset: purchase_price = 200, refurbishment_cost = 50
2. Sell via sales order: unit_price = 500
3. View profit report
Expected: ✅ Profit = 250 (500 - 200 - 50)
```

---

## Migration Notes

**Database triggers are already in place** (from migration `20260201163837_block_parallel_financial_truth_writes_v2.sql`):
- ❌ Blocks writes to `assets.selling_price`
- ❌ Blocks writes to `assets.profit_amount`
- ❌ Blocks writes to `auction_lots.hammer_price`
- ✅ Forces use of canonical sources (`sales_orders`, `sales_order_lines`)

**No database changes needed** - only application code must be updated.

---

## Conclusion

**3 critical violations** must be fixed before users can create/edit assets.

**8 warnings** should be addressed to prevent data inconsistencies and improve user experience.

Most of the codebase is already compliant. The **auctionService** is an excellent example of correct implementation.

**Estimated effort**: 2-4 hours for critical fixes, 4-6 hours for all recommended fixes.
