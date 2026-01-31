/*
  # Clear All Data for Fresh Start

  1. Purpose
    - Remove ALL company-specific data
    - Remove ALL transaction data
    - Keep schema intact (tables, columns, functions)
    - Reset to fresh install state
    - Allow first user to set up company

  2. Data Removed
    - All profiles (users will need to register again)
    - All companies
    - All transactional data
    - All master data
    - All configuration data

  3. Schema Preserved
    - All tables remain
    - All columns remain
    - All functions remain
    - All RLS policies remain
    - System ready for first-time setup

  4. First-Time Setup Flow
    - User registers → First user detected → Company creation field shown
    - Company created → User set as super admin
    - User logs in → Can set up master data
*/

-- Disable RLS temporarily to allow deletion
SET session_replication_role = replica;

-- Delete all data in reverse dependency order

-- Transaction and history data
TRUNCATE TABLE asset_history CASCADE;
TRUNCATE TABLE asset_components CASCADE;
TRUNCATE TABLE asset_photos CASCADE;
TRUNCATE TABLE asset_refurbishment_costs CASCADE;
TRUNCATE TABLE asset_testing_results CASCADE;
TRUNCATE TABLE assets CASCADE;
TRUNCATE TABLE expected_receiving_items CASCADE;
TRUNCATE TABLE purchase_order_lines CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE sales_invoice_items CASCADE;
TRUNCATE TABLE sales_invoices CASCADE;
TRUNCATE TABLE invoice_serial_assignments CASCADE;
TRUNCATE TABLE lot_assets CASCADE;
TRUNCATE TABLE purchase_lots CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE return_items CASCADE;
TRUNCATE TABLE returns CASCADE;
TRUNCATE TABLE repairs CASCADE;
TRUNCATE TABLE receiving_logs CASCADE;
TRUNCATE TABLE receiving_line_items CASCADE;
TRUNCATE TABLE receiving_discrepancies CASCADE;
TRUNCATE TABLE component_sales CASCADE;
TRUNCATE TABLE component_transactions CASCADE;
TRUNCATE TABLE harvested_components_inventory CASCADE;
TRUNCATE TABLE rma_requests CASCADE;
TRUNCATE TABLE delivery_notes CASCADE;
TRUNCATE TABLE purchase_invoice_items CASCADE;
TRUNCATE TABLE purchase_invoices CASCADE;
TRUNCATE TABLE journal_entry_lines CASCADE;
TRUNCATE TABLE journal_entries CASCADE;

-- Logs and bulk operations
TRUNCATE TABLE bulk_import_logs CASCADE;
TRUNCATE TABLE mapping_history CASCADE;
TRUNCATE TABLE processing_stage_history CASCADE;

-- Configuration and mappings
TRUNCATE TABLE import_intelligence_rules CASCADE;
TRUNCATE TABLE import_field_mappings CASCADE;
TRUNCATE TABLE product_type_aliases CASCADE;
TRUNCATE TABLE field_aliases CASCADE;
TRUNCATE TABLE model_aliases CASCADE;
TRUNCATE TABLE supplier_column_mappings CASCADE;
TRUNCATE TABLE supplier_mapping_templates CASCADE;
TRUNCATE TABLE component_market_prices CASCADE;
TRUNCATE TABLE test_result_options CASCADE;
TRUNCATE TABLE field_dictionary CASCADE;

-- Master data templates and checklists
TRUNCATE TABLE testing_checklist_templates CASCADE;
TRUNCATE TABLE specification_templates CASCADE;
TRUNCATE TABLE invoice_templates CASCADE;

-- Master data
TRUNCATE TABLE processing_stages CASCADE;
TRUNCATE TABLE warranty_types CASCADE;
TRUNCATE TABLE return_reasons CASCADE;
TRUNCATE TABLE payment_terms CASCADE;
TRUNCATE TABLE functional_statuses CASCADE;
TRUNCATE TABLE cosmetic_grades CASCADE;
TRUNCATE TABLE product_types CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE chart_of_accounts CASCADE;
TRUNCATE TABLE asset_statuses CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE stock_levels CASCADE;
TRUNCATE TABLE inventory_items CASCADE;

-- User access and preferences
TRUNCATE TABLE user_sidebar_preferences CASCADE;
TRUNCATE TABLE user_location_access CASCADE;
TRUNCATE TABLE user_company_access CASCADE;

-- Companies and profiles (last, as they have FKs to everything)
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Re-enable RLS
SET session_replication_role = DEFAULT;
