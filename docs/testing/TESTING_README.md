# Testing & Experimentation

ThinkHub includes comprehensive testing and experimentation capabilities to ensure quality and enable data-driven decisions.

## Systems Overview

### 1. Playwright E2E Testing

Automated end-to-end testing that validates critical workflows across browsers.

**Benefits:**
- Catch bugs before production
- Test real user workflows
- Ensure cross-browser compatibility
- Automate regression testing

**Quick Start:**
```bash
# Install browsers
npx playwright install

# Run tests
npm run test:e2e

# Interactive mode
npm run test:e2e:ui
```

[Full Playwright Guide →](./PLAYWRIGHT_GUIDE.md)

### 2. A/B Testing & Feature Flags

Control feature rollout and test variations to optimize user experience.

**Benefits:**
- Safely roll out new features
- Test multiple variations
- Measure impact with data
- Make informed decisions

**Quick Start:**
1. Navigate to Settings → Feature Flags
2. Create a feature flag
3. Use in code: `const enabled = useFeatureFlag('flag_key')`

[Full A/B Testing Guide →](./AB_TESTING_GUIDE.md)

## Architecture

### Database Schema

```sql
feature_flags
├── id
├── company_id
├── key
├── name
├── enabled
├── rollout_percentage
└── target_user_roles

ab_experiments
├── id
├── company_id
├── name
├── status (draft|running|paused|completed)
├── variant_a_config
├── variant_b_config
└── traffic_split

user_variant_assignments
├── experiment_id
├── user_id
└── variant (A|B)

experiment_events
├── experiment_id
├── user_id
├── variant
├── event_type
└── event_data
```

### Service Layer

- **featureFlagService**: Manages flags and experiments
- **FeatureFlagContext**: React context for accessing flags
- **useFeatureFlag**: Hook for simple flag checks
- **useExperiment**: Hook for A/B testing

### UI Components

- **FeatureFlagsManager**: Admin UI for managing flags
- **ABExperimentsManager**: Admin UI for managing experiments
- **ExampleExperiment**: Sample implementation

## Testing Workflows

### Critical Paths to Test

1. **Authentication**
   - User registration
   - Login/logout
   - Password reset

2. **Purchase Orders**
   - Create PO manually
   - Import from Excel/CSV
   - Submit and approve
   - View PO details

3. **Asset Processing**
   - Scan asset
   - Update status
   - Bulk operations
   - Move through stages

4. **Sales Invoices**
   - Create invoice
   - Add line items
   - Calculate totals
   - Print/export

5. **Permissions**
   - Admin access
   - Staff restrictions
   - Role-based visibility

### Test Data Management

```typescript
// Create test company
const company = await createTestCompany('Test Co');

// Create test contacts
const customer = await createTestContact(company.id, 'customer');
const supplier = await createTestContact(company.id, 'supplier');

// Create test products
const laptop = await createTestProductType(company.id, 'Laptop');

// Clean up after tests
await cleanupTestData(company.id);
```

## Experimentation Workflow

### 1. Hypothesis

Define what you want to test:
- "Green button will increase conversions by 20%"
- "Simplified checkout will reduce cart abandonment"
- "Showing reviews will increase trust"

### 2. Create Experiment

```typescript
// In admin UI: Settings → A/B Experiments
{
  name: "Checkout Button Test",
  variant_a_config: { buttonColor: "blue" },
  variant_b_config: { buttonColor: "green" },
  traffic_split: 50,
  target_metric: "conversion_rate"
}
```

### 3. Implement in Code

```typescript
const { variant, config, track } = useExperiment('Checkout Button Test');

useEffect(() => {
  track('view', 'checkout_page');
}, []);

const handlePurchase = () => {
  track('conversion', 'purchase_completed');
};

return (
  <button
    style={{ backgroundColor: config?.buttonColor }}
    onClick={handlePurchase}
  >
    Complete Purchase
  </button>
);
```

### 4. Run Experiment

- Start: Sets status to "running"
- Minimum: 100 users per variant
- Duration: 1-2 weeks minimum

### 5. Analyze Results

View stats in admin UI:
- Users per variant
- Conversion rates
- Relative improvement
- Statistical significance

### 6. Make Decision

- **B wins**: Roll out to 100%
- **No clear winner**: Keep A or test new variant
- **A wins**: Keep current implementation

## Integration Examples

### Example 1: Feature Flag

```typescript
function Dashboard() {
  const newDashboard = useFeatureFlag('new_dashboard_v2');

  if (newDashboard) {
    return <NewDashboard />;
  }

  return <OldDashboard />;
}
```

### Example 2: Gradual Rollout

```typescript
// Admin: Set rollout_percentage = 10
// System automatically shows to 10% of users

// Increase gradually:
// Day 1: 10%
// Day 3: 25%
// Day 7: 50%
// Day 14: 100%
```

### Example 3: Role-Based Features

```typescript
// Admin: Set target_user_roles = ['admin', 'manager']
const betaFeatures = useFeatureFlag('beta_features');

// Only admins and managers see this
{betaFeatures && <BetaFeaturesList />}
```

### Example 4: A/B Test with Tracking

```typescript
function PricingPage() {
  const { variant, config, track } = useExperiment('Pricing Display Test');

  useEffect(() => {
    track('view', 'pricing_page');
  }, []);

  const handleSelectPlan = (plan: string) => {
    track('click', 'plan_selected', { plan });

    track('conversion', 'checkout_started', {
      plan,
      price: config?.prices[plan],
    });
  };

  return (
    <div>
      {config?.showAnnualSavings && (
        <Banner>Save 20% with annual billing!</Banner>
      )}

      <PricingTable
        prices={config?.prices}
        onSelect={handleSelectPlan}
      />
    </div>
  );
}
```

## Best Practices

### Feature Flags

1. Use descriptive names
2. Document what each flag controls
3. Start with low rollout percentage
4. Remove flags after full rollout
5. Monitor performance impact

### A/B Testing

1. Test one change at a time
2. Run for sufficient duration
3. Ensure statistical significance
4. Consider external factors (seasonality, promotions)
5. Document learnings

### E2E Testing

1. Test critical user paths
2. Use unique test data
3. Clean up after tests
4. Run tests in CI/CD
5. Keep tests maintainable

## Monitoring & Metrics

### Feature Flag Metrics

- Active flags count
- Rollout percentages
- User coverage
- Performance impact

### Experiment Metrics

- Active experiments
- Users per variant
- Conversion rates
- Event counts
- Statistical confidence

### Test Metrics

- Test pass rate
- Test duration
- Flaky tests count
- Coverage percentage

## CI/CD Integration

### GitHub Actions

```yaml
name: Test & Deploy

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      # Run E2E tests
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e

      # Upload results
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: playwright-report/
```

## Troubleshooting

### Playwright Issues

**Tests timeout:**
- Increase timeout in config
- Add explicit waits
- Check element selectors

**Element not found:**
- Wait for element: `await page.waitForSelector()`
- Check selector is correct
- Verify element is visible

**Tests fail in CI:**
- Check environment variables
- Ensure database is seeded
- Add retry logic

### Feature Flag Issues

**Flag not working:**
- Verify flag is enabled
- Check rollout percentage
- Verify user role matches

**Users see different versions:**
- This is expected with gradual rollout
- Based on hash of userId + flagKey
- Consistent per user

### Experiment Issues

**No variant assigned:**
- Ensure experiment is running
- Check user is authenticated
- Verify experiment name

**Events not tracking:**
- Check experiment status
- Verify user has variant
- Check network requests

## Resources

- [Playwright Documentation](https://playwright.dev)
- [A/B Testing Best Practices](https://www.optimizely.com/optimization-glossary/ab-testing/)
- [Feature Flag Patterns](https://martinfowler.com/articles/feature-toggles.html)
- [Statistical Significance Calculator](https://www.optimizely.com/sample-size-calculator/)

## Support

For questions or issues:
1. Check documentation guides
2. Review example implementations
3. Check troubleshooting section
4. Contact development team
