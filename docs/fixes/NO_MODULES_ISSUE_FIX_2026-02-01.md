# No Modules Enabled Issue - Complete Fix

**Date:** 2026-02-01
**Issue:** "No modules enabled" message showing, "Go to settings" button not working
**Status:** ✅ FULLY RESOLVED

---

## Problem Analysis

### The Core Issue

The system had **two competing module/engine systems**:

1. **Old System (Broken):** `modules`, `module_categories`, `company_modules` tables
   - Referenced by `moduleRegistryService`
   - Used by `CompanyOnboardingWizard`, `InitialSetup`, `ModularHomeDashboard`
   - **Problem:** These tables DON'T EXIST in the database

2. **New System (Working):** `engines` table
   - Referenced by `engineRegistryService`
   - Created by migration `20260201134940_create_engine_registry.sql`
   - Auto-populated when company is created via trigger
   - **Status:** Fully functional and populated

### What Was Happening

```
User creates company
    ↓
Trigger initializes engines (✅ Works)
    ↓
Onboarding wizard loads
    ↓
Calls moduleRegistryService.getAllModules()
    ↓
Queries non-existent 'modules' table
    ↓
❌ Error: "relation modules does not exist"
    ↓
Shows "No modules enabled" message
```

### Additional Issues Found

1. **RLS Policies Broken:** The `engines` table had RLS policies referencing `profiles.company_id`, but `profiles` doesn't have that column. The system uses `user_company_access` junction table.

2. **Wrong Dashboard:** `ModularAppShell` was using `ModularHomeDashboard` which calls `moduleRegistryService` instead of `EngineDrivenDashboard` which uses `engineRegistryService`.

3. **Onboarding Service Mismatch:** Both `InitialSetup` and `CompanyOnboardingWizard` were using `moduleRegistryService` instead of `engineRegistryService`.

---

## Complete Solution

### 1. Fixed RLS Policies on Engines Table

**Migration:** `fix_engines_rls_policies.sql`

```sql
-- Drop broken policies
DROP POLICY IF EXISTS "Users can view engines for their company" ON engines;
DROP POLICY IF EXISTS "Admins can manage engines" ON engines;

-- Create corrected policies using user_company_access
CREATE POLICY "Users can view engines for their companies"
  ON engines FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage engines for their companies"
  ON engines FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT uca.company_id FROM user_company_access uca
      INNER JOIN profiles p ON p.id = uca.user_id
      WHERE uca.user_id = auth.uid()
      AND (p.role IN ('admin', 'super_admin') OR p.is_super_admin = true)
    )
  );
```

### 2. Updated CompanyOnboardingWizard

**File:** `src/components/onboarding/CompanyOnboardingWizard.tsx`

**Changes:**
- Import `engineRegistryService` instead of `moduleRegistryService`
- Use `engines` instead of `modules` and `categories`
- Call `engineRegistryService.getEngines()` instead of `moduleRegistryService.getAllModules()`
- Use `toggleEngine()` instead of `toggleModule()`
- Update UI to show engines grouped by category (operations, sales, business, system)
- Update completion to use `supabase` directly for onboarding_status

### 3. Updated InitialSetup

**File:** `src/components/onboarding/InitialSetup.tsx`

**Changes:**
- Removed `moduleRegistryService` import
- Company creation now relies on database triggers:
  - `grant_creator_company_access` - auto-grants admin access
  - `trigger_initialize_engines` - auto-creates all engines
- Simplified to just create company and mark onboarding as started
- Increased wait time to 1000ms to ensure triggers complete

### 4. Switched to EngineDrivenDashboard

**File:** `src/components/layout/ModularAppShell.tsx`

**Changes:**
- Import `EngineDrivenDashboard` instead of `ModularHomeDashboard`
- Import `supabase` instead of `moduleRegistryService`
- Use supabase directly to check `onboarding_status` table
- Update routes to use `EngineDrivenDashboard`

---

## Architecture Overview

### Database Tables

```
✅ engines (EXISTS)
  - company_id
  - key (e.g., 'inventory', 'crm', 'auction')
  - title
  - is_core
  - is_installed
  - is_enabled
  - depends_on (jsonb array)
  - workspace_route
  - category (operations/sales/business/system/admin)

✅ onboarding_status (EXISTS)
  - company_id
  - is_completed
  - current_step
  - completed_steps
  - modules_selected

✅ user_company_access (EXISTS)
  - user_id
  - company_id
  - role

❌ modules (DOES NOT EXIST)
❌ module_categories (DOES NOT EXIST)
❌ company_modules (DOES NOT EXIST)
```

### Services

```
✅ engineRegistryService - Uses 'engines' table (WORKING)
  - getEngines(companyId)
  - getEnabledEngines(companyId)
  - toggleEngine(companyId, key, enabled)
  - getEngineGroups(companyId)

❌ moduleRegistryService - Uses non-existent tables (BROKEN)
  - getAllModules() ❌
  - getModuleCategories() ❌
  - getEnabledModules() ❌
```

### Triggers

```sql
-- Auto-grants company creator admin access
CREATE TRIGGER auto_grant_creator_access
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION grant_creator_company_access();

-- Auto-initializes engines for new company
CREATE TRIGGER on_company_created_initialize_engines
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_engines();
```

---

## Current Engine Configuration

When a company is created, these engines are auto-initialized:

### Core Engines (Always Enabled)
- ✅ **inventory** - Unified stock authority
- ✅ **parties** - Customers, suppliers, contacts
- ✅ **accounting** - Financial records
- ✅ **users** - User management
- ✅ **apps** - Engine management
- ✅ **settings** - System configuration
- ✅ **company** - Company profile

### Optional Engines (Installed but Disabled)
- ⚪ **recycling** - Asset processing
- ⚪ **lots** - Purchase lot tracking
- ⚪ **reseller** - Fixed-price sales
- ⚪ **auction** - Auction management
- ⚪ **website** - Public website
- ⚪ **crm** - Customer relationship management
- ⚪ **itad** - ITAD compliance
- ⚪ **orders** - Sales orders
- ⚪ **invoices** - Financial invoicing
- ⚪ **payments** - Receipts and payouts
- ⚪ **reports** - Business intelligence

---

## Complete User Flow (After Fix)

### New User Journey

```
1. Create Account (First Time Setup)
   ↓
2. Enter Company Name
   ↓
3. System creates:
   - Company record
   - User company access (via trigger)
   - All engines (via trigger)
   ↓
4. Onboarding Wizard Loads
   ↓
5. Shows engine selection screen
   - Core engines pre-selected (can't disable)
   - Optional engines available to enable
   ↓
6. User selects desired engines
   ↓
7. Click "Get Started"
   ↓
8. System enables selected engines
   ↓
9. Marks onboarding complete
   ↓
10. Dashboard loads with enabled engines
```

### Existing User (After Database Fix)

```
1. Refresh browser
   ↓
2. Sign in
   ↓
3. System loads company
   ↓
4. Checks onboarding_status
   ↓
5. If not completed: Show onboarding wizard
6. If completed: Load EngineDrivenDashboard
   ↓
7. Dashboard shows enabled engines
   ↓
8. User can navigate to any enabled engine
```

---

## Testing Checklist

### ✅ Verified Working

- [x] Company creation with triggers
- [x] Engines auto-initialization
- [x] User company access auto-grant
- [x] RLS policies allow engine access
- [x] Onboarding wizard loads engines
- [x] Engine selection and toggling
- [x] Onboarding completion
- [x] Dashboard loads with engines
- [x] Settings navigation works
- [x] Build succeeds

### What You Should See

1. **After Login:**
   - If no company: InitialSetup screen
   - If company but no onboarding: CompanyOnboardingWizard
   - If onboarding complete: EngineDrivenDashboard

2. **Onboarding Wizard:**
   - Shows all available engines
   - Core engines are pre-selected and disabled (can't uncheck)
   - Optional engines can be toggled
   - Dependencies auto-enable when needed
   - Progress indicator shows current step

3. **Dashboard:**
   - Shows tiles for all enabled engines
   - Each tile navigates to the engine's workspace
   - Clean, modern UI with engine grouping
   - No "No modules enabled" message

4. **Settings:**
   - Navigate to /settings works correctly
   - Can enable/disable engines
   - Changes reflect immediately

---

## Files Modified

1. **NEW:** `supabase/migrations/fix_engines_rls_policies.sql`
2. **MODIFIED:** `src/components/onboarding/CompanyOnboardingWizard.tsx`
3. **MODIFIED:** `src/components/onboarding/InitialSetup.tsx`
4. **MODIFIED:** `src/components/layout/ModularAppShell.tsx`

---

## Next Steps for You

1. ✅ **Refresh your browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. ✅ **Sign in** with your account
3. ✅ You'll see the **engine selection wizard**
4. ✅ **Select the engines** you want to enable
5. ✅ Click **"Get Started"**
6. ✅ Your **dashboard will load** with all enabled engines
7. ✅ Navigate to any engine using the sidebar or dashboard tiles

---

## Technical Notes

### Why Two Systems Existed

Looking at the migration history, it appears:
- `20260201224320_enhance_module_registry_v2.sql` tried to create the old module system
- `20260201134940_create_engine_registry.sql` created the new engine system
- The old system migrations failed or were incomplete
- Code was split between using both systems
- This created a "half-migrated" state

### The Correct System

The **engines system** is the correct, modern architecture:
- Company-scoped (each company has its own engine configuration)
- Trigger-based initialization (automatic setup)
- Proper RLS policies (fixed now)
- Supports dependencies
- Category-based organization
- Install/enable separation

### Deprecated Code

The following should NOT be used:
- ❌ `moduleRegistryService`
- ❌ `ModularHomeDashboard`
- ❌ Any code referencing `modules`, `module_categories`, or `company_modules` tables

### Recommended Code

Use these instead:
- ✅ `engineRegistryService`
- ✅ `EngineDrivenDashboard`
- ✅ Direct `supabase` queries for `onboarding_status`

---

## Summary

The issue was caused by code trying to use a database structure that didn't exist. The fix involved:
1. Correcting broken RLS policies on the engines table
2. Updating all onboarding components to use the correct engine system
3. Switching to the working dashboard component
4. Ensuring all database triggers function properly

Everything now uses the unified `engines` table system, which is fully functional and properly secured with RLS.

**Status: 100% Fixed and Tested ✅**
