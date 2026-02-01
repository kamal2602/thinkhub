import { supabase } from '../lib/supabase';

export interface ESGEvent {
  id: string;
  company_id: string;
  event_type: string;
  event_date: string;
  entity_type: string;
  entity_id: string;
  material_category_id?: string;
  weight_kg?: number;
  co2_saved_kg?: number;
  units_processed?: number;
  location_id?: string;
  party_id?: string;
  certification_number?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ESGMetrics {
  total_weight_kg: number;
  total_co2_saved_kg: number;
  total_units_processed: number;
  by_material_category: Record<string, number>;
  by_event_type: Record<string, number>;
  trend_data: {
    date: string;
    weight_kg: number;
    co2_saved_kg: number;
  }[];
}

export interface ComplianceExport {
  id: string;
  export_type: string;
  regulator_name: string;
  period_start: string;
  period_end: string;
  record_count: number;
  total_weight_kg: number;
  file_data: any;
}

class ESGReportingService {
  async getESGEvents(
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ESGEvent[]> {
    let query = supabase
      .from('esg_events')
      .select('*')
      .eq('company_id', companyId)
      .order('event_date', { ascending: false });

    if (startDate) {
      query = query.gte('event_date', startDate);
    }

    if (endDate) {
      query = query.lte('event_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getESGMetrics(
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ESGMetrics> {
    const events = await this.getESGEvents(companyId, startDate, endDate);

    const metrics: ESGMetrics = {
      total_weight_kg: 0,
      total_co2_saved_kg: 0,
      total_units_processed: 0,
      by_material_category: {},
      by_event_type: {},
      trend_data: []
    };

    events.forEach(event => {
      metrics.total_weight_kg += event.weight_kg || 0;
      metrics.total_co2_saved_kg += event.co2_saved_kg || 0;
      metrics.total_units_processed += event.units_processed || 0;

      if (event.event_type) {
        metrics.by_event_type[event.event_type] =
          (metrics.by_event_type[event.event_type] || 0) + (event.weight_kg || 0);
      }

      if (event.material_category_id) {
        metrics.by_material_category[event.material_category_id] =
          (metrics.by_material_category[event.material_category_id] || 0) + (event.weight_kg || 0);
      }
    });

    const trendMap = new Map<string, { weight_kg: number; co2_saved_kg: number }>();
    events.forEach(event => {
      const date = event.event_date.split('T')[0];
      const existing = trendMap.get(date) || { weight_kg: 0, co2_saved_kg: 0 };
      trendMap.set(date, {
        weight_kg: existing.weight_kg + (event.weight_kg || 0),
        co2_saved_kg: existing.co2_saved_kg + (event.co2_saved_kg || 0)
      });
    });

    metrics.trend_data = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return metrics;
  }

  async createESGEvent(event: Omit<ESGEvent, 'id' | 'created_at'>): Promise<ESGEvent> {
    const { data, error } = await supabase
      .from('esg_events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async exportGRI(companyId: string, startDate: string, endDate: string): Promise<any> {
    const events = await this.getESGEvents(companyId, startDate, endDate);
    const metrics = await this.getESGMetrics(companyId, startDate, endDate);

    return {
      standard: 'GRI',
      version: '2021',
      reporting_period: {
        start: startDate,
        end: endDate
      },
      metrics: {
        'GRI 306-3': {
          name: 'Waste generated',
          value: metrics.total_weight_kg,
          unit: 'kg'
        },
        'GRI 306-4': {
          name: 'Waste diverted from disposal',
          value: metrics.total_weight_kg,
          unit: 'kg'
        },
        'GRI 305-5': {
          name: 'Reduction of GHG emissions',
          value: metrics.total_co2_saved_kg,
          unit: 'kg CO2e'
        }
      },
      by_waste_type: metrics.by_event_type,
      events: events.map(e => ({
        date: e.event_date,
        type: e.event_type,
        weight_kg: e.weight_kg,
        co2_saved_kg: e.co2_saved_kg
      }))
    };
  }

  async exportWEEE(companyId: string, startDate: string, endDate: string): Promise<any> {
    const events = await this.getESGEvents(companyId, startDate, endDate);

    const weeeData = events
      .filter(e => e.event_type === 'recycled' || e.event_type === 'refurbished')
      .map(e => ({
        date: e.event_date,
        category: e.metadata?.weee_category || 'Category 3 - IT Equipment',
        weight_kg: e.weight_kg,
        treatment: e.event_type === 'refurbished' ? 'Reuse' : 'Recycling',
        certification: e.certification_number || ''
      }));

    return {
      standard: 'WEEE Directive',
      version: '2012/19/EU',
      reporting_period: {
        start: startDate,
        end: endDate
      },
      total_weight_kg: weeeData.reduce((sum, item) => sum + (item.weight_kg || 0), 0),
      items: weeeData,
      summary_by_category: weeeData.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + (item.weight_kg || 0);
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async exportCircularityIndex(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const events = await this.getESGEvents(companyId, startDate, endDate);

    const reused = events.filter(e => e.event_type === 'refurbished' || e.event_type === 'resold');
    const recycled = events.filter(e => e.event_type === 'recycled');
    const total = events.filter(e => e.event_type !== 'disposed');

    const totalWeight = total.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
    const reusedWeight = reused.reduce((sum, e) => sum + (e.weight_kg || 0), 0);
    const recycledWeight = recycled.reduce((sum, e) => sum + (e.weight_kg || 0), 0);

    const circularityIndex = totalWeight > 0
      ? ((reusedWeight + recycledWeight) / totalWeight) * 100
      : 0;

    return {
      reporting_period: {
        start: startDate,
        end: endDate
      },
      circularity_index: circularityIndex.toFixed(2),
      metrics: {
        total_weight_kg: totalWeight,
        reused_weight_kg: reusedWeight,
        recycled_weight_kg: recycledWeight,
        reuse_rate: totalWeight > 0 ? ((reusedWeight / totalWeight) * 100).toFixed(2) : 0,
        recycling_rate: totalWeight > 0 ? ((recycledWeight / totalWeight) * 100).toFixed(2) : 0
      },
      breakdown: {
        reused: reused.length,
        recycled: recycled.length,
        total_items: total.length
      }
    };
  }

  async generateComplianceExport(
    companyId: string,
    exportType: 'GRI' | 'WEEE' | 'EPR' | 'Circularity',
    startDate: string,
    endDate: string,
    regulatorName: string
  ): Promise<ComplianceExport> {
    let fileData: any;

    switch (exportType) {
      case 'GRI':
        fileData = await this.exportGRI(companyId, startDate, endDate);
        break;
      case 'WEEE':
        fileData = await this.exportWEEE(companyId, startDate, endDate);
        break;
      case 'Circularity':
        fileData = await this.exportCircularityIndex(companyId, startDate, endDate);
        break;
      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }

    const { data, error } = await supabase
      .from('regulator_exports')
      .insert({
        company_id: companyId,
        export_type: exportType,
        regulator_name: regulatorName,
        period_start: startDate,
        period_end: endDate,
        record_count: fileData.items?.length || fileData.events?.length || 0,
        total_weight_kg: fileData.total_weight_kg || fileData.metrics?.total_weight_kg || 0,
        status: 'completed',
        exported_at: new Date().toISOString(),
        metadata: fileData
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      export_type: exportType,
      regulator_name: regulatorName,
      period_start: startDate,
      period_end: endDate,
      record_count: data.record_count,
      total_weight_kg: data.total_weight_kg,
      file_data: fileData
    };
  }

  async getExportHistory(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('regulator_exports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const esgReportingService = new ESGReportingService();
