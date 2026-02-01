# ENGINE GATING TEST GUIDE

Quick reference for testing the hardened engine gating system.

---

## QUICK TEST SCENARIOS

### ✅ Test 1: Toggle Engine OFF

**Test ITAD Disable:**

1. Login as admin
2. Navigate to: Settings → Engine Toggles
3. Click "Disabled" on "ITAD Services" card
4. **Observe (no reload needed):**
   - ❌ ITAD workspace disappears from top navigation
   - ❌ All ITAD pages hidden from menus
5. Press `Cmd+K` (or `Ctrl+K`)
6. Search for "itad" or "certificates"
   - ❌ No ITAD pages in search results
7. Navigate directly to: `/itad-projects`
   - ❌ Page shows "Module Not Enabled"
   - ✅ Friendly message displayed
   - ✅ Directs admin to settings

**Expected Result:** ✅ ITAD completely hidden and blocked

---

### ✅ Test 2: Toggle Engine ON

**Test Recycling Enable:**

1. Navigate to: Settings → Engine Toggles
2. Click "Enabled" on "Recycling" card
3. **Observe (instant update, no reload):**
   - ✅ "Recycling" workspace appears in navigation
   - ✅ Recycling pages appear in menus
4. Press `Cmd+K` (or `Ctrl+K`)
5. Search for "component" or "harvest"
   - ✅ Recycling pages appear in results
6. Navigate to: `/harvested-components`
   - ✅ Page renders correctly
   - ✅ Data loads normally

**Expected Result:** ✅ Recycling fully accessible

---

### ✅ Test 3: Multiple Engines

**Test Complex Configuration:**

1. Enable: ITAD + Recycling
2. Disable: Auctions + Website + CRM
3. **Check Navigation:**
   - ✅ Dashboard visible
   - ✅ Operations visible
   - ✅ Sales visible
   - ✅ ITAD visible
   - ✅ Recycling visible
   - ✅ Finance visible
   - ✅ Reports visible
   - ✅ Settings visible
   - ❌ Auctions hidden
   - ❌ Website hidden
   - ❌ CRM hidden
4. **Check Command Palette (Cmd+K):**
   - ✅ ITAD pages searchable
   - ✅ Recycling pages searchable
   - ❌ Auction pages not found
   - ❌ Website pages not found
   - ❌ CRM pages not found

**Expected Result:** ✅ Only enabled engines visible

---

### ✅ Test 4: Direct URL Bypass Attempt

**Test Route Protection:**

1. Disable all optional engines (ITAD, Recycling, Auctions)
2. Try accessing disabled pages directly:
   - `/itad-projects`
   - `/certificates`
   - `/data-sanitization`
   - `/harvested-components`
   - `/component-sales`
   - `/auctions`

**Expected Result for ALL:**
- ❌ Page does not render
- ✅ Shows "Module Not Enabled" message
- ✅ Message names the required engine
- ✅ No crash, no blank screen, no errors

---

### ✅ Test 5: Role + Engine Filtering

**Test Combined Access Control:**

1. Create test user with role "staff" (not admin)
2. Enable ITAD engine
3. Login as staff user
4. Navigate to ITAD workspace
5. **Check visible pages:**
   - ✅ ITAD Projects (staff allowed)
   - ✅ Data Sanitization (staff allowed)
   - ✅ Certificates (staff allowed)
   - ❌ Company Certifications (admin only, hidden)
6. Try accessing: `/company-certifications`
   - ❌ Blocked (role requirement)

**Expected Result:** ✅ Both engine AND role filters apply

---

## COMPREHENSIVE TEST MATRIX

### Engine: ITAD Services (`itad_enabled`)

| Page | Route | Guard | Workspace | Expected |
|------|-------|-------|-----------|----------|
| ITAD Projects | `/itad-projects` | ✅ | ITAD | Hidden when OFF |
| Data Sanitization | `/data-sanitization` | ✅ | ITAD | Hidden when OFF |
| Certificates | `/certificates` | ✅ | ITAD | Hidden when OFF |
| Environmental | `/environmental-compliance` | ✅ | ITAD | Hidden when OFF |
| ITAD Compliance | `/itad-compliance` | ✅ | ITAD | Hidden when OFF |
| Revenue Settlements | `/itad-revenue-settlements` | ✅ | ITAD | Hidden when OFF |
| Downstream Vendors | `/downstream-vendors` | ✅ | ITAD | Hidden when OFF |
| Company Certifications | `/company-certifications` | ✅ | ITAD | Hidden when OFF |

### Engine: Recycling (`recycling_enabled`)

| Page | Route | Guard | Workspace | Expected |
|------|-------|-------|-----------|----------|
| Harvested Inventory | `/harvested-components` | ✅ | Recycling | Hidden when OFF |
| Component Sales | `/component-sales` | ✅ | Recycling | Hidden when OFF |
| Component Prices | `/component-market-prices` | ✅ | Recycling | Hidden when OFF |

### Engine: Auctions (`auction_enabled`)

| Page | Route | Guard | Workspace | Expected |
|------|-------|-------|-----------|----------|
| Auctions | `/auctions` | ✅ | Auctions | Hidden when OFF |

---

## VERIFICATION CHECKLIST

### ✅ Navigation Layer
- [ ] Workspace hidden when engine OFF
- [ ] Workspace visible when engine ON
- [ ] Pages within workspace hidden when engine OFF
- [ ] No lag when toggling engines

### ✅ Command Palette Layer
- [ ] Disabled pages not in search results
- [ ] Enabled pages appear in search
- [ ] Cannot navigate to disabled pages via Cmd+K
- [ ] Search updates when engine toggled

### ✅ Route Guard Layer
- [ ] Direct URL access blocked when engine OFF
- [ ] "Module Not Enabled" message shown
- [ ] Message names correct engine
- [ ] No crashes or blank screens
- [ ] Page loads when engine ON

### ✅ Service Layer
- [ ] Engine-specific services documented
- [ ] Clear REQUIRES ENGINE comments
- [ ] No runtime errors from services

### ✅ Real-time Updates
- [ ] Toggle engine OFF → navigation updates instantly
- [ ] Toggle engine ON → navigation updates instantly
- [ ] No page reload required
- [ ] State consistent across app

### ✅ Safe Defaults
- [ ] If engine loading fails, all engines OFF
- [ ] System remains usable
- [ ] No unintended feature exposure
- [ ] Can retry/refresh manually

---

## REGRESSION TESTS

### Test: Page Reload Persistence

1. Enable ITAD engine
2. Refresh page (F5)
3. **Check:**
   - ✅ ITAD still visible
   - ✅ ITAD pages still accessible
   - ✅ Engine state persisted

### Test: Company Switch

1. Enable ITAD for Company A
2. Switch to Company B (ITAD disabled)
3. **Check:**
   - ❌ ITAD workspace hidden
   - ❌ ITAD pages not accessible
4. Switch back to Company A
5. **Check:**
   - ✅ ITAD workspace visible again
   - ✅ ITAD pages accessible

### Test: Multiple Browser Tabs

1. Open app in 2 tabs
2. In Tab 1: Disable ITAD
3. In Tab 2: Navigate to `/itad-projects`
4. **Check Tab 2:**
   - ❌ Page blocks after navigation
   - ✅ Shows "Module Not Enabled"

---

## EDGE CASES

### Edge Case 1: All Engines Disabled

**Scenario:** User disables ALL engines including reseller

**Expected:**
- ✅ Dashboard still visible
- ✅ Settings still accessible
- ✅ Can re-enable engines
- ✅ No broken state

### Edge Case 2: Engine Loading Error

**Scenario:** Database error while loading engines

**Expected:**
- ✅ All engines default to OFF
- ✅ Dashboard still visible
- ✅ Error logged to console
- ✅ Can manually refresh

### Edge Case 3: Concurrent Toggling

**Scenario:** Admin toggles multiple engines rapidly

**Expected:**
- ✅ Each toggle saves independently
- ✅ Navigation updates for each
- ✅ No race conditions
- ✅ Final state is correct

---

## PERFORMANCE CHECKS

### Check 1: Toggle Response Time

**Measure:** Time from click to navigation update

**Expected:** < 500ms

**Test:**
1. Click "Disabled" on ITAD
2. Observe navigation update
3. Should be instant (< 0.5s)

### Check 2: Navigation Render Time

**Measure:** Time to render navigation bar

**Expected:** < 100ms

**Test:**
1. Open DevTools Performance tab
2. Record navigation render
3. Check "Render" time
4. Should be < 100ms

### Check 3: Command Palette Search

**Measure:** Time to filter and display results

**Expected:** < 200ms

**Test:**
1. Open command palette (Cmd+K)
2. Type search query
3. Observe results display
4. Should feel instant

---

## DEBUGGING TIPS

### Issue: Engine toggles don't update navigation

**Check:**
1. Console for errors
2. `useEngines()` hook called `refresh()`?
3. Network tab: is API call succeeding?
4. React DevTools: is `engines` state updating?

### Issue: Direct URL still accessible when engine OFF

**Check:**
1. Is page wrapped with `<EngineGuard>`?
2. Is correct engine specified?
3. Is EngineGuard imported correctly?
4. Check browser cache (hard refresh)

### Issue: Command palette shows disabled pages

**Check:**
1. `filterPagesByRoleAndEngine` called correctly?
2. `engines` state passed to filter?
3. Page has `requiredEngine` set?
4. Clear browser cache

---

## MANUAL TEST SCRIPT

Copy and paste this script for manual testing:

```
✅ TEST SCRIPT - ENGINE GATING

[ ] 1. Login as admin
[ ] 2. Go to Settings → Engine Toggles
[ ] 3. Disable ITAD
    [ ] ITAD workspace hidden from nav
    [ ] Cmd+K: no ITAD pages
    [ ] /itad-projects: shows "Module Not Enabled"
[ ] 4. Enable Recycling
    [ ] Recycling workspace appears
    [ ] Cmd+K: recycling pages appear
    [ ] /harvested-components: page loads
[ ] 5. Disable Auctions
    [ ] Auctions workspace hidden
    [ ] /auctions: blocked
[ ] 6. Enable all engines
    [ ] All workspaces visible
    [ ] All pages accessible
[ ] 7. Refresh page
    [ ] Engine state persisted
    [ ] Navigation still correct
[ ] 8. Switch companies
    [ ] Engine state resets per company

✅ ALL TESTS PASSED
```

---

## AUTOMATED TEST SCENARIOS

### For Future E2E Tests

```typescript
describe('Engine Gating', () => {
  it('hides ITAD workspace when engine disabled', async () => {
    await disableEngine('itad_enabled');
    await expectWorkspaceNotVisible('ITAD');
  });

  it('shows ITAD workspace when engine enabled', async () => {
    await enableEngine('itad_enabled');
    await expectWorkspaceVisible('ITAD');
  });

  it('blocks direct URL access when engine disabled', async () => {
    await disableEngine('itad_enabled');
    await navigate('/itad-projects');
    await expectToSee('Module Not Enabled');
  });

  it('filters command palette by engines', async () => {
    await disableEngine('recycling_enabled');
    await openCommandPalette();
    await search('component');
    await expectNoResults();
  });

  it('updates navigation in real-time', async () => {
    await enableEngine('auction_enabled');
    await expectWorkspaceVisible('Auctions', { timeout: 1000 });
  });
});
```

---

**Test Guide Complete** ✅

All test scenarios, edge cases, and verification steps documented.
