import { supabase } from '../lib/supabase';

export interface FeatureFlag {
  id: string;
  company_id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rollout_percentage: number;
  target_user_roles?: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ABExperiment {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  feature_flag_id?: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variant_a_name: string;
  variant_b_name: string;
  variant_a_config: Record<string, any>;
  variant_b_config: Record<string, any>;
  traffic_split: number;
  target_metric?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface UserVariantAssignment {
  id: string;
  experiment_id: string;
  user_id: string;
  variant: 'A' | 'B';
  assigned_at: string;
}

export interface ExperimentEvent {
  experiment_id: string;
  variant: 'A' | 'B';
  event_type: string;
  event_name: string;
  event_data?: Record<string, any>;
}

class FeatureFlagService {
  async getFeatureFlags(companyId: string): Promise<FeatureFlag[]> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getFeatureFlag(companyId: string, key: string): Promise<FeatureFlag | null> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('company_id', companyId)
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlag> {
    const { data, error } = await supabase
      .from('feature_flags')
      .insert(flag)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const { data, error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async isFeatureEnabled(
    companyId: string,
    flagKey: string,
    userId?: string,
    userRole?: string
  ): Promise<boolean> {
    const flag = await this.getFeatureFlag(companyId, flagKey);

    if (!flag || !flag.enabled) {
      return false;
    }

    if (flag.target_user_roles && flag.target_user_roles.length > 0 && userRole) {
      if (!flag.target_user_roles.includes(userRole)) {
        return false;
      }
    }

    if (flag.rollout_percentage === 100) {
      return true;
    }

    if (flag.rollout_percentage === 0) {
      return false;
    }

    if (userId) {
      const hash = await this.hashUserId(userId, flagKey);
      return hash < flag.rollout_percentage;
    }

    return false;
  }

  private async hashUserId(userId: string, flagKey: string): Promise<number> {
    const str = `${userId}:${flagKey}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }

  async getExperiments(companyId: string): Promise<ABExperiment[]> {
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getRunningExperiments(companyId: string): Promise<ABExperiment[]> {
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'running')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createExperiment(experiment: Omit<ABExperiment, 'id' | 'created_at'>): Promise<ABExperiment> {
    const { data, error } = await supabase
      .from('ab_experiments')
      .insert(experiment)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateExperiment(id: string, updates: Partial<ABExperiment>): Promise<ABExperiment> {
    const { data, error } = await supabase
      .from('ab_experiments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async startExperiment(id: string): Promise<ABExperiment> {
    return this.updateExperiment(id, {
      status: 'running',
      started_at: new Date().toISOString(),
    });
  }

  async pauseExperiment(id: string): Promise<ABExperiment> {
    return this.updateExperiment(id, { status: 'paused' });
  }

  async completeExperiment(id: string): Promise<ABExperiment> {
    return this.updateExperiment(id, {
      status: 'completed',
      ended_at: new Date().toISOString(),
    });
  }

  async getUserVariant(experimentId: string, userId: string): Promise<'A' | 'B'> {
    const { data, error } = await supabase
      .from('user_variant_assignments')
      .select('variant')
      .eq('experiment_id', experimentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return data.variant;
    }

    const { data: experiment } = await supabase
      .from('ab_experiments')
      .select('traffic_split')
      .eq('id', experimentId)
      .single();

    const hash = await this.hashUserId(userId, experimentId);
    const variant: 'A' | 'B' = hash < (experiment?.traffic_split || 50) ? 'B' : 'A';

    await supabase
      .from('user_variant_assignments')
      .insert({
        experiment_id: experimentId,
        user_id: userId,
        variant,
      });

    return variant;
  }

  async trackEvent(event: ExperimentEvent & { user_id: string }): Promise<void> {
    const { error } = await supabase
      .from('experiment_events')
      .insert(event);

    if (error) throw error;
  }

  async getExperimentStats(experimentId: string) {
    const { data: events, error } = await supabase
      .from('experiment_events')
      .select('variant, event_type, event_name')
      .eq('experiment_id', experimentId);

    if (error) throw error;

    const variantA = events?.filter(e => e.variant === 'A') || [];
    const variantB = events?.filter(e => e.variant === 'B') || [];

    const uniqueUsersA = new Set(variantA.map((e: any) => e.user_id)).size;
    const uniqueUsersB = new Set(variantB.map((e: any) => e.user_id)).size;

    const conversionsA = variantA.filter(e => e.event_type === 'conversion').length;
    const conversionsB = variantB.filter(e => e.event_type === 'conversion').length;

    return {
      variantA: {
        users: uniqueUsersA,
        events: variantA.length,
        conversions: conversionsA,
        conversionRate: uniqueUsersA > 0 ? (conversionsA / uniqueUsersA) * 100 : 0,
      },
      variantB: {
        users: uniqueUsersB,
        events: variantB.length,
        conversions: conversionsB,
        conversionRate: uniqueUsersB > 0 ? (conversionsB / uniqueUsersB) * 100 : 0,
      },
    };
  }
}

export const featureFlagService = new FeatureFlagService();
