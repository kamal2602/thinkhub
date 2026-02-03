import React, { useEffect } from 'react';
import { useExperiment, useFeatureFlag } from '../../contexts/FeatureFlagContext';
import { Button } from '../ui/Button';

export function ExampleExperiment() {
  const newCheckoutFlow = useFeatureFlag('new_checkout_flow');
  const { variant, config, isVariantB, track } = useExperiment('button_color_test');

  useEffect(() => {
    track('view', 'page_view');
  }, [track]);

  const handleClick = () => {
    track('click', 'button_click', { timestamp: new Date().toISOString() });
    track('conversion', 'purchase_completed', { amount: 100 });
  };

  if (!newCheckoutFlow) {
    return (
      <div className="p-6">
        <h2>Old Checkout Flow</h2>
        <Button onClick={handleClick}>Buy Now</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2>Experiment: Button Color Test</h2>
      <p className="mb-4">You are seeing variant: {variant || 'None'}</p>

      {isVariantB && config?.showDiscount && (
        <div className="mb-4 p-4 bg-yellow-100 rounded-lg">
          Special Offer: 20% off!
        </div>
      )}

      <Button
        onClick={handleClick}
        style={{
          backgroundColor: config?.buttonColor || '#3b82f6',
        }}
      >
        {config?.buttonText || 'Buy Now'}
      </Button>

      {isVariantB && (
        <p className="mt-2 text-sm text-gray-600">
          Free shipping on orders over $50
        </p>
      )}
    </div>
  );
}
