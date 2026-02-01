/*
  # Extend Core Tables for Engine Architecture

  This migration extends core tables with optional fields to support
  multiple business engines without breaking existing functionality.

  ## Changes
  1. Add business_source to assets
  2. Add ownership_type to assets
  3. Add project_id to assets
  4. Add entity_type to customers and suppliers
  5. Add order_type to purchase_orders and sales_invoices
  6. Add sales_channel to sales_invoices

  ## Backward Compatibility
  - All new columns have default values
  - Existing queries continue to work
  - No breaking changes
*/

-- Add business source tracking to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS business_source text DEFAULT 'purchase';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'owned';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS project_id uuid;

-- Add entity type classification to parties
ALTER TABLE customers ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'sales_customer';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'purchase_vendor';

-- Add order type classification
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'purchase';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'direct_sale';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS sales_channel text DEFAULT 'direct';

-- Add material breakdown for recycling tracking
ALTER TABLE assets ADD COLUMN IF NOT EXISTS material_breakdown jsonb;

-- Add comments for documentation
COMMENT ON COLUMN assets.business_source IS 'Source of asset: purchase, itad_intake, consignment, return, transfer';
COMMENT ON COLUMN assets.ownership_type IS 'Ownership type: owned, consignment, customer_owned';
COMMENT ON COLUMN assets.project_id IS 'Generic reference to ITAD projects, consignment agreements, etc';
COMMENT ON COLUMN assets.material_breakdown IS 'Material weight breakdown for recycling: {plastic_kg, metal_kg, glass_kg, pcb_kg, battery_kg, other_kg}';

COMMENT ON COLUMN customers.entity_type IS 'Entity classification: sales_customer, itad_client, prospect';
COMMENT ON COLUMN suppliers.entity_type IS 'Entity classification: purchase_vendor, consignment_vendor';

COMMENT ON COLUMN purchase_orders.order_type IS 'Order type: purchase, consignment, transfer_in';
COMMENT ON COLUMN sales_invoices.order_type IS 'Order type: direct_sale, auction_settlement, component_sale, wholesale';
COMMENT ON COLUMN sales_invoices.sales_channel IS 'Sales channel: direct, auction, website, marketplace';