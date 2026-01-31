/*
  # Clear Purchase Orders and Assets for Fresh Testing

  1. Purpose
    - Remove all purchase orders, assets, and related transactional data
    - Preserves: companies, users, product types, suppliers, settings
    - Resets sequences to start IDs from 1

  2. Tables Cleared (in dependency order)
    - Sales data (invoices, component sales)
    - Assets and components
    - Receiving logs and expected items
    - Purchase orders and lines
    - Purchase lots

  3. What is Preserved
    - User accounts and profiles
    - Companies and company access
    - Product types, suppliers, customers, locations
    - Processing stages, grades, cosmetic grades, warranty types
    - Import intelligence rules and field mappings
    - Model aliases and product type aliases

  4. Impact
    - Completely fresh start for testing PO imports
    - All IDs will start from beginning
    - Settings and master data remain intact
*/

DO $$
DECLARE
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
    'purchase_lots'
  ];
  tbl TEXT;
BEGIN
  -- Disable triggers temporarily for faster clearing
  SET session_replication_role = 'replica';

  -- Clear each table
  FOREACH tbl IN ARRAY tables_to_clear
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = tbl
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', tbl);
      RAISE NOTICE 'Cleared table: %', tbl;
    END IF;
  END LOOP;

  -- Re-enable triggers
  SET session_replication_role = 'origin';
  
  RAISE NOTICE 'Successfully cleared all POs, assets, and related data';
  RAISE NOTICE 'Master data (product types, suppliers, settings) preserved';
END $$;
