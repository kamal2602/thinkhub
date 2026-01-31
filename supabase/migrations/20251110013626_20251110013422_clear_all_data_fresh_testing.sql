/*
  # Clear All Data for Fresh Testing

  1. Purpose
    - Remove all data from all tables to start fresh testing
    - Preserves table structure and system configuration
    - Does NOT delete: users, profiles, companies, or user-company relationships

  2. Tables Cleared (in order to respect foreign keys)
    - Components and sales data
    - Assets and related data
    - Purchase orders and receiving
    - Master data (products, suppliers, etc.)
    - Import intelligence and mappings

  3. Important Notes
    - User accounts and company memberships are preserved
    - Processing stages, grades, and system settings are cleared
    - All transactional data is removed
*/

-- Function to safely truncate tables
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_clear TEXT[] := ARRAY[
    'sales_invoice_items',
    'sales_invoices',
    'component_sales',
    'asset_components',
    'asset_history',
    'asset_testing_results',
    'assets',
    'receiving_logs',
    'expected_receiving_items',
    'purchase_order_lines',
    'purchase_orders',
    'purchase_lots',
    'product_types',
    'suppliers',
    'customers',
    'locations',
    'brands',
    'model_aliases',
    'processing_stages',
    'cosmetic_grades',
    'functional_statuses',
    'warranty_types',
    'payment_terms',
    'return_reasons',
    'testing_checklist_templates',
    'test_result_options',
    'component_market_prices',
    'import_field_mappings',
    'product_type_aliases'
  ];
BEGIN
  -- Disable triggers temporarily
  SET session_replication_role = 'replica';

  -- Truncate each table if it exists
  FOREACH tbl_name IN ARRAY tables_to_clear
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
      EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl_name);
      RAISE NOTICE 'Cleared table: %', tbl_name;
    END IF;
  END LOOP;

  -- Re-enable triggers
  SET session_replication_role = 'origin';
END $$;
