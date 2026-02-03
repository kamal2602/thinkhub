# A/B Testing & Feature Flags Guide

## Overview

ThinkHub includes a comprehensive A/B testing and feature flag system that allows you to:

- Control feature rollout with feature flags
- Run A/B experiments to test variations
- Track user events and measure impact
- Make data-driven decisions

## Feature Flags

### What are Feature Flags?

Feature flags allow you to:
- Turn features on/off without deploying code
- Gradually roll out features to a percentage of users
- Target specific user roles
- Test in production safely

### Managing Feature Flags

Navigate to **Settings → Feature Flags** to manage flags.

#### Creating a Feature Flag

```typescript
// Admin UI or programmatically
await featureFlagService.createFeatureFlag({
  company_id: 'company-uuid',
  key: 'new_dashboard',
  name: 'New Dashboard Design',
  description: 'Redesigned dashboard with improved UX',
  enabled: true,
  rollout_percentage: 50, // Show to 50% of users
  target_user_roles: ['admin'], // Only for admins
  metadata: {},
});
```

#### Feature Flag Properties

- **key**: Unique identifier (e.g., `new_checkout_flow`)
- **name**: Human-readable name
- **description**: What this flag controls
- **enabled**: Master on/off switch
- **rollout_percentage**: 0-100% of users who see the feature
- **target_user_roles**: Array of roles (admin, manager, staff, viewer)
- **metadata**: Additional configuration

### Using Feature Flags in Code

#### Simple Flag Check

```typescript
import { useFeatureFlag } from '../../contexts/FeatureFlagContext';

function MyComponent() {
  const isNewDashboard = useFeatureFlag('new_dashboard');

  if (isNewDashboard) {
    return <NewDashboard />;
  }

  return <OldDashboard />;
}
```

#### Advanced Flag Usage

```typescript
import { useFeatureFlags } from '../../contexts/FeatureFlagContext';

function MyComponent() {
  const { flags, isFeatureEnabled } = useFeatureFlags();

  const showBeta = isFeatureEnabled('beta_features');
  const newUIEnabled = isFeatureEnabled('new_ui');

  return (
    <div>
      {showBeta && <BetaFeatures />}
      {newUIEnabled ? <NewUI /> : <OldUI />}
    </div>
  );
}
```

## A/B Experiments

### What are A/B Experiments?

A/B experiments let you test two variations and measure which performs better:
- **Variant A (Control)**: Current version
- **Variant B (Test)**: New version with changes

### Creating an Experiment

Navigate to **Settings → A/B Experiments** to create experiments.

#### Experiment Configuration

```typescript
await featureFlagService.createExperiment({
  company_id: 'company-uuid',
  name: 'Checkout Button Color',
  description: 'Test blue vs green checkout button',
  status: 'draft',
  variant_a_name: 'Control (Blue)',
  variant_b_name: 'Test (Green)',
  variant_a_config: {
    buttonColor: '#3b82f6',
    buttonText: 'Buy Now',
  },
  variant_b_config: {
    buttonColor: '#10b981',
    buttonText: 'Complete Purchase',
    showDiscount: true,
  },
  traffic_split: 50, // 50% get variant B
  target_metric: 'conversion_rate',
});
```

### Using Experiments in Code

#### Basic Experiment Usage

```typescript
import { useExperiment } from '../../contexts/FeatureFlagContext';

function CheckoutButton() {
  const { variant, config, track } = useExperiment('Checkout Button Color');

  useEffect(() => {
    // Track that user saw this page
    track('view', 'checkout_page_view');
  }, [track]);

  const handleClick = () => {
    // Track button click
    track('click', 'checkout_button_click');

    // Track conversion
    track('conversion', 'purchase_completed', {
      amount: totalAmount,
      items: cartItems.length,
    });
  };

  return (
    <button
      onClick={handleClick}
      style={{ backgroundColor: config?.buttonColor }}
    >
      {config?.buttonText}
    </button>
  );
}
```

#### Checking Variants

```typescript
const { variant, isVariantA, isVariantB } = useExperiment('Checkout Button Color');

if (isVariantB) {
  // Show test variation
  return <NewCheckoutFlow />;
}

// Show control variation
return <OldCheckoutFlow />;
```

### Experiment Lifecycle

#### 1. Draft → Running

```typescript
// Start experiment
await featureFlagService.startExperiment(experimentId);
```

Users are automatically assigned to variants based on traffic split.

#### 2. Running → Paused

```typescript
// Pause experiment
await featureFlagService.pauseExperiment(experimentId);
```

Temporarily stop the experiment while keeping assignments.

#### 3. Running → Completed

```typescript
// Complete experiment
await featureFlagService.completeExperiment(experimentId);
```

End the experiment and analyze results.

## Event Tracking

### Event Types

- **view**: User saw a page/component
- **click**: User clicked something
- **conversion**: User completed target action
- **custom**: Any custom event

### Tracking Events

```typescript
const { track } = useExperiment('My Experiment');

// Track page view
track('view', 'landing_page');

// Track interaction
track('click', 'cta_button', {
  buttonText: 'Get Started',
  location: 'hero_section',
});

// Track conversion
track('conversion', 'signup_completed', {
  plan: 'pro',
  price: 99,
});

// Track custom event
track('custom', 'video_watched', {
  duration: 120,
  completion: 0.8,
});
```

## Analyzing Results

### Viewing Statistics

Navigate to **Settings → A/B Experiments** and click "Stats" on any running experiment.

#### Metrics Shown

- **Users**: Number of unique users per variant
- **Events**: Total events tracked
- **Conversions**: Number of conversion events
- **Conversion Rate**: Percentage of users who converted
- **Relative Improvement**: Performance difference between variants

### Making Decisions

#### Statistical Significance

Consider these factors:

1. **Sample Size**: At least 100 users per variant
2. **Duration**: Run for at least 1-2 weeks
3. **Confidence**: Look for >10% improvement
4. **Consistency**: Check if results are stable

#### Example Decision Tree

```
If Variant B conversion rate > Variant A by >10%:
  → Roll out Variant B to 100% of users
  → Update feature flag or make permanent

If Variant B ≈ Variant A (within 5%):
  → No clear winner
  → Consider other factors (cost, maintenance)

If Variant B < Variant A:
  → Keep Variant A
  → Try different approach in new experiment
```

## Best Practices

### Feature Flags

1. **Use Clear Naming**
   ```typescript
   // Good
   new_checkout_flow
   improved_search_algorithm
   beta_dashboard

   // Bad
   test1
   new_feature
   temp_flag
   ```

2. **Set Rollout Gradually**
   ```typescript
   // Start with small percentage
   rollout_percentage: 5

   // Gradually increase if stable
   rollout_percentage: 25
   rollout_percentage: 50
   rollout_percentage: 100
   ```

3. **Clean Up Old Flags**
   - Remove flags after features are fully rolled out
   - Keep flag list manageable

### A/B Experiments

1. **Test One Thing at a Time**
   ```typescript
   // Good - Single change
   variant_a_config: { buttonColor: 'blue' }
   variant_b_config: { buttonColor: 'green' }

   // Bad - Multiple changes
   variant_a_config: { buttonColor: 'blue', text: 'Buy' }
   variant_b_config: { buttonColor: 'green', text: 'Purchase', showIcon: true }
   ```

2. **Define Clear Target Metrics**
   ```typescript
   target_metric: 'conversion_rate'
   target_metric: 'click_through_rate'
   target_metric: 'average_order_value'
   ```

3. **Track Relevant Events**
   ```typescript
   // Essential tracking
   track('view', 'page_view');           // Always track views
   track('click', 'button_click');       // Track interactions
   track('conversion', 'goal_completed'); // Track success

   // Additional context
   track('conversion', 'goal_completed', {
     value: 100,
     timestamp: Date.now(),
   });
   ```

4. **Run Experiments Long Enough**
   - Minimum: 1 week
   - Recommended: 2-4 weeks
   - Consider weekly patterns (weekday vs weekend)

## Common Use Cases

### Example 1: New UI Component

```typescript
// Feature flag for safety
const newComponentEnabled = useFeatureFlag('new_component_v2');

if (!newComponentEnabled) {
  return <OldComponent />;
}

// A/B test within new component
const { config, track } = useExperiment('Component Layout Test');

useEffect(() => {
  track('view', 'component_viewed');
}, []);

return (
  <div style={{ layout: config?.layout }}>
    {config?.showImages && <Images />}
    <Content />
  </div>
);
```

### Example 2: Pricing Test

```typescript
const { config, track } = useExperiment('Pricing Strategy Test');

const pricing = {
  monthly: config?.monthlyPrice || 29,
  annual: config?.annualPrice || 290,
  showDiscount: config?.showDiscount || false,
};

const handleSubscribe = (plan: string) => {
  track('conversion', 'subscription_started', {
    plan,
    price: pricing[plan],
  });
};
```

### Example 3: Onboarding Flow

```typescript
const { variant, track } = useExperiment('Onboarding Flow Test');

const steps = variant === 'B'
  ? [
      'Welcome',
      'Quick Setup',
      'Import Data',
      'Complete',
    ]
  : [
      'Welcome',
      'Profile Setup',
      'Company Details',
      'Payment Info',
      'Import Data',
      'Complete',
    ];

const handleStepComplete = (step: string) => {
  track('custom', 'onboarding_step_completed', { step });
};

const handleComplete = () => {
  track('conversion', 'onboarding_completed', {
    stepsCount: steps.length,
    timeSpent: calculateTime(),
  });
};
```

## API Reference

### FeatureFlagService

```typescript
class FeatureFlagService {
  // Get all flags
  getFeatureFlags(companyId: string): Promise<FeatureFlag[]>

  // Get single flag
  getFeatureFlag(companyId: string, key: string): Promise<FeatureFlag>

  // Create flag
  createFeatureFlag(flag: FeatureFlagInput): Promise<FeatureFlag>

  // Update flag
  updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag>

  // Delete flag
  deleteFeatureFlag(id: string): Promise<void>

  // Check if enabled
  isFeatureEnabled(companyId: string, flagKey: string, userId?: string, userRole?: string): Promise<boolean>

  // Experiments
  createExperiment(experiment: ExperimentInput): Promise<ABExperiment>
  startExperiment(id: string): Promise<ABExperiment>
  pauseExperiment(id: string): Promise<ABExperiment>
  completeExperiment(id: string): Promise<ABExperiment>

  // Tracking
  trackEvent(event: ExperimentEvent): Promise<void>
  getExperimentStats(experimentId: string): Promise<Stats>
}
```

### React Hooks

```typescript
// Check feature flag
const isEnabled = useFeatureFlag('flag_key');

// Get all flags
const { flags, loading } = useFeatureFlags();

// Use experiment
const {
  variant,          // 'A' | 'B' | null
  config,           // Configuration object
  isVariantA,       // boolean
  isVariantB,       // boolean
  track,            // Track function
} = useExperiment('experiment_name');
```

## Troubleshooting

### Flag not working

1. Check flag is enabled
2. Verify rollout percentage
3. Check user role matches target roles
4. Clear cache and reload

### Experiment not assigning variants

1. Ensure experiment status is "running"
2. Check user is authenticated
3. Verify experiment name matches exactly
4. Check browser console for errors

### Events not tracking

1. Verify experiment is running
2. Check user has variant assigned
3. Ensure track() is called correctly
4. Check network tab for failed requests
