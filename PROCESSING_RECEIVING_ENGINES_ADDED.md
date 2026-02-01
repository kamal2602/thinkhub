# Processing & Receiving Engines Added

**Date:** 2026-02-01
**Issue:** Processing and Receiving modules missing from sidebar

## Problem

The **Processing** (asset testing/grading workflow) and **Receiving** (smart PO receiving) features were not visible in the sidebar because they didn't have corresponding engines in the `engines` table.

### What Existed:
- ✅ `/processing` route in PageRouter
- ✅ `/smart-receiving` route in PageRouter
- ✅ Processing.tsx component (114KB - asset workflow management)
- ✅ SmartReceivingWorkflow.tsx component (73KB - PO receiving)
- ❌ NO "processing" engine in engines table
- ❌ NO "receiving" engine in engines table

### Why This Happened:
The engine registry was created recently but Processing and Receiving were legacy features that pre-dated the registry system. They existed as standalone routes but weren't registered as engines.

## Solution

Created migration `20260201180000_add_processing_receiving_engines.sql` that adds both engines to the registry:

### Processing Engine
- **Key:** `processing`
- **Title:** Processing
- **Description:** Asset testing, grading, and refurbishment workflow
- **Icon:** Wrench
- **Category:** operations
- **Route:** `/processing`
- **Dependencies:** inventory
- **Default State:** Installed & Enabled (core operations feature)

### Receiving Engine
- **Key:** `receiving`
- **Title:** Receiving
- **Description:** Smart receiving and purchase order processing
- **Icon:** PackageOpen
- **Category:** operations
- **Route:** `/smart-receiving`
- **Dependencies:** inventory
- **Default State:** Installed & Enabled (core operations feature)

## Migration Details

The migration:
1. Updates `initialize_engines_for_company()` function to include both engines
2. Adds Processing and Receiving to all existing companies
3. Sets both as enabled by default (essential operations features)
4. Properly orders them in the Operations category (sort_order 10 & 11)

## After Applying Migration

**You will see in sidebar (Operations section):**
- Processing
- Receiving
- Purchase Lots
- (Recycling if enabled)

**Click Processing →** Opens `/processing` workspace with:
- Asset grid/kanban views
- Testing checklists
- Grading workflows
- Technician assignment
- Processing stages

**Click Receiving →** Opens `/smart-receiving` workspace with:
- Smart PO import
- Expected receiving items
- Barcode scanning
- Auto-creation of assets
- Lot assignment

## How to Apply

Run the migration:
```bash
# If using Supabase CLI locally
npx supabase migration up

# Or apply via Supabase dashboard
# Copy migration SQL → Database → SQL Editor → Run
```

## Verification

After migration:
1. Refresh the app
2. Check sidebar → Operations section
3. Should see: Processing, Receiving, Purchase Lots
4. Click Processing → should load asset processing workspace
5. Click Receiving → should load smart receiving workflow

## Related Engines

**Operations Category:**
- Processing (NEW - enabled by default)
- Receiving (NEW - enabled by default)
- Purchase Lots (enabled by default)
- Recycling (disabled by default)

**All depend on Inventory** (core engine, always enabled)

## Technical Notes

- Both components already existed and work perfectly
- Only needed to register them in the engine system
- No code changes required - pure configuration
- Backward compatible (routes unchanged)
- Default enabled because these are core operational features

## Build Status

✅ Clean build with no errors
✅ All routes functional
✅ Components load correctly
