import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type WasteCategory = Database['public']['Tables']['waste_categories']['Row'];
type RecoveryMethod = Database['public']['Tables']['recovery_methods']['Row'];
type ESGEvent = Database['public']['Tables']['esg_events']['Row'];

export interface ESGEventInput {
  source_type: 'asset' | 'component' | 'inventory_item' | 'purchase_lot';
  source_id: string;
  waste_category_id: string;
  weight_kg: number;
  recovery_method_id: string;
  downstream_vendor_type?: 'customer' | 'supplier' | 'other';
  downstream_vendor_id?: string;
  downstream_vendor_name?: string;
  certificate_id?: string;
  processing_location?: string;
  notes?: string;
  event_date?: string;
}

export interface ESGReport {
  period: {
    from: string;
    to: string;
  };
  summary: {
    total_weight_kg: number;
    total_carbon_kg: number;
    avg_circularity_score: number;
    total_events: number;
  };
  by_material: Array<{
    material_category: string;
    weight_kg: number;
    carbon_kg: number;
    event_count: number;
  }>;
  by_recovery_method: Array<{
    recovery_method: string;
    weight_kg: number;
    carbon_kg: number;
    event_count: number;
  }>;
  compliance_frameworks: string[];
}

export interface GRIReport {
  standard: 'GRI';
  version: string;
  reporting_period: {
    from: string;
    to: string;
  };
  waste_generated: {
    total_kg: number;
    hazardous_kg: number;
    non_hazardous_kg: number;
  };
  waste_diverted: {
    reuse_kg: number;
    recycling_kg: number;
    recovery_kg: number;
  };
  waste_disposed: {
    landfill_kg: number;
    incineration_kg: number;
  };
  carbon_footprint: {
    total_kg_co2e: number;
    scope_3_upstream: number;
    scope_3_downstream: number;
  };
}

export interface WEEEReport {
  directive: 'EU WEEE';
  reporting_period: {
    from: string;
    to: string;
  };
  categories: Array<{
    category_code: string;
    weight_collected_kg: number;
    weight_reused_kg: number;
    weight_recycled_kg: number;
    recovery_rate_pct: number;
  }>;
  total_recovery_rate_pct: number;
  compliant: boolean;
}

export const esgService = {
  async getWasteCategories(companyId: string): Promise<WasteCategory[]> {
    const { data, error } = await supabase
      .from('waste_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getRecoveryMethods(companyId: string): Promise<RecoveryMethod[]> {
    const { data, error } = await supabase
      .from('recovery_methods')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createESGEvent(companyId: string, event: ESGEventInput): Promise<ESGEvent> {
    const { data, error } = await supabase
      .from('esg_events')
      .insert({
        company_id: companyId,
        ...event,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getESGEvents(
    companyId: string,
    filters?: {
      from_date?: string;
      to_date?: string;
      source_type?: string;
      material_category?: string;
    }
  ): Promise<ESGEvent[]> {
    let query = supabase
      .from('esg_events')
      .select('*')
      .eq('company_id', companyId);

    if (filters?.from_date) {
      query = query.gte('event_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('event_date', filters.to_date);
    }
    if (filters?.source_type) {
      query = query.eq('source_type', filters.source_type);
    }
    if (filters?.material_category) {
      query = query.eq('material_category', filters.material_category);
    }

    const { data, error } = await query.order('event_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async generateESGReport(
    companyId: string,
    fromDate: string,
    toDate: string
  ): Promise<ESGReport> {
    const events = await this.getESGEvents(companyId, {
      from_date: fromDate,
      to_date: toDate,
    });

    const totalWeight = events.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
    const totalCarbon = events.reduce((sum, e) => sum + (e.carbon_estimate_kg || 0), 0);
    const avgCircularity = events.length > 0
      ? events.reduce((sum, e) => sum + (e.circularity_score || 0), 0) / events.length
      : 0;

    const byMaterial = events.reduce((acc, e) => {
      const key = e.material_category || 'Unknown';
      if (!acc[key]) {
        acc[key] = { material_category: key, weight_kg: 0, carbon_kg: 0, event_count: 0 };
      }
      acc[key].weight_kg += e.weight_kg || 0;
      acc[key].carbon_kg += e.carbon_estimate_kg || 0;
      acc[key].event_count += 1;
      return acc;
    }, {} as Record<string, any>);

    const byRecovery = events.reduce((acc, e) => {
      const key = e.recovery_method || 'Unknown';
      if (!acc[key]) {
        acc[key] = { recovery_method: key, weight_kg: 0, carbon_kg: 0, event_count: 0 };
      }
      acc[key].weight_kg += e.weight_kg || 0;
      acc[key].carbon_kg += e.carbon_estimate_kg || 0;
      acc[key].event_count += 1;
      return acc;
    }, {} as Record<string, any>);

    const complianceFrameworks = [...new Set(
      events.flatMap(e => e.complies_with || [])
    )];

    return {
      period: { from: fromDate, to: toDate },
      summary: {
        total_weight_kg: totalWeight,
        total_carbon_kg: totalCarbon,
        avg_circularity_score: avgCircularity,
        total_events: events.length,
      },
      by_material: Object.values(byMaterial),
      by_recovery_method: Object.values(byRecovery),
      compliance_frameworks: complianceFrameworks,
    };
  },

  async generateGRIReport(
    companyId: string,
    fromDate: string,
    toDate: string
  ): Promise<GRIReport> {
    const events = await this.getESGEvents(companyId, {
      from_date: fromDate,
      to_date: toDate,
    });

    const categories = await this.getWasteCategories(companyId);
    const methods = await this.getRecoveryMethods(companyId);

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const methodMap = new Map(methods.map(m => [m.id, m]));

    let hazardousWeight = 0;
    let nonHazardousWeight = 0;
    let reuseWeight = 0;
    let recyclingWeight = 0;
    let recoveryWeight = 0;
    let landfillWeight = 0;
    let incinerationWeight = 0;
    let totalCarbon = 0;

    events.forEach(e => {
      const category = categoryMap.get(e.waste_category_id || '');
      const method = methodMap.get(e.recovery_method_id || '');
      const weight = e.weight_kg || 0;

      if (category?.hazard_class === 'hazardous') {
        hazardousWeight += weight;
      } else {
        nonHazardousWeight += weight;
      }

      if (method?.method_type === 'reuse') {
        reuseWeight += weight;
      } else if (method?.method_type === 'recycle') {
        recyclingWeight += weight;
      } else if (method?.method_type === 'recovery') {
        recoveryWeight += weight;
      } else if (method?.method_type === 'landfill') {
        landfillWeight += weight;
      } else if (method?.method_type === 'incineration') {
        incinerationWeight += weight;
      }

      totalCarbon += e.carbon_estimate_kg || 0;
    });

    return {
      standard: 'GRI',
      version: 'GRI 306:2020',
      reporting_period: { from: fromDate, to: toDate },
      waste_generated: {
        total_kg: hazardousWeight + nonHazardousWeight,
        hazardous_kg: hazardousWeight,
        non_hazardous_kg: nonHazardousWeight,
      },
      waste_diverted: {
        reuse_kg: reuseWeight,
        recycling_kg: recyclingWeight,
        recovery_kg: recoveryWeight,
      },
      waste_disposed: {
        landfill_kg: landfillWeight,
        incineration_kg: incinerationWeight,
      },
      carbon_footprint: {
        total_kg_co2e: totalCarbon,
        scope_3_upstream: totalCarbon * 0.3,
        scope_3_downstream: totalCarbon * 0.7,
      },
    };
  },

  async generateWEEEReport(
    companyId: string,
    fromDate: string,
    toDate: string
  ): Promise<WEEEReport> {
    const events = await this.getESGEvents(companyId, {
      from_date: fromDate,
      to_date: toDate,
    });

    const categories = await this.getWasteCategories(companyId);
    const methods = await this.getRecoveryMethods(companyId);

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const methodMap = new Map(methods.map(m => [m.id, m]));

    const weeeCategories: Record<string, any> = {};

    events.forEach(e => {
      const category = categoryMap.get(e.waste_category_id || '');
      const method = methodMap.get(e.recovery_method_id || '');
      const weight = e.weight_kg || 0;

      if (category?.weee_category) {
        const code = category.weee_category;
        if (!weeeCategories[code]) {
          weeeCategories[code] = {
            category_code: code,
            weight_collected_kg: 0,
            weight_reused_kg: 0,
            weight_recycled_kg: 0,
            recovery_rate_pct: 0,
          };
        }

        weeeCategories[code].weight_collected_kg += weight;

        if (method?.method_type === 'reuse') {
          weeeCategories[code].weight_reused_kg += weight;
        } else if (method?.method_type === 'recycle' || method?.method_type === 'recovery') {
          weeeCategories[code].weight_recycled_kg += weight;
        }
      }
    });

    Object.values(weeeCategories).forEach((cat: any) => {
      const recovered = cat.weight_reused_kg + cat.weight_recycled_kg;
      cat.recovery_rate_pct = cat.weight_collected_kg > 0
        ? (recovered / cat.weight_collected_kg) * 100
        : 0;
    });

    const totalCollected = Object.values(weeeCategories).reduce(
      (sum: number, cat: any) => sum + cat.weight_collected_kg, 0
    );
    const totalRecovered = Object.values(weeeCategories).reduce(
      (sum: number, cat: any) => sum + cat.weight_reused_kg + cat.weight_recycled_kg, 0
    );
    const totalRecoveryRate = totalCollected > 0
      ? (totalRecovered / totalCollected) * 100
      : 0;

    const compliant = totalRecoveryRate >= 65;

    return {
      directive: 'EU WEEE',
      reporting_period: { from: fromDate, to: toDate },
      categories: Object.values(weeeCategories),
      total_recovery_rate_pct: totalRecoveryRate,
      compliant,
    };
  },

  async trackAssetRecycling(
    companyId: string,
    assetId: string,
    wasteCategoryId: string,
    weightKg: number,
    recoveryMethodId: string,
    options?: {
      certificateId?: string;
      downstreamVendorId?: string;
      downstreamVendorType?: 'customer' | 'supplier' | 'other';
      notes?: string;
    }
  ): Promise<ESGEvent> {
    return this.createESGEvent(companyId, {
      source_type: 'asset',
      source_id: assetId,
      waste_category_id: wasteCategoryId,
      weight_kg: weightKg,
      recovery_method_id: recoveryMethodId,
      certificate_id: options?.certificateId,
      downstream_vendor_id: options?.downstreamVendorId,
      downstream_vendor_type: options?.downstreamVendorType,
      notes: options?.notes,
    });
  },

  async trackComponentRecycling(
    companyId: string,
    componentId: string,
    wasteCategoryId: string,
    weightKg: number,
    recoveryMethodId: string
  ): Promise<ESGEvent> {
    return this.createESGEvent(companyId, {
      source_type: 'component',
      source_id: componentId,
      waste_category_id: wasteCategoryId,
      weight_kg: weightKg,
      recovery_method_id: recoveryMethodId,
    });
  },

  async getCircularityMetrics(companyId: string, fromDate: string, toDate: string) {
    const events = await this.getESGEvents(companyId, {
      from_date: fromDate,
      to_date: toDate,
    });

    const totalWeight = events.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
    const methods = await this.getRecoveryMethods(companyId);
    const methodMap = new Map(methods.map(m => [m.id, m]));

    let reuseWeight = 0;
    let recycleWeight = 0;
    let disposalWeight = 0;

    events.forEach(e => {
      const method = methodMap.get(e.recovery_method_id || '');
      const weight = e.weight_kg || 0;

      if (method?.method_type === 'reuse') {
        reuseWeight += weight;
      } else if (method?.method_type === 'recycle' || method?.method_type === 'recovery') {
        recycleWeight += weight;
      } else {
        disposalWeight += weight;
      }
    });

    const circularityIndex = totalWeight > 0
      ? ((reuseWeight * 1.0 + recycleWeight * 0.8) / totalWeight) * 100
      : 0;

    return {
      total_weight_kg: totalWeight,
      reuse_weight_kg: reuseWeight,
      recycle_weight_kg: recycleWeight,
      disposal_weight_kg: disposalWeight,
      reuse_rate_pct: totalWeight > 0 ? (reuseWeight / totalWeight) * 100 : 0,
      recycle_rate_pct: totalWeight > 0 ? (recycleWeight / totalWeight) * 100 : 0,
      disposal_rate_pct: totalWeight > 0 ? (disposalWeight / totalWeight) * 100 : 0,
      circularity_index: circularityIndex,
    };
  },
};
