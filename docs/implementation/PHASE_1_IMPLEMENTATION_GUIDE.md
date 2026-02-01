# Phase 1 Implementation Guide: Foundation Setup
**Estimated Time:** 1 Week
**Risk Level:** Low (Non-Breaking Changes Only)

---

## OVERVIEW

Phase 1 establishes the foundation for the engine-based architecture without breaking any existing functionality. This phase is 100% backward compatible and can be rolled back instantly.

**What This Phase Does:**
- ✅ Adds engine toggle flags to database
- ✅ Creates admin UI for managing engine toggles
- ✅ Adds service layer for engine management
- ✅ Sets up infrastructure for future workspace migration
- ✅ Does NOT change any existing workflows

**What This Phase Does NOT Do:**
- 🚫 Does not change navigation structure yet
- 🚫 Does not move any components
- 🚫 Does not modify existing tables (only adds columns)
- 🚫 Does not require user training

---

## STEP 1: DATABASE MIGRATION

### File: `supabase/migrations/20260202000000_add_engine_toggles.sql`

```sql
/*
  # Add Engine Toggle Flags to Companies

  This migration adds boolean flags to the companies table to enable/disable
  different business engines (modules) per company.

  ## Changes
  1. Add engine toggle columns to companies table
  2. Set intelligent defaults based on existing data
  3. Add indexes for performance
  4. Update RLS policies if needed

  ## Backward Compatibility
  - All new columns have default values
  - Existing queries continue to work
  - No breaking changes
*/

-- Add engine toggle columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS reseller_enabled boolean DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS itad_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS recycling_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auction_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS crm_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS consignment_enabled boolean DEFAULT false;

-- Intelligently enable flags based on existing usage
-- If company has ITAD projects, enable ITAD engine
UPDATE companies
SET itad_enabled = true
WHERE id IN (
  SELECT DISTINCT company_id
  FROM itad_projects
  WHERE company_id IS NOT NULL
);

-- If company has auction lots, enable auction engine
UPDATE companies
SET auction_enabled = true
WHERE id IN (
  SELECT DISTINCT company_id
  FROM auction_lots
  WHERE company_id IS NOT NULL
);

-- If company has harvested components, enable recycling engine
UPDATE companies
SET recycling_enabled = true
WHERE id IN (
  SELECT DISTINCT company_id
  FROM harvested_components_inventory
  WHERE company_id IS NOT NULL
  GROUP BY company_id
  HAVING COUNT(*) > 0
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_engine_flags
ON companies(reseller_enabled, itad_enabled, recycling_enabled, auction_enabled);

-- Add comments for documentation
COMMENT ON COLUMN companies.reseller_enabled IS 'Enable IT reseller features (purchases, refurbishment, sales)';
COMMENT ON COLUMN companies.itad_enabled IS 'Enable ITAD service features (data sanitization, certificates, compliance)';
COMMENT ON COLUMN companies.recycling_enabled IS 'Enable recycling features (component harvesting, material tracking)';
COMMENT ON COLUMN companies.auction_enabled IS 'Enable auction features (lot management, bid tracking)';
COMMENT ON COLUMN companies.website_enabled IS 'Enable eCommerce storefront (public catalog, shopping cart)';
COMMENT ON COLUMN companies.crm_enabled IS 'Enable CRM features (leads, opportunities, activities)';
COMMENT ON COLUMN companies.consignment_enabled IS 'Enable consignment features (customer-owned inventory)';
```

**Testing Checklist:**
- [ ] Migration runs without errors
- [ ] Existing companies have correct default values
- [ ] All existing queries still work
- [ ] RLS policies still enforce correctly
- [ ] Can query companies table as before

---

## STEP 2: SERVICE LAYER

### File: `src/services/engineService.ts`

```typescript
import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface EngineToggles {
  reseller_enabled: boolean;
  itad_enabled: boolean;
  recycling_enabled: boolean;
  auction_enabled: boolean;
  website_enabled: boolean;
  crm_enabled: boolean;
  consignment_enabled: boolean;
}

export interface Company {
  id: string;
  name: string;
  reseller_enabled: boolean;
  itad_enabled: boolean;
  recycling_enabled: boolean;
  auction_enabled: boolean;
  website_enabled: boolean;
  crm_enabled: boolean;
  consignment_enabled: boolean;
}

export class EngineService extends BaseService {
  /**
   * Get engine toggles for a specific company
   */
  async getEngineToggles(companyId: string): Promise<EngineToggles> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('reseller_enabled, itad_enabled, recycling_enabled, auction_enabled, website_enabled, crm_enabled, consignment_enabled')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to fetch engine toggles');
  }

  /**
   * Update engine toggles for a company
   * Only admins should be able to call this
   */
  async updateEngineToggles(companyId: string, toggles: Partial<EngineToggles>): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('companies')
        .update(toggles)
        .eq('id', companyId);

      if (error) throw error;
    }, 'Failed to update engine toggles');
  }

  /**
   * Check if a specific engine is enabled
   */
  async isEngineEnabled(companyId: string, engine: keyof EngineToggles): Promise<boolean> {
    return this.executeQuery(async () => {
      const toggles = await this.getEngineToggles(companyId);
      return toggles[engine] ?? false;
    }, `Failed to check ${engine} status`);
  }

  /**
   * Get list of active engines for a company
   */
  async getActiveEngines(companyId: string): Promise<string[]> {
    return this.executeQuery(async () => {
      const toggles = await this.getEngineToggles(companyId);
      const activeEngines: string[] = [];

      if (toggles.reseller_enabled) activeEngines.push('reseller');
      if (toggles.itad_enabled) activeEngines.push('itad');
      if (toggles.recycling_enabled) activeEngines.push('recycling');
      if (toggles.auction_enabled) activeEngines.push('auction');
      if (toggles.website_enabled) activeEngines.push('website');
      if (toggles.crm_enabled) activeEngines.push('crm');
      if (toggles.consignment_enabled) activeEngines.push('consignment');

      return activeEngines;
    }, 'Failed to get active engines');
  }
}

export const engineService = new EngineService();
```

**Testing Checklist:**
- [ ] Service compiles without errors
- [ ] Can fetch engine toggles
- [ ] Can update engine toggles (as admin)
- [ ] Non-admins cannot update toggles (RLS enforced)
- [ ] Active engines list is accurate

---

## STEP 3: UPDATE SERVICE EXPORTS

### File: `src/services/index.ts`

Add to the bottom:
```typescript
export * from './engineService';
```

**Testing Checklist:**
- [ ] No TypeScript errors
- [ ] Service can be imported from barrel export
- [ ] Build succeeds

---

## STEP 4: CONTEXT HOOK (Optional Enhancement)

### File: `src/hooks/useEngines.ts`

```typescript
import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { engineService, EngineToggles } from '../services/engineService';

export function useEngines() {
  const { selectedCompany } = useCompany();
  const [engines, setEngines] = useState<EngineToggles | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadEngines();
    } else {
      setEngines(null);
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  const loadEngines = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const toggles = await engineService.getEngineToggles(selectedCompany.id);
      setEngines(toggles);
    } catch (error) {
      console.error('Failed to load engine toggles:', error);
      // Default to reseller-only on error
      setEngines({
        reseller_enabled: true,
        itad_enabled: false,
        recycling_enabled: false,
        auction_enabled: false,
        website_enabled: false,
        crm_enabled: false,
        consignment_enabled: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = (engine: keyof EngineToggles): boolean => {
    return engines?.[engine] ?? false;
  };

  return {
    engines,
    loading,
    isEnabled,
    refresh: loadEngines,
  };
}
```

**Testing Checklist:**
- [ ] Hook compiles without errors
- [ ] Returns correct engine states
- [ ] Loads when company changes
- [ ] Handles loading state correctly

---

## STEP 5: ENGINE TOGGLES UI COMPONENT

### File: `src/components/settings/EngineToggles.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { engineService, EngineToggles as EngineTogglesType } from '../../services/engineService';
import { useToast } from '../../contexts/ToastContext';
import {
  ShoppingBag,
  Shield,
  Recycle,
  Gavel,
  Globe,
  Users,
  Package
} from 'lucide-react';

interface EngineConfig {
  key: keyof EngineTogglesType;
  name: string;
  description: string;
  icon: any;
  color: string;
  features: string[];
}

const ENGINE_CONFIGS: EngineConfig[] = [
  {
    key: 'reseller_enabled',
    name: 'IT Reseller',
    description: 'Buy, refurbish, and sell IT equipment',
    icon: ShoppingBag,
    color: 'blue',
    features: [
      'Purchase Orders & Receiving',
      'Asset Testing & Refurbishment',
      'Grading & Condition Assessment',
      'Sales Invoicing',
      'Profit Tracking',
      'Warranty & RMA Management',
    ],
  },
  {
    key: 'itad_enabled',
    name: 'ITAD Services',
    description: 'IT Asset Disposition services for enterprise clients',
    icon: Shield,
    color: 'red',
    features: [
      'ITAD Project Management',
      'Data Sanitization Tracking',
      'Certificate Generation',
      'Customer Portal Access',
      'Revenue Share Settlements',
      'Environmental Compliance',
    ],
  },
  {
    key: 'recycling_enabled',
    name: 'Recycling',
    description: 'Component harvesting and material recovery',
    icon: Recycle,
    color: 'green',
    features: [
      'Component Harvesting',
      'Parts Inventory Management',
      'Component Sales',
      'Material Breakdown Tracking',
      'Downstream Vendor Management',
      'Scrap Value Calculation',
    ],
  },
  {
    key: 'auction_enabled',
    name: 'Auctions',
    description: 'Bulk sales through auction channels',
    icon: Gavel,
    color: 'yellow',
    features: [
      'Auction Lot Management',
      'Multiple Platform Support',
      'Bid Tracking',
      'Settlement & Commission',
      'Buyer Account Management',
    ],
  },
  {
    key: 'website_enabled',
    name: 'eCommerce',
    description: 'Public storefront for online sales',
    icon: Globe,
    color: 'purple',
    features: [
      'Public Product Catalog',
      'Shopping Cart & Checkout',
      'Payment Processing (Stripe)',
      'Customer Accounts',
      'Order Fulfillment',
      'Shipping Integration',
    ],
  },
  {
    key: 'crm_enabled',
    name: 'CRM',
    description: 'Customer relationship management',
    icon: Users,
    color: 'pink',
    features: [
      'Lead Management',
      'Sales Pipeline',
      'Activity Tracking',
      'Quote Generation',
      'Opportunity Management',
    ],
  },
  {
    key: 'consignment_enabled',
    name: 'Consignment',
    description: 'Manage customer-owned inventory',
    icon: Package,
    color: 'indigo',
    features: [
      'Consignment Agreements',
      'Customer-Owned Inventory',
      'Revenue Sharing',
      'Settlement Tracking',
    ],
  },
];

export function EngineToggles() {
  const { selectedCompany } = useCompany();
  const { userRole } = useAuth();
  const { showToast } = useToast();
  const [toggles, setToggles] = useState<EngineTogglesType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadToggles();
    }
  }, [selectedCompany?.id]);

  const loadToggles = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const data = await engineService.getEngineToggles(selectedCompany.id);
      setToggles(data);
    } catch (error) {
      console.error('Failed to load engine toggles:', error);
      showToast('Failed to load engine settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (engine: keyof EngineTogglesType) => {
    if (!selectedCompany?.id || !toggles || userRole !== 'admin') return;

    try {
      setSaving(true);
      const newValue = !toggles[engine];

      await engineService.updateEngineToggles(selectedCompany.id, {
        [engine]: newValue,
      });

      setToggles({ ...toggles, [engine]: newValue });
      showToast(
        `${ENGINE_CONFIGS.find(e => e.key === engine)?.name} ${newValue ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      console.error('Failed to update engine toggle:', error);
      showToast('Failed to update engine setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedCompany) {
    return <div className="p-6 text-gray-500">Please select a company first.</div>;
  }

  if (userRole !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Only administrators can manage engine settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading engine settings...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Business Engines</h1>
        <p className="text-slate-600 mt-1">
          Enable or disable business modules for your company. Changes take effect immediately.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ENGINE_CONFIGS.map((engine) => {
          const Icon = engine.icon;
          const isEnabled = toggles?.[engine.key] ?? false;
          const colorClasses = {
            blue: 'bg-blue-500 border-blue-200',
            red: 'bg-red-500 border-red-200',
            green: 'bg-green-500 border-green-200',
            yellow: 'bg-yellow-500 border-yellow-200',
            purple: 'bg-purple-500 border-purple-200',
            pink: 'bg-pink-500 border-pink-200',
            indigo: 'bg-indigo-500 border-indigo-200',
          };

          return (
            <div
              key={engine.key}
              className={`bg-white rounded-lg border-2 p-6 transition-all ${
                isEnabled ? colorClasses[engine.color as keyof typeof colorClasses] + ' border-2' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isEnabled ? 'bg-white bg-opacity-20' : 'bg-slate-100'
                }`}>
                  <Icon className={`w-6 h-6 ${isEnabled ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <button
                  onClick={() => handleToggle(engine.key)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isEnabled
                      ? 'bg-white text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${isEnabled ? 'text-white' : 'text-slate-800'}`}>
                {engine.name}
              </h3>
              <p className={`text-sm mb-4 ${isEnabled ? 'text-white text-opacity-90' : 'text-slate-600'}`}>
                {engine.description}
              </p>

              <div className="space-y-2">
                <p className={`text-xs font-medium uppercase ${
                  isEnabled ? 'text-white text-opacity-75' : 'text-slate-500'
                }`}>
                  Features:
                </p>
                <ul className="space-y-1">
                  {engine.features.map((feature, idx) => (
                    <li key={idx} className={`text-sm flex items-center ${
                      isEnabled ? 'text-white text-opacity-90' : 'text-slate-600'
                    }`}>
                      <span className="mr-2">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Disabling an engine hides its features in the navigation but does not delete any data.
          You can safely re-enable engines at any time without data loss.
        </p>
      </div>
    </div>
  );
}
```

**Testing Checklist:**
- [ ] Component renders without errors
- [ ] Shows current engine states
- [ ] Admin can toggle engines on/off
- [ ] Non-admin sees permission message
- [ ] Changes persist after page reload
- [ ] Toast notifications work

---

## STEP 6: ADD TO NAVIGATION

### File: `src/pages/DashboardPage.tsx`

Add import at top:
```typescript
import { EngineToggles } from '../components/settings/EngineToggles';
```

Add route in the main section (around line 150):
```typescript
{currentPage === 'engine-toggles' && <EngineToggles />}
```

### File: `src/components/layout/SimplifiedAppBar.tsx`

Add to Settings module pages array:
```typescript
{
  id: 'settings',
  name: 'Settings',
  icon: Settings,
  color: 'bg-slate-500',
  roles: ['admin', 'manager'],
  pages: [
    { name: 'Engine Toggles', page: 'engine-toggles', roles: ['admin'] }, // ADD THIS
    { name: 'Product Setup', page: 'product-setup' },
    { name: 'Business Rules', page: 'business-rules' },
    { name: 'System Config', page: 'system-config' },
    { name: 'Processing Stages', page: 'processing-stages' },
  ]
},
```

**Testing Checklist:**
- [ ] "Engine Toggles" appears in Settings menu (admin only)
- [ ] Clicking navigates to EngineToggles component
- [ ] Page loads without errors
- [ ] Can toggle engines and see changes

---

## STEP 7: BUILD & TEST

### Build the application
```bash
npm run build
```

**Expected Result:**
- ✅ Build succeeds with 0 errors
- ✅ No TypeScript errors
- ✅ No linting errors

### Manual Testing Checklist

**As Admin:**
- [ ] Log in as admin user
- [ ] Navigate to Settings → Engine Toggles
- [ ] See all 7 engines listed
- [ ] Toggle each engine on/off
- [ ] Verify toast notifications appear
- [ ] Reload page - toggles persist
- [ ] Check database - company record updated

**As Non-Admin:**
- [ ] Log in as manager/staff
- [ ] Navigate to Settings
- [ ] "Engine Toggles" should NOT appear in menu OR
- [ ] If visible, shows permission message

**Database Verification:**
```sql
SELECT
  name,
  reseller_enabled,
  itad_enabled,
  recycling_enabled,
  auction_enabled,
  website_enabled,
  crm_enabled,
  consignment_enabled
FROM companies;
```

**Expected:** All columns exist and have boolean values

---

## STEP 8: ROLLBACK PLAN (If Needed)

If anything goes wrong, rollback is simple:

### 1. Remove migration
```bash
# If migration hasn't been applied to production yet
rm supabase/migrations/20260202000000_add_engine_toggles.sql
```

### 2. Revert code changes
```bash
git revert <commit-hash>
```

### 3. Database rollback (if migration was applied)
```sql
ALTER TABLE companies
DROP COLUMN IF EXISTS reseller_enabled,
DROP COLUMN IF EXISTS itad_enabled,
DROP COLUMN IF EXISTS recycling_enabled,
DROP COLUMN IF EXISTS auction_enabled,
DROP COLUMN IF EXISTS website_enabled,
DROP COLUMN IF EXISTS crm_enabled,
DROP COLUMN IF EXISTS consignment_enabled;
```

**Impact:** Zero data loss, existing features continue working normally

---

## COMPLETION CRITERIA

Phase 1 is complete when:

- ✅ Migration applied successfully
- ✅ Companies table has 7 new boolean columns
- ✅ `engineService` can read/write toggles
- ✅ `useEngines` hook works correctly
- ✅ EngineToggles UI component works
- ✅ Admin can toggle engines on/off
- ✅ Changes persist in database
- ✅ Build succeeds with 0 errors
- ✅ All existing features still work
- ✅ No user-facing changes (except new settings page)

---

## NEXT STEPS

After Phase 1 is complete and verified:

**Phase 2:** Workspace-based navigation
- Update SimplifiedAppBar with workspace structure
- Add conditional visibility based on engine toggles
- Keep old navigation working in parallel

**Phase 3:** Component reorganization
- Move components into workspace folders
- Update imports
- Keep old routes as aliases

**Phase 4+:** Build missing engine features
- CRM tables & UI
- Recycling enhancements
- Website storefront
- ITAD wizard
- Auction improvements

---

**Document Version:** 1.0
**Created:** February 1, 2026
**Estimated Completion:** 1 Week
**Risk Level:** Low
