import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import { featureFlagService, FeatureFlag, ABExperiment } from '../services/featureFlagService';

interface FeatureFlagContextType {
  flags: Map<string, FeatureFlag>;
  experiments: Map<string, ABExperiment>;
  userVariants: Map<string, 'A' | 'B'>;
  isFeatureEnabled: (flagKey: string) => boolean;
  getVariant: (experimentName: string) => 'A' | 'B' | null;
  getExperimentConfig: (experimentName: string) => Record<string, any> | null;
  trackEvent: (experimentName: string, eventType: string, eventName: string, eventData?: Record<string, any>) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [flags, setFlags] = useState<Map<string, FeatureFlag>>(new Map());
  const [experiments, setExperiments] = useState<Map<string, ABExperiment>>(new Map());
  const [userVariants, setUserVariants] = useState<Map<string, 'A' | 'B'>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadFeatureFlags = useCallback(async () => {
    if (!currentCompany) return;

    try {
      const flagsData = await featureFlagService.getFeatureFlags(currentCompany.id);
      const flagsMap = new Map(flagsData.map(flag => [flag.key, flag]));
      setFlags(flagsMap);
    } catch (error) {
      console.error('Error loading feature flags:', error);
    }
  }, [currentCompany]);

  const loadExperiments = useCallback(async () => {
    if (!currentCompany || !user) return;

    try {
      const experimentsData = await featureFlagService.getRunningExperiments(currentCompany.id);
      const experimentsMap = new Map(experimentsData.map(exp => [exp.name, exp]));
      setExperiments(experimentsMap);

      const variantsMap = new Map<string, 'A' | 'B'>();
      for (const experiment of experimentsData) {
        const variant = await featureFlagService.getUserVariant(experiment.id, user.id);
        variantsMap.set(experiment.name, variant);
      }
      setUserVariants(variantsMap);
    } catch (error) {
      console.error('Error loading experiments:', error);
    }
  }, [currentCompany, user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFeatureFlags(), loadExperiments()]);
    setLoading(false);
  }, [loadFeatureFlags, loadExperiments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFeatureEnabled = useCallback((flagKey: string): boolean => {
    const flag = flags.get(flagKey);
    if (!flag || !flag.enabled) return false;

    if (flag.rollout_percentage === 100) return true;
    if (flag.rollout_percentage === 0) return false;

    return true;
  }, [flags]);

  const getVariant = useCallback((experimentName: string): 'A' | 'B' | null => {
    return userVariants.get(experimentName) || null;
  }, [userVariants]);

  const getExperimentConfig = useCallback((experimentName: string): Record<string, any> | null => {
    const experiment = experiments.get(experimentName);
    if (!experiment) return null;

    const variant = userVariants.get(experimentName);
    if (!variant) return null;

    return variant === 'A' ? experiment.variant_a_config : experiment.variant_b_config;
  }, [experiments, userVariants]);

  const trackEvent = useCallback(async (
    experimentName: string,
    eventType: string,
    eventName: string,
    eventData?: Record<string, any>
  ) => {
    if (!user) return;

    const experiment = experiments.get(experimentName);
    const variant = userVariants.get(experimentName);

    if (!experiment || !variant) return;

    try {
      await featureFlagService.trackEvent({
        experiment_id: experiment.id,
        user_id: user.id,
        variant,
        event_type: eventType,
        event_name: eventName,
        event_data: eventData,
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [user, experiments, userVariants]);

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        experiments,
        userVariants,
        isFeatureEnabled,
        getVariant,
        getExperimentConfig,
        trackEvent,
        loading,
        refresh,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

export function useFeatureFlag(flagKey: string): boolean {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(flagKey);
}

export function useExperiment(experimentName: string) {
  const { getVariant, getExperimentConfig, trackEvent } = useFeatureFlags();

  const variant = getVariant(experimentName);
  const config = getExperimentConfig(experimentName);

  const track = useCallback((eventType: string, eventName: string, eventData?: Record<string, any>) => {
    return trackEvent(experimentName, eventType, eventName, eventData);
  }, [experimentName, trackEvent]);

  return {
    variant,
    config,
    isVariantA: variant === 'A',
    isVariantB: variant === 'B',
    track,
  };
}
