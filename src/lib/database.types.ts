export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';
export type MovementType = 'in' | 'out' | 'transfer' | 'adjustment';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type ReturnType = 'sales_return' | 'purchase_return';
export type RefundMethod = 'cash' | 'credit' | 'exchange';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'returned';
export type TrackingMode = 'serial' | 'quantity';

export type CustomerBusinessType = 'sales_customer' | 'itad_service_customer' | 'recycling_vendor';
export type SupplierBusinessType = 'purchase_vendor' | 'consignment_vendor';
export type ITADServiceType = 'full_itad' | 'data_destruction_only' | 'remarketing_only' | 'recycling_only' | 'asset_recovery';
export type ITADProjectStatus = 'pending' | 'intake_scheduled' | 'receiving' | 'in_progress' | 'sanitization' | 'testing' | 'disposition' | 'completed' | 'cancelled';
export type DataSanitizationMethod = 'software_wipe' | 'degauss' | 'physical_destruction' | 'crypto_erase' | 'secure_erase' | 'manual_wipe';
export type DataSanitizationStandard = 'NIST-800-88' | 'DOD-5220.22-M' | 'HMG-IS5' | 'CESG-CPA' | 'ISOIEC-27040' | 'custom';
export type DataSanitizationStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'not_applicable';
export type CertificateType = 'data_destruction' | 'recycling' | 'environmental_impact' | 'comprehensive' | 'chain_of_custody';
export type CertificateStatus = 'draft' | 'issued' | 'sent' | 'archived';

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      locations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          address?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          address?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_company_access: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      user_location_access: {
        Row: {
          id: string;
          user_id: string;
          location_id: string;
          can_view: boolean;
          can_edit: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_id: string;
          can_view?: boolean;
          can_edit?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_id?: string;
          can_view?: boolean;
          can_edit?: boolean;
          created_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          company_id: string;
          sku: string;
          name: string;
          description: string;
          unit_of_measure: string;
          reorder_level: number;
          created_at: string;
          updated_at: string;
          category_id: string | null;
          barcode: string;
          cost_price: number;
          selling_price: number;
          image_url: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          sku: string;
          name: string;
          description?: string;
          unit_of_measure?: string;
          reorder_level?: number;
          created_at?: string;
          updated_at?: string;
          category_id?: string | null;
          barcode?: string;
          cost_price?: number;
          selling_price?: number;
          image_url?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          sku?: string;
          name?: string;
          description?: string;
          unit_of_measure?: string;
          reorder_level?: number;
          created_at?: string;
          updated_at?: string;
          category_id?: string | null;
          barcode?: string;
          cost_price?: number;
          selling_price?: number;
          image_url?: string;
        };
      };
      stock_levels: {
        Row: {
          id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          location_id: string;
          quantity?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          location_id?: string;
          quantity?: number;
          updated_at?: string;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          item_id: string;
          location_id: string;
          movement_type: MovementType;
          quantity: number;
          reference_number: string;
          notes: string;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          location_id: string;
          movement_type: MovementType;
          quantity: number;
          reference_number?: string;
          notes?: string;
          performed_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          location_id?: string;
          movement_type?: MovementType;
          quantity?: number;
          reference_number?: string;
          notes?: string;
          performed_by?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          created_at: string;
          updated_at: string;
          is_super_admin: boolean;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          created_at?: string;
          updated_at?: string;
          is_super_admin?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          created_at?: string;
          updated_at?: string;
          is_super_admin?: boolean;
        };
      };
      categories: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          contact_person: string;
          phone: string;
          email: string;
          address: string;
          business_type: SupplierBusinessType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          contact_person?: string;
          phone?: string;
          email?: string;
          address?: string;
          business_type?: SupplierBusinessType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          contact_person?: string;
          phone?: string;
          email?: string;
          address?: string;
          business_type?: SupplierBusinessType;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          phone: string;
          email: string;
          address: string;
          business_type: CustomerBusinessType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          phone?: string;
          email?: string;
          address?: string;
          business_type?: CustomerBusinessType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
          business_type?: CustomerBusinessType;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchase_invoices: {
        Row: {
          id: string;
          company_id: string;
          supplier_id: string;
          invoice_number: string;
          invoice_date: string;
          total_amount: number;
          paid_amount: number;
          payment_status: PaymentStatus;
          notes: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          supplier_id: string;
          invoice_number: string;
          invoice_date?: string;
          total_amount?: number;
          paid_amount?: number;
          payment_status?: PaymentStatus;
          notes?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          supplier_id?: string;
          invoice_number?: string;
          invoice_date?: string;
          total_amount?: number;
          paid_amount?: number;
          payment_status?: PaymentStatus;
          notes?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      purchase_invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          item_id?: string;
          location_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
        };
      };
      sales_invoices: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_date: string;
          total_amount: number;
          paid_amount: number;
          payment_status: PaymentStatus;
          notes: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_date?: string;
          total_amount?: number;
          paid_amount?: number;
          payment_status?: PaymentStatus;
          notes?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          customer_id?: string;
          invoice_number?: string;
          invoice_date?: string;
          total_amount?: number;
          paid_amount?: number;
          payment_status?: PaymentStatus;
          notes?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      sales_invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          unit_price: number;
          cost_price: number;
          total_price: number;
          product_type_id: string | null;
          product_model: string | null;
          tracking_mode: TrackingMode;
          quantity_ordered: number;
          quantity_fulfilled: number;
          grade_id: string | null;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          unit_price: number;
          cost_price?: number;
          total_price: number;
          product_type_id?: string | null;
          product_model?: string | null;
          tracking_mode?: TrackingMode;
          quantity_ordered?: number;
          quantity_fulfilled?: number;
          grade_id?: string | null;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          item_id?: string;
          location_id?: string;
          quantity?: number;
          unit_price?: number;
          cost_price?: number;
          total_price?: number;
          product_type_id?: string | null;
          product_model?: string | null;
          tracking_mode?: TrackingMode;
          quantity_ordered?: number;
          quantity_fulfilled?: number;
          grade_id?: string | null;
        };
      };
      invoice_serial_assignments: {
        Row: {
          id: string;
          company_id: string;
          invoice_id: string;
          invoice_line_id: string;
          asset_id: string | null;
          component_id: string | null;
          serial_number: string;
          fulfillment_batch_number: number;
          delivery_note_id: string | null;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_id: string;
          invoice_line_id: string;
          asset_id?: string | null;
          component_id?: string | null;
          serial_number: string;
          fulfillment_batch_number?: number;
          delivery_note_id?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          invoice_id?: string;
          invoice_line_id?: string;
          asset_id?: string | null;
          component_id?: string | null;
          serial_number?: string;
          fulfillment_batch_number?: number;
          delivery_note_id?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
      };
      delivery_notes: {
        Row: {
          id: string;
          company_id: string;
          invoice_id: string;
          delivery_note_number: string;
          batch_number: number;
          customer_id: string | null;
          ship_date: string;
          tracking_number: string | null;
          carrier: string | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_id: string;
          delivery_note_number: string;
          batch_number: number;
          customer_id?: string | null;
          ship_date?: string;
          tracking_number?: string | null;
          carrier?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          invoice_id?: string;
          delivery_note_number?: string;
          batch_number?: number;
          customer_id?: string | null;
          ship_date?: string;
          tracking_number?: string | null;
          carrier?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
      returns: {
        Row: {
          id: string;
          company_id: string;
          return_type: ReturnType;
          invoice_id: string | null;
          reference_number: string;
          return_date: string;
          total_amount: number;
          refund_amount: number;
          refund_method: RefundMethod;
          reason: string;
          notes: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          return_type: ReturnType;
          invoice_id?: string | null;
          reference_number: string;
          return_date?: string;
          total_amount?: number;
          refund_amount?: number;
          refund_method?: RefundMethod;
          reason?: string;
          notes?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          return_type?: ReturnType;
          invoice_id?: string | null;
          reference_number?: string;
          return_date?: string;
          total_amount?: number;
          refund_amount?: number;
          refund_method?: RefundMethod;
          reason?: string;
          notes?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      return_items: {
        Row: {
          id: string;
          return_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          return_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          return_id?: string;
          item_id?: string;
          location_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
        };
      };
      repairs: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string | null;
          item_id: string;
          serial_number: string;
          issue_description: string;
          repair_status: RepairStatus;
          repair_cost: number;
          expected_completion: string | null;
          actual_completion: string | null;
          repair_notes: string;
          technician: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id?: string | null;
          item_id: string;
          serial_number?: string;
          issue_description: string;
          repair_status?: RepairStatus;
          repair_cost?: number;
          expected_completion?: string | null;
          actual_completion?: string | null;
          repair_notes?: string;
          technician?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          customer_id?: string | null;
          item_id?: string;
          serial_number?: string;
          issue_description?: string;
          repair_status?: RepairStatus;
          repair_cost?: number;
          expected_completion?: string | null;
          actual_completion?: string | null;
          repair_notes?: string;
          technician?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      itad_projects: {
        Row: {
          id: string;
          company_id: string;
          project_number: string;
          project_name: string | null;
          itad_customer_id: string;
          service_type: ITADServiceType;
          expected_quantity: number;
          actual_quantity: number;
          service_fee: number;
          service_fee_currency: string;
          revenue_share_percentage: number;
          revenue_share_threshold: number;
          data_sanitization_required: boolean;
          data_sanitization_standard: DataSanitizationStandard;
          environmental_reporting_required: boolean;
          r2_certified_required: boolean;
          certificate_required: boolean;
          certificate_generated: boolean;
          certificate_generated_at: string | null;
          certificate_file_path: string | null;
          status: ITADProjectStatus;
          started_at: string | null;
          completed_at: string | null;
          notes: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          project_number: string;
          project_name?: string | null;
          itad_customer_id: string;
          service_type?: ITADServiceType;
          expected_quantity?: number;
          actual_quantity?: number;
          service_fee?: number;
          service_fee_currency?: string;
          revenue_share_percentage?: number;
          revenue_share_threshold?: number;
          data_sanitization_required?: boolean;
          data_sanitization_standard?: DataSanitizationStandard;
          environmental_reporting_required?: boolean;
          r2_certified_required?: boolean;
          certificate_required?: boolean;
          certificate_generated?: boolean;
          certificate_generated_at?: string | null;
          certificate_file_path?: string | null;
          status?: ITADProjectStatus;
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          project_number?: string;
          project_name?: string | null;
          itad_customer_id?: string;
          service_type?: ITADServiceType;
          expected_quantity?: number;
          actual_quantity?: number;
          service_fee?: number;
          service_fee_currency?: string;
          revenue_share_percentage?: number;
          revenue_share_threshold?: number;
          data_sanitization_required?: boolean;
          data_sanitization_standard?: DataSanitizationStandard;
          environmental_reporting_required?: boolean;
          r2_certified_required?: boolean;
          certificate_required?: boolean;
          certificate_generated?: boolean;
          certificate_generated_at?: string | null;
          certificate_file_path?: string | null;
          status?: ITADProjectStatus;
          started_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      data_sanitization_records: {
        Row: {
          id: string;
          company_id: string;
          asset_id: string | null;
          itad_project_id: string | null;
          method: DataSanitizationMethod;
          standard: DataSanitizationStandard;
          software_used: string | null;
          software_version: string | null;
          passes_completed: number;
          verification_method: string | null;
          verified_by: string | null;
          verified_at: string | null;
          status: DataSanitizationStatus;
          result: string | null;
          failure_reason: string | null;
          certificate_number: string | null;
          certificate_issued_at: string | null;
          performed_by: string | null;
          performed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          asset_id?: string | null;
          itad_project_id?: string | null;
          method: DataSanitizationMethod;
          standard?: DataSanitizationStandard;
          software_used?: string | null;
          software_version?: string | null;
          passes_completed?: number;
          verification_method?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          status?: DataSanitizationStatus;
          result?: string | null;
          failure_reason?: string | null;
          certificate_number?: string | null;
          certificate_issued_at?: string | null;
          performed_by?: string | null;
          performed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          asset_id?: string | null;
          itad_project_id?: string | null;
          method?: DataSanitizationMethod;
          standard?: DataSanitizationStandard;
          software_used?: string | null;
          software_version?: string | null;
          passes_completed?: number;
          verification_method?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          status?: DataSanitizationStatus;
          result?: string | null;
          failure_reason?: string | null;
          certificate_number?: string | null;
          certificate_issued_at?: string | null;
          performed_by?: string | null;
          performed_at?: string;
          created_at?: string;
        };
      };
      itad_certificates: {
        Row: {
          id: string;
          company_id: string;
          certificate_number: string;
          certificate_type: CertificateType;
          itad_project_id: string | null;
          itad_customer_id: string;
          title: string;
          description: string | null;
          total_assets: number;
          total_weight_kg: number;
          co2_saved_kg: number;
          e_waste_diverted_kg: number;
          materials_recycled_kg: number;
          data_destruction_method: string | null;
          data_destruction_standard: string | null;
          assets_sanitized: number;
          pdf_file_path: string | null;
          pdf_generated_at: string | null;
          status: CertificateStatus;
          issued_at: string | null;
          issued_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          certificate_number: string;
          certificate_type: CertificateType;
          itad_project_id?: string | null;
          itad_customer_id: string;
          title: string;
          description?: string | null;
          total_assets?: number;
          total_weight_kg?: number;
          co2_saved_kg?: number;
          e_waste_diverted_kg?: number;
          materials_recycled_kg?: number;
          data_destruction_method?: string | null;
          data_destruction_standard?: string | null;
          assets_sanitized?: number;
          pdf_file_path?: string | null;
          pdf_generated_at?: string | null;
          status?: CertificateStatus;
          issued_at?: string | null;
          issued_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          certificate_number?: string;
          certificate_type?: CertificateType;
          itad_project_id?: string | null;
          itad_customer_id?: string;
          title?: string;
          description?: string | null;
          total_assets?: number;
          total_weight_kg?: number;
          co2_saved_kg?: number;
          e_waste_diverted_kg?: number;
          materials_recycled_kg?: number;
          data_destruction_method?: string | null;
          data_destruction_standard?: string | null;
          assets_sanitized?: number;
          pdf_file_path?: string | null;
          pdf_generated_at?: string | null;
          status?: CertificateStatus;
          issued_at?: string | null;
          issued_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_roles: UserRole;
    };
  };
}
