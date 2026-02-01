import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AIValuationModel = Database['public']['Tables']['ai_valuation_models']['Row'];
type ValuationRule = Database['public']['Tables']['valuation_rules']['Row'];

export interface ValuationRequest {
  target_type: 'asset' | 'inventory_item' | 'component';
  target_id: string;
  brand?: string;
  model?: string;
  product_type?: string;
  condition_grade?: string;
  age_months?: number;
}

export interface ValuationResult {
  predicted_resale_value: number;
  predicted_auction_value: number;
  predicted_scrap_value: number;
  predicted_component_harvest_value: number;
  recommended_channel: 'direct_sale' | 'auction' | 'component_harvest' | 'scrap' | 'donate' | 'dispose';
  recommendation_reason: string;
  confidence_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  features_used: Record<string, any>;
  prediction_factors: any[];
}

export const aiValuationService = {
  async generateValuation(
    companyId: string,
    request: ValuationRequest
  ): Promise<AIValuationModel> {
    const valuation = await this.calculateValuation(companyId, request);

    const { data, error } = await supabase
      .from('ai_valuation_models')
      .insert({
        company_id: companyId,
        target_type: request.target_type,
        target_id: request.target_id,
        brand: request.brand,
        model: request.model,
        product_type: request.product_type,
        condition_grade: request.condition_grade,
        age_months: request.age_months,
        ...valuation,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async calculateValuation(
    companyId: string,
    request: ValuationRequest
  ): Promise<ValuationResult> {
    const [historicalData, rules, componentValue, scrapValue] = await Promise.all([
      this.getHistoricalPricing(companyId, request),
      this.getApplicableRules(companyId, request),
      this.estimateComponentHarvestValue(companyId, request),
      this.estimateScrapValue(companyId, request),
    ]);

    let baseResaleValue = historicalData.avg_resale || 100;
    let baseAuctionValue = historicalData.avg_auction || baseResaleValue * 0.85;

    const factors: any[] = [{
      factor: 'Historical Average',
      resale: baseResaleValue,
      auction: baseAuctionValue,
    }];

    rules.forEach(rule => {
      const multiplier = rule.multiplier || 1.0;
      const fixedAmount = rule.fixed_amount || 0;

      if (rule.rule_type === 'brand_multiplier') {
        baseResaleValue *= multiplier;
        baseAuctionValue *= multiplier;
        factors.push({
          factor: `Brand Multiplier (${rule.rule_name})`,
          multiplier,
          applied_to: 'both',
        });
      } else if (rule.rule_type === 'condition_adjustment') {
        baseResaleValue *= multiplier;
        baseAuctionValue *= multiplier;
        factors.push({
          factor: `Condition Adjustment (${rule.rule_name})`,
          multiplier,
          applied_to: 'both',
        });
      } else if (rule.rule_type === 'age_depreciation') {
        const ageMonths = request.age_months || 0;
        const depreciationFactor = Math.max(0.2, 1 - (ageMonths * 0.02));
        baseResaleValue *= depreciationFactor;
        baseAuctionValue *= depreciationFactor;
        factors.push({
          factor: 'Age Depreciation',
          age_months: ageMonths,
          multiplier: depreciationFactor,
          applied_to: 'both',
        });
      } else if (rule.rule_type === 'minimum_price') {
        baseResaleValue = Math.max(baseResaleValue, fixedAmount);
        baseAuctionValue = Math.max(baseAuctionValue, fixedAmount);
        factors.push({
          factor: 'Minimum Price Floor',
          minimum: fixedAmount,
        });
      }
    });

    const preferredChannelRule = rules.find(r => r.rule_type === 'channel_preference');

    let recommendedChannel: ValuationResult['recommended_channel'] = 'direct_sale';
    let recommendationReason = 'Default recommendation based on resale value';
    let confidence = 0.5;

    if (preferredChannelRule?.preferred_channel) {
      recommendedChannel = preferredChannelRule.preferred_channel as any;
      recommendationReason = `Business rule: ${preferredChannelRule.rule_name}`;
      confidence = 0.8;
    } else if (baseResaleValue > baseAuctionValue * 1.2) {
      recommendedChannel = 'direct_sale';
      recommendationReason = 'Resale value significantly higher than auction value';
      confidence = 0.75;
    } else if (componentValue > baseResaleValue * 0.8) {
      recommendedChannel = 'component_harvest';
      recommendationReason = 'Component harvest value exceeds resale value';
      confidence = 0.7;
    } else if (baseResaleValue < 50) {
      recommendedChannel = 'scrap';
      recommendationReason = 'Low resale value, better suited for scrap';
      confidence = 0.65;
    } else if (historicalData.auction_count > historicalData.resale_count) {
      recommendedChannel = 'auction';
      recommendationReason = 'Historical data shows strong auction performance';
      confidence = 0.7;
    }

    if (historicalData.sample_size < 5) {
      confidence *= 0.6;
    } else if (historicalData.sample_size < 20) {
      confidence *= 0.8;
    }

    return {
      predicted_resale_value: Math.round(baseResaleValue * 100) / 100,
      predicted_auction_value: Math.round(baseAuctionValue * 100) / 100,
      predicted_scrap_value: Math.round(scrapValue * 100) / 100,
      predicted_component_harvest_value: Math.round(componentValue * 100) / 100,
      recommended_channel: recommendedChannel,
      recommendation_reason: recommendationReason,
      confidence_score: Math.min(1, confidence),
      confidence_level: confidence >= 0.85 ? 'high' : confidence >= 0.6 ? 'medium' : 'low',
      features_used: {
        brand: request.brand,
        model: request.model,
        condition: request.condition_grade,
        age_months: request.age_months,
        historical_samples: historicalData.sample_size,
      },
      prediction_factors: factors,
    };
  },

  async getHistoricalPricing(
    companyId: string,
    request: ValuationRequest
  ): Promise<{
    avg_resale: number;
    avg_auction: number;
    resale_count: number;
    auction_count: number;
    sample_size: number;
  }> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: salesData } = await supabase
      .from('sales_invoice_items')
      .select(`
        unit_price,
        sales_invoices!inner(invoice_date, company_id)
      `)
      .eq('sales_invoices.company_id', companyId)
      .gte('sales_invoices.invoice_date', sixMonthsAgo.toISOString())
      .eq('brand', request.brand || '')
      .eq('model', request.model || '');

    const resalePrices = salesData?.map(item => item.unit_price || 0) || [];
    const avgResale = resalePrices.length > 0
      ? resalePrices.reduce((sum, p) => sum + p, 0) / resalePrices.length
      : 0;

    const { data: auctionData } = await supabase
      .from('bids')
      .select(`
        amount,
        auction_lots!inner(company_id, status)
      `)
      .eq('auction_lots.company_id', companyId)
      .eq('auction_lots.status', 'sold')
      .eq('is_winning_bid', true);

    const auctionPrices = auctionData?.map(bid => bid.amount || 0) || [];
    const avgAuction = auctionPrices.length > 0
      ? auctionPrices.reduce((sum, p) => sum + p, 0) / auctionPrices.length
      : 0;

    return {
      avg_resale: avgResale,
      avg_auction: avgAuction,
      resale_count: resalePrices.length,
      auction_count: auctionPrices.length,
      sample_size: resalePrices.length + auctionPrices.length,
    };
  },

  async getApplicableRules(
    companyId: string,
    request: ValuationRequest
  ): Promise<ValuationRule[]> {
    const { data: allRules, error } = await supabase
      .from('valuation_rules')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;

    const applicableRules = (allRules || []).filter(rule => {
      if (rule.applies_to_brands && rule.applies_to_brands.length > 0) {
        if (!request.brand || !rule.applies_to_brands.includes(request.brand)) {
          return false;
        }
      }

      if (rule.applies_to_models && rule.applies_to_models.length > 0) {
        if (!request.model || !rule.applies_to_models.includes(request.model)) {
          return false;
        }
      }

      if (rule.applies_to_product_types && rule.applies_to_product_types.length > 0) {
        if (!request.product_type || !rule.applies_to_product_types.includes(request.product_type)) {
          return false;
        }
      }

      if (rule.applies_to_conditions && rule.applies_to_conditions.length > 0) {
        if (!request.condition_grade || !rule.applies_to_conditions.includes(request.condition_grade)) {
          return false;
        }
      }

      return true;
    });

    return applicableRules;
  },

  async estimateComponentHarvestValue(
    companyId: string,
    request: ValuationRequest
  ): Promise<number> {
    const { data: componentPrices } = await supabase
      .from('component_market_prices')
      .select('avg_price_usd')
      .eq('company_id', companyId);

    if (!componentPrices || componentPrices.length === 0) {
      return 20;
    }

    const avgComponentValue = componentPrices.reduce(
      (sum, p) => sum + (p.avg_price_usd || 0), 0
    ) / componentPrices.length;

    return avgComponentValue * 3;
  },

  async estimateScrapValue(
    companyId: string,
    request: ValuationRequest
  ): Promise<number> {
    return 10;
  },

  async getValuation(valuationId: string): Promise<AIValuationModel | null> {
    const { data, error } = await supabase
      .from('ai_valuation_models')
      .select('*')
      .eq('id', valuationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getValuationsForTarget(
    targetType: string,
    targetId: string
  ): Promise<AIValuationModel[]> {
    const { data, error } = await supabase
      .from('ai_valuation_models')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async recordActualOutcome(
    valuationId: string,
    actualChannel: string,
    actualValue: number,
    actualDate: string
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_valuation_models')
      .update({
        actual_sale_channel: actualChannel,
        actual_sale_value: actualValue,
        actual_sale_date: actualDate,
      })
      .eq('id', valuationId);

    if (error) throw error;
  },

  async overrideValuation(
    valuationId: string,
    overrideReason: string
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_valuation_models')
      .update({
        overridden: true,
        override_reason: overrideReason,
        overridden_at: new Date().toISOString(),
      })
      .eq('id', valuationId);

    if (error) throw error;
  },

  async getModelPerformance(companyId: string): Promise<any> {
    const { data: valuations } = await supabase
      .from('ai_valuation_models')
      .select('*')
      .eq('company_id', companyId)
      .not('actual_sale_value', 'is', null);

    if (!valuations || valuations.length === 0) {
      return {
        total_predictions: 0,
        validated_predictions: 0,
        mae: 0,
        accuracy_by_confidence: {},
      };
    }

    const errors = valuations.map(v => v.prediction_error || 0);
    const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;

    const byConfidence: Record<string, { correct: number; total: number }> = {
      high: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      low: { correct: 0, total: 0 },
    };

    valuations.forEach(v => {
      const level = v.confidence_level || 'medium';
      byConfidence[level].total += 1;

      if (v.recommended_channel === v.actual_sale_channel) {
        byConfidence[level].correct += 1;
      }
    });

    const accuracyByConfidence: Record<string, number> = {};
    Object.entries(byConfidence).forEach(([level, stats]) => {
      accuracyByConfidence[level] = stats.total > 0
        ? stats.correct / stats.total
        : 0;
    });

    return {
      total_predictions: valuations.length,
      validated_predictions: valuations.length,
      mae,
      accuracy_by_confidence: accuracyByConfidence,
    };
  },

  async createRule(companyId: string, rule: Partial<ValuationRule>): Promise<ValuationRule> {
    const { data, error } = await supabase
      .from('valuation_rules')
      .insert({
        company_id: companyId,
        ...rule,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRules(companyId: string): Promise<ValuationRule[]> {
    const { data, error } = await supabase
      .from('valuation_rules')
      .select('*')
      .eq('company_id', companyId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateRule(ruleId: string, updates: Partial<ValuationRule>): Promise<ValuationRule> {
    const { data, error } = await supabase
      .from('valuation_rules')
      .update(updates)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('valuation_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
  },
};
