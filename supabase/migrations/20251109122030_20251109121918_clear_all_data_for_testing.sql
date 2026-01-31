/*
  # Clear All Data for Fresh Testing
  
  This migration clears all data from the database while preserving the schema.
  Use this to start testing from a clean slate.
  
  ## What Gets Cleared:
  
  1. All transactional data (invoices, POs, assets, components)
  2. All master data (products, customers, suppliers)
  3. All intelligence rules and mappings
  4. Keeps: Schema structure, RLS policies, functions, triggers
  
  ## IMPORTANT:
  - Run this ONLY in development/testing environments
  - All data will be permanently deleted
  - First user to sign up will become super admin
*/

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- Clear transactional data (order matters due to foreign keys)
TRUNCATE TABLE invoice_serial_assignments CASCADE;
TRUNCATE TABLE sales_invoice_items CASCADE;
TRUNCATE TABLE sales_invoices CASCADE;
TRUNCATE TABLE component_sales CASCADE;
TRUNCATE TABLE component_transactions CASCADE;
TRUNCATE TABLE harvested_components_inventory CASCADE;
TRUNCATE TABLE asset_components CASCADE;
TRUNCATE TABLE asset_refurbishment_costs CASCADE;
TRUNCATE TABLE asset_testing_results CASCADE;
TRUNCATE TABLE asset_history CASCADE;
TRUNCATE TABLE asset_internal_ids CASCADE;
TRUNCATE TABLE asset_photos CASCADE;
TRUNCATE TABLE processing_stage_history CASCADE;
TRUNCATE TABLE lot_assets CASCADE;
TRUNCATE TABLE assets CASCADE;
TRUNCATE TABLE expected_receiving_items CASCADE;
TRUNCATE TABLE receiving_discrepancies CASCADE;
TRUNCATE TABLE receiving_line_items CASCADE;
TRUNCATE TABLE receiving_logs CASCADE;
TRUNCATE TABLE purchase_invoice_items CASCADE;
TRUNCATE TABLE purchase_invoices CASCADE;
TRUNCATE TABLE purchase_order_lines CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE purchase_lots CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE stock_levels CASCADE;
TRUNCATE TABLE inventory_items CASCADE;
TRUNCATE TABLE delivery_notes CASCADE;
TRUNCATE TABLE return_items CASCADE;
TRUNCATE TABLE returns CASCADE;
TRUNCATE TABLE rma_requests CASCADE;
TRUNCATE TABLE repairs CASCADE;
TRUNCATE TABLE bulk_import_logs CASCADE;

-- Clear master data
TRUNCATE TABLE product_type_aliases CASCADE;
TRUNCATE TABLE model_aliases CASCADE;
TRUNCATE TABLE field_aliases CASCADE;
TRUNCATE TABLE product_types CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE cosmetic_grades CASCADE;
TRUNCATE TABLE functional_statuses CASCADE;
TRUNCATE TABLE asset_statuses CASCADE;
TRUNCATE TABLE warranty_types CASCADE;
TRUNCATE TABLE payment_terms CASCADE;
TRUNCATE TABLE return_reasons CASCADE;
TRUNCATE TABLE processing_stages CASCADE;
TRUNCATE TABLE component_market_prices CASCADE;
TRUNCATE TABLE test_result_options CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE specification_templates CASCADE;
TRUNCATE TABLE testing_checklist_templates CASCADE;
TRUNCATE TABLE invoice_templates CASCADE;

-- Clear intelligence and mappings
TRUNCATE TABLE import_intelligence_rules CASCADE;
TRUNCATE TABLE import_field_mappings CASCADE;
TRUNCATE TABLE supplier_column_mappings CASCADE;
TRUNCATE TABLE supplier_mapping_templates CASCADE;
TRUNCATE TABLE mapping_history CASCADE;
TRUNCATE TABLE field_dictionary CASCADE;

-- Clear accounting data
TRUNCATE TABLE journal_entry_lines CASCADE;
TRUNCATE TABLE journal_entries CASCADE;
TRUNCATE TABLE chart_of_accounts CASCADE;

-- Clear user data (keep profiles to avoid auth issues, but clear company associations)
UPDATE profiles SET is_super_admin = false;
TRUNCATE TABLE user_sidebar_preferences CASCADE;
TRUNCATE TABLE user_location_access CASCADE;
TRUNCATE TABLE user_company_access CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database cleared successfully. All data deleted. Schema and security intact.';
  RAISE NOTICE 'Next user to sign up will become super admin.';
END $$;
