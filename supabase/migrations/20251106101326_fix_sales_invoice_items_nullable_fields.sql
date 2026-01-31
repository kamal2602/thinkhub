/*
  # Fix Sales Invoice Items Nullable Fields

  ## Overview
  The sales_invoice_items table has legacy fields (item_id, location_id, quantity) 
  that are NOT NULL, but the new unified sales system uses different fields 
  (product_type_id, product_model, quantity_ordered). This migration makes the 
  legacy fields nullable to support the new system.

  ## Changes
  1. Make item_id nullable
  2. Make location_id nullable  
  3. Make quantity nullable (use quantity_ordered instead)

  ## Security
  No RLS changes needed - existing policies remain in place
*/

-- Make legacy fields nullable to support new unified sales system
ALTER TABLE sales_invoice_items 
  ALTER COLUMN item_id DROP NOT NULL,
  ALTER COLUMN location_id DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL;

-- Set default values for legacy fields
ALTER TABLE sales_invoice_items
  ALTER COLUMN quantity SET DEFAULT 0;

COMMENT ON COLUMN sales_invoice_items.item_id IS 
  'Legacy field - use product_type_id for new sales system';

COMMENT ON COLUMN sales_invoice_items.location_id IS 
  'Legacy field - location tracking moved to fulfillment system';

COMMENT ON COLUMN sales_invoice_items.quantity IS 
  'Legacy field - use quantity_ordered for new sales system';
