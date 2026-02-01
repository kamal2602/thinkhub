# ENGINE & WORKSPACE QUICK START GUIDE

Quick reference for working with the engine-aware workspace system.

---

## FOR DEVELOPERS

### Adding a New Page

1. **Add to workspace configuration:**

```typescript
// src/config/workspaces.ts

{
  id: 'sales',
  name: 'Sales',
  icon: DollarSign,
  requiredEngine: 'reseller_enabled', // optional
  modules: [
    {
      id: 'direct-sales',
      name: 'Direct Sales',
      pages: [
        {
          name: 'My New Page',
          page: 'my-new-page',
          requiredRoles: ['admin', 'manager'] // optional
        },
      ],
    },
  ],
}
```

2. **Add route handler:**

```typescript
// src/pages/DashboardPage.tsx

{currentPage === 'my-new-page' && <MyNewPage />}
```

3. **If engine-specific, add guard:**

```typescript
{currentPage === 'my-new-page' && (
  <EngineGuard engine="itad_enabled">
    <MyNewPage />
  </EngineGuard>
)}
```

That's it! Navigation, breadcrumbs, and command palette update automatically.

---

## FOR ADMINS

### Enabling/Disabling Engines

**Location:** Settings → Engine Toggles

**Available Engines:**
- IT Reseller (always enabled)
- ITAD Services
- Recycling
- Auctions
- eCommerce
- CRM
- Consignment

**Effect:**
- Immediate: Navigation updates instantly
- No data loss: Disabling hides features but preserves data
- Reversible: Can re-enable anytime

---

## CHECKING ENGINE STATUS

### In Components

```typescript
import { useEngines } from '../../hooks/useEngines';

function MyComponent() {
  const { isEnabled, loading } = useEngines();

  if (loading) return <div>Loading...</div>;

  if (!isEnabled('itad_enabled')) {
    return <div>ITAD not available</div>;
  }

  return <div>ITAD features here</div>;
}
```

### In Utilities

```typescript
import { requireEngine } from '../../lib/engineHelpers';

function checkAccess(engines: EngineToggles | null) {
  if (requireEngine(engines, 'itad_enabled')) {
    // User has ITAD access
  }
}
```

---

## WORKSPACE STRUCTURE

```
workspaces.ts
  ↓
WorkspaceConfig
  ├─ id: string
  ├─ name: string
  ├─ icon: LucideIcon
  ├─ requiredEngine?: keyof EngineToggles
  ├─ requiredRoles?: string[]
  └─ modules: ModuleConfig[]
      ├─ id: string
      ├─ name: string
      └─ pages: PageConfig[]
          ├─ name: string
          ├─ page: string
          ├─ requiredRoles?: string[]
          └─ requiredEngine?: keyof EngineToggles
```

---

## PROTECTING FEATURES

### Full Page Protection

```typescript
<EngineGuard engine="auction_enabled">
  <AuctionManagement />
</EngineGuard>
```

### Partial UI Protection

```typescript
const { isEnabled } = useEngines();

return (
  <div>
    <h1>Dashboard</h1>
    {isEnabled('itad_enabled') && (
      <ITADWidget />
    )}
  </div>
);
```

### Custom Fallback

```typescript
<EngineGuard
  engine="recycling_enabled"
  fallback={<CustomMessage />}
>
  <RecyclingFeatures />
</EngineGuard>
```

---

## COMMON PATTERNS

### Multi-Engine Check

```typescript
import { requireAnyEngine } from '../../lib/engineHelpers';

const { engines } = useEngines();

// Show if EITHER engine is enabled
if (requireAnyEngine(engines, ['itad_enabled', 'recycling_enabled'])) {
  // Show feature
}
```

### Engine Status Badge

```typescript
import { EngineStatusBadge } from '../common/EngineStatusBadge';

<EngineStatusBadge engine="auction_enabled" />
// Shows: "Enabled" (green) or "Disabled" (gray)
```

---

## TROUBLESHOOTING

### Page Not Showing in Navigation

**Check:**
1. Is page added to `workspaces.ts`?
2. Does workspace require an engine that's disabled?
3. Does user have required role?
4. Is page route handler in `DashboardPage.tsx`?

### "Module Not Enabled" Error

**Cause:** Trying to access page when engine is disabled

**Solution:**
- Admin: Enable engine in Settings → Engine Toggles
- Developer: Check `requiredEngine` in workspace config

### Command Palette Not Showing Page

**Cause:** Command palette filters by engines + roles

**Check:**
- Is engine enabled for this company?
- Does user have required role?
- Is page properly configured in workspace?

---

## TESTING

### Test Engine Toggle

1. Go to Settings → Engine Toggles
2. Disable "ITAD Services"
3. Check navigation - ITAD workspace should disappear
4. Try accessing `/itad-projects` - should show "Module Not Enabled"
5. Re-enable ITAD
6. Navigation should reappear

### Test Role-Based Access

1. Create user with 'staff' role
2. Login as that user
3. Navigation should hide admin-only items
4. Try accessing `/engine-toggles` - should show permission error

---

## API REFERENCE

### Hooks

**`useEngines()`**
```typescript
const {
  engines,          // EngineToggles | null
  loading,          // boolean
  isEnabled,        // (engine: string) => boolean
  refresh           // () => Promise<void>
} = useEngines();
```

### Utilities

**`requireEngine(engines, 'engine_name')`**
- Returns: `boolean`
- Check if single engine enabled

**`getEnabledEngines(engines)`**
- Returns: `string[]`
- Get list of all enabled engines

**`getEngineName(engine)`**
- Returns: `string`
- Get display name for engine

**`getWorkspacesForEngine(engine)`**
- Returns: `string[]`
- Get workspaces unlocked by engine

---

## BEST PRACTICES

### ✅ DO

- Use workspace config for all navigation
- Wrap engine pages with `<EngineGuard>`
- Check engines before expensive operations
- Test with engines disabled
- Document engine requirements

### ❌ DON'T

- Hardcode navigation in components
- Bypass engine guards
- Show features for disabled engines
- Mix engine logic with business logic
- Forget role checks alongside engine checks

---

## DEPLOYMENT CHECKLIST

- [ ] All new pages added to workspace config
- [ ] Engine guards applied where needed
- [ ] Role permissions configured
- [ ] Build passes (`npm run build`)
- [ ] Tested with engines enabled/disabled
- [ ] Tested with different user roles
- [ ] Documentation updated

---

**Need Help?** See `ENGINE_WORKSPACE_IMPLEMENTATION.md` for full details.
