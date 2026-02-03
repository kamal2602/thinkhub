# Testing & Experimentation Setup Complete

## What Was Added

### 1. Playwright E2E Testing

**Configuration:**
- `playwright.config.ts` - Test configuration for all browsers
- Test scripts added to `package.json`

**Test Fixtures:**
- `tests/fixtures/auth.ts` - Authentication helpers and test user creation
- `tests/fixtures/database.ts` - Database test data helpers

**Test Suites:**
- `tests/e2e/auth.spec.ts` - Login, logout, registration tests
- `tests/e2e/purchase-orders.spec.ts` - PO creation and import tests
- `tests/e2e/asset-processing.spec.ts` - Asset scanning and processing tests
- `tests/e2e/sales-invoices.spec.ts` - Invoice creation and management tests
- `tests/e2e/permissions.spec.ts` - Role-based access control tests

### 2. A/B Testing & Feature Flags

**Database Schema:**
- `feature_flags` table - Feature flag management
- `ab_experiments` table - A/B experiment configurations
- `user_variant_assignments` table - User-to-variant mappings
- `experiment_events` table - Event tracking for analytics

**Services:**
- `src/services/featureFlagService.ts` - Complete feature flag and experiment API

**React Context:**
- `src/contexts/FeatureFlagContext.tsx` - React context and hooks
  - `useFeatureFlag()` - Simple flag checks
  - `useExperiment()` - A/B testing with tracking
  - `useFeatureFlags()` - Advanced flag management

**Admin UI:**
- `src/components/experiments/FeatureFlagsManager.tsx` - Manage feature flags
- `src/components/experiments/ABExperimentsManager.tsx` - Manage experiments
- `src/components/experiments/ExampleExperiment.tsx` - Implementation example

**Integration:**
- Added `FeatureFlagProvider` to `App.tsx`

### 3. Documentation

- `docs/testing/TESTING_README.md` - Overview and quick start
- `docs/testing/PLAYWRIGHT_GUIDE.md` - Complete Playwright guide
- `docs/testing/AB_TESTING_GUIDE.md` - Complete A/B testing guide

## Quick Start

### Running Playwright Tests

```bash
# Install browsers (first time only)
npx playwright install

# Run all tests
npm run test:e2e

# Interactive mode (recommended)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Using Feature Flags

1. Navigate to **Settings → Feature Flags** (to be added to navigation)
2. Click "New Flag"
3. Configure:
   - Key: `new_feature`
   - Name: "New Feature"
   - Enabled: true
   - Rollout: 50%

4. Use in code:
```typescript
import { useFeatureFlag } from '../../contexts/FeatureFlagContext';

function MyComponent() {
  const isEnabled = useFeatureFlag('new_feature');

  if (isEnabled) {
    return <NewFeature />;
  }

  return <OldFeature />;
}
```

### Creating A/B Experiments

1. Navigate to **Settings → A/B Experiments**
2. Click "New Experiment"
3. Configure variants:
   - Variant A: Control (current version)
   - Variant B: Test (new version)
   - Traffic split: 50/50

4. Use in code:
```typescript
import { useExperiment } from '../../contexts/FeatureFlagContext';

function MyComponent() {
  const { variant, config, track } = useExperiment('My Test');

  useEffect(() => {
    track('view', 'page_view');
  }, [track]);

  const handleClick = () => {
    track('conversion', 'button_clicked');
  };

  return (
    <button
      style={{ backgroundColor: config?.buttonColor }}
      onClick={handleClick}
    >
      {config?.buttonText}
    </button>
  );
}
```

## Next Steps

### 1. Add Navigation Items

Add these to your settings navigation:

```typescript
// In settings menu
{
  label: 'Feature Flags',
  component: FeatureFlagsManager,
  icon: Flag,
},
{
  label: 'A/B Experiments',
  component: ABExperimentsManager,
  icon: FlaskConical,
}
```

### 2. Set Environment Variables

Add to your `.env` file:

```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# For E2E tests only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Write Your First Test

```typescript
import { test, expect } from '../fixtures/auth';

test('my workflow works', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await authenticatedPage.click('text=My Feature');
  await expect(authenticatedPage.locator('text=Success')).toBeVisible();
});
```

### 4. Create Your First Experiment

```typescript
// 1. Create experiment in admin UI
{
  name: "Checkout Button Test",
  variant_a_config: { buttonColor: "#3b82f6" },
  variant_b_config: { buttonColor: "#10b981" },
  traffic_split: 50
}

// 2. Start experiment
// 3. Implement in code (see example above)
// 4. Let run for 1-2 weeks
// 5. Analyze results
// 6. Roll out winner
```

## Features

### Playwright Testing

- Automated browser testing across Chrome, Firefox, Safari
- Mobile device testing (iOS, Android)
- Parallel test execution
- Screenshot and video capture on failure
- Trace viewer for debugging
- CI/CD integration ready

### Feature Flags

- Master on/off switch for features
- Gradual rollout (0-100%)
- Role-based targeting
- Per-user consistent assignment
- Real-time updates
- Company-scoped isolation

### A/B Experiments

- Split testing (A/B/n)
- Configurable traffic split
- Automatic variant assignment
- Event tracking (views, clicks, conversions)
- Statistical analysis
- Experiment lifecycle management (draft → running → completed)

## Use Cases

### Testing Use Cases

1. **Regression Testing** - Ensure existing features still work
2. **Integration Testing** - Test complete user workflows
3. **Cross-Browser Testing** - Verify compatibility
4. **Mobile Testing** - Test responsive design
5. **Performance Testing** - Measure load times

### Feature Flag Use Cases

1. **Gradual Rollout** - Release to 10% → 50% → 100%
2. **Beta Features** - Show only to specific roles
3. **Kill Switch** - Instantly disable problematic features
4. **A/B Testing Gate** - Control who sees experiments
5. **Feature Previews** - Let users opt-in to beta

### Experiment Use Cases

1. **UI Changes** - Test button colors, layouts, copy
2. **Pricing** - Test different price points
3. **Onboarding** - Test different flows
4. **Features** - Test feature variations
5. **Algorithms** - Test recommendation engines

## Best Practices

### Testing

1. Test critical user paths first
2. Use unique test data (timestamps)
3. Clean up after tests
4. Keep tests independent
5. Run tests in CI/CD

### Feature Flags

1. Use descriptive names
2. Document what each flag does
3. Start with low rollout
4. Monitor performance
5. Clean up old flags

### Experiments

1. Test one thing at a time
2. Run for sufficient duration
3. Track relevant events
4. Ensure statistical significance
5. Document learnings

## Troubleshooting

### Tests Failing?

1. Check environment variables are set
2. Ensure Supabase is accessible
3. Verify test data is clean
4. Check element selectors
5. Add explicit waits

### Feature Flags Not Working?

1. Verify flag is enabled
2. Check rollout percentage
3. Confirm user role matches
4. Clear cache and reload
5. Check browser console

### Experiments Not Tracking?

1. Ensure experiment is running
2. Verify user has variant assigned
3. Check track() calls are correct
4. Inspect network requests
5. Check database for events

## Resources

- [Playwright Docs](https://playwright.dev)
- [Testing README](./docs/testing/TESTING_README.md)
- [Playwright Guide](./docs/testing/PLAYWRIGHT_GUIDE.md)
- [A/B Testing Guide](./docs/testing/AB_TESTING_GUIDE.md)

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   ThinkHub App                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────┐  ┌───────────────────┐   │
│  │  Playwright E2E  │  │  A/B Testing      │   │
│  │     Testing      │  │  & Feature Flags  │   │
│  └──────────────────┘  └───────────────────┘   │
│           │                     │               │
│           ├─────────────────────┤               │
│           │                     │               │
│  ┌────────▼─────────┐  ┌───────▼────────┐     │
│  │  Test Fixtures   │  │  Flag Service  │     │
│  │  & Helpers       │  │  & Context     │     │
│  └──────────────────┘  └────────────────┘     │
│           │                     │               │
│           └──────────┬──────────┘               │
│                      │                          │
│              ┌───────▼────────┐                │
│              │   Supabase DB   │                │
│              │  - Tests Data   │                │
│              │  - Flags        │                │
│              │  - Experiments  │                │
│              │  - Events       │                │
│              └─────────────────┘                │
└─────────────────────────────────────────────────┘
```

## Summary

You now have:

1. **Comprehensive E2E Testing** with Playwright
   - 5 test suites covering critical workflows
   - Authentication, PO imports, asset processing, invoices, permissions

2. **Feature Flag System** for controlled rollouts
   - Database schema with RLS
   - Service layer and React hooks
   - Admin UI for management

3. **A/B Testing Platform** for experimentation
   - Variant assignment and tracking
   - Event analytics
   - Results dashboard

4. **Complete Documentation** for both systems
   - Quick start guides
   - API references
   - Best practices
   - Troubleshooting

Everything is ready to use. Start writing tests and creating experiments!
