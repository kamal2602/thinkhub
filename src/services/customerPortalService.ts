import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type CustomerPortalPreferences = Database['public']['Tables']['customer_portal_preferences']['Row'];
type CustomerPortalAccessLog = Database['public']['Tables']['customer_portal_access_log']['Row'];

export interface PortalAccessLogEntry {
  customer_id: string;
  portal_user_id?: string;
  action: 'login' | 'logout' | 'view_dashboard' | 'view_asset' | 'view_assets_list' |
         'download_certificate' | 'view_esg_report' | 'view_revenue_report' |
         'search' | 'filter' | 'export_data' | 'api_call' | 'failed_login';
  resource_type?: 'asset' | 'certificate' | 'invoice' | 'esg_event' | 'revenue_settlement';
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  response_time_ms?: number;
  success?: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface CustomerAsset {
  id: string;
  internal_asset_id?: string;
  serial_number?: string;
  brand?: string;
  model?: string;
  product_type_id?: string;
  itad_project_id?: string;
  customer_id?: string;
  customer_name?: string;
  project_number?: string;
  project_name?: string;
  lot_number?: string;
  purchase_date?: string;
  created_at?: string;
}

export interface CustomerESGImpact {
  total_weight_kg: number;
  total_carbon_saved_kg: number;
  avg_circularity_score: number;
  materials_recovered: Array<{
    material: string;
    weight_kg: number;
  }>;
  recovery_methods: Array<{
    method: string;
    count: number;
  }>;
}

export interface CustomerCertificate {
  id: string;
  certificate_number?: string;
  certificate_type?: string;
  weight_processed_kg?: number;
  recovery_rate_pct?: number;
  file_path?: string;
  issued_date?: string;
  expiry_date?: string;
}

export const customerPortalService = {
  async getPreferences(customerId: string): Promise<CustomerPortalPreferences | null> {
    const { data, error } = await supabase
      .from('customer_portal_preferences')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updatePreferences(
    customerId: string,
    preferences: Partial<CustomerPortalPreferences>
  ): Promise<CustomerPortalPreferences> {
    const { data, error } = await supabase
      .from('customer_portal_preferences')
      .upsert({
        customer_id: customerId,
        ...preferences,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async logAccess(entry: PortalAccessLogEntry): Promise<void> {
    const { error } = await supabase
      .from('customer_portal_access_log')
      .insert(entry);

    if (error) throw error;
  },

  async getAccessLogs(
    customerId: string,
    options?: {
      limit?: number;
      action?: string;
      from_date?: string;
    }
  ): Promise<CustomerPortalAccessLog[]> {
    let query = supabase
      .from('customer_portal_access_log')
      .select('*')
      .eq('customer_id', customerId);

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.from_date) {
      query = query.gte('created_at', options.from_date);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(options?.limit || 100);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getCustomerAssets(
    customerId: string,
    options?: {
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ assets: any[]; total: number }> {
    const { data: assets, error: assetsError, count } = await supabase
      .from('assets')
      .select(`
        *,
        itad_projects!inner (
          id,
          project_number,
          project_name,
          itad_customer_id
        ),
        purchase_lots (
          lot_number,
          purchase_date
        )
      `, { count: 'exact' })
      .eq('itad_projects.itad_customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1);

    if (assetsError) throw assetsError;

    return {
      assets: assets || [],
      total: count || 0,
    };
  },

  async getCustomerAssetDetails(customerId: string, assetId: string): Promise<any> {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        itad_projects!inner (
          id,
          project_number,
          project_name,
          itad_customer_id
        ),
        purchase_lots (
          lot_number,
          purchase_date
        ),
        asset_history (
          id,
          field_changed,
          old_value,
          new_value,
          changed_at,
          changed_by
        )
      `)
      .eq('id', assetId)
      .eq('itad_projects.itad_customer_id', customerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Asset not found or access denied');

    return data;
  },

  async getCustomerESGImpact(
    customerId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<CustomerESGImpact> {
    let query = supabase
      .from('esg_events')
      .select(`
        *,
        assets!inner (
          id,
          itad_projects!inner (
            itad_customer_id
          )
        )
      `)
      .eq('assets.itad_projects.itad_customer_id', customerId);

    if (fromDate) {
      query = query.gte('event_date', fromDate);
    }
    if (toDate) {
      query = query.lte('event_date', toDate);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    const totalWeight = events?.reduce((sum, e) => sum + (e.weight_kg || 0), 0) || 0;
    const totalCarbon = events?.reduce((sum, e) => sum + (e.carbon_estimate_kg || 0), 0) || 0;
    const avgCircularity = events && events.length > 0
      ? events.reduce((sum, e) => sum + (e.circularity_score || 0), 0) / events.length
      : 0;

    const materialsMap: Record<string, number> = {};
    const methodsMap: Record<string, number> = {};

    events?.forEach(e => {
      if (e.material_category) {
        materialsMap[e.material_category] = (materialsMap[e.material_category] || 0) + (e.weight_kg || 0);
      }
      if (e.recovery_method) {
        methodsMap[e.recovery_method] = (methodsMap[e.recovery_method] || 0) + 1;
      }
    });

    return {
      total_weight_kg: totalWeight,
      total_carbon_saved_kg: totalCarbon,
      avg_circularity_score: avgCircularity,
      materials_recovered: Object.entries(materialsMap).map(([material, weight_kg]) => ({
        material,
        weight_kg,
      })),
      recovery_methods: Object.entries(methodsMap).map(([method, count]) => ({
        method,
        count,
      })),
    };
  },

  async getCustomerCertificates(customerId: string): Promise<CustomerCertificate[]> {
    const { data, error } = await supabase
      .from('recycling_certificates')
      .select(`
        *,
        itad_projects!inner (
          itad_customer_id
        )
      `)
      .eq('itad_projects.itad_customer_id', customerId)
      .order('issued_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCustomerRevenueShare(customerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('itad_revenue_settlements')
      .select(`
        *,
        itad_projects!inner (
          itad_customer_id,
          project_name,
          project_number
        )
      `)
      .eq('itad_projects.itad_customer_id', customerId)
      .order('settlement_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDashboardStats(customerId: string): Promise<{
    total_assets: number;
    processed_assets: number;
    total_weight_recycled_kg: number;
    total_certificates: number;
    total_revenue_share: number;
  }> {
    const [assetsResult, esgResult, certificatesResult, revenueResult] = await Promise.all([
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('itad_projects.itad_customer_id', customerId),

      supabase
        .from('esg_events')
        .select('weight_kg')
        .eq('assets.itad_projects.itad_customer_id', customerId),

      supabase
        .from('recycling_certificates')
        .select('id', { count: 'exact', head: true })
        .eq('itad_projects.itad_customer_id', customerId),

      supabase
        .from('itad_revenue_settlements')
        .select('amount_due')
        .eq('itad_projects.itad_customer_id', customerId),
    ]);

    const totalWeight = esgResult.data?.reduce((sum, e) => sum + (e.weight_kg || 0), 0) || 0;
    const totalRevenue = revenueResult.data?.reduce((sum, r) => sum + (r.amount_due || 0), 0) || 0;

    return {
      total_assets: assetsResult.count || 0,
      processed_assets: assetsResult.count || 0,
      total_weight_recycled_kg: totalWeight,
      total_certificates: certificatesResult.count || 0,
      total_revenue_share: totalRevenue,
    };
  },

  async downloadCertificate(customerId: string, certificateId: string): Promise<{ url: string }> {
    const { data: cert, error: certError } = await supabase
      .from('recycling_certificates')
      .select(`
        file_path,
        itad_projects!inner (
          itad_customer_id
        )
      `)
      .eq('id', certificateId)
      .eq('itad_projects.itad_customer_id', customerId)
      .maybeSingle();

    if (certError) throw certError;
    if (!cert || !cert.file_path) throw new Error('Certificate not found or access denied');

    await this.logAccess({
      customer_id: customerId,
      action: 'download_certificate',
      resource_type: 'certificate',
      resource_id: certificateId,
    });

    const { data: signedUrl } = await supabase.storage
      .from('certificates')
      .createSignedUrl(cert.file_path, 3600);

    if (!signedUrl) throw new Error('Failed to generate download URL');

    return { url: signedUrl.signedUrl };
  },
};
